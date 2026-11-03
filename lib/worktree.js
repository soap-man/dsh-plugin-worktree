/**
 * Pure git-worktree helpers for dsh-plugin-worktree.
 *
 * This module deliberately keeps dsh/Cordis imports out so the mechanics can be
 * unit-tested against a real git repository without booting a Cordis tree.
 */
import { execFile } from "node:child_process";
import { readFile, rmdir, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

/** Default directory under the repository root that holds worktrees. */
export const DEFAULT_WORKTREES_DIR = ".dsh/worktrees";

/** Worktree name grammar: relative, slash-separated, one or more safe segments. */
const WORKTREE_NAME_PATTERN = /^[A-Za-z0-9._-]+(?:\/[A-Za-z0-9._-]+)*$/;

/** Upper bound for the full name (mirrors Claude Code's worktree name cap). */
const WORKTREE_NAME_MAX_LENGTH = 64;

/**
 * Validate and normalize a user-supplied worktree name.
 *
 * @param {unknown} value - raw value from the RPC boundary.
 * @returns {string} trimmed, validated worktree name.
 */
export function normalizeWorktreeName(value) {
  if (typeof value !== "string") {
    throw new Error("worktree name must be a string");
  }

  const name = value.trim();
  if (name.length === 0) {
    throw new Error("worktree name must not be empty");
  }
  if (name.length > WORKTREE_NAME_MAX_LENGTH) {
    throw new Error(`worktree name must be at most ${WORKTREE_NAME_MAX_LENGTH} characters`);
  }
  if (isAbsolute(name) || name.startsWith("/") || name.startsWith("\\")) {
    throw new Error("worktree name must be a relative path, not an absolute path");
  }
  if (!WORKTREE_NAME_PATTERN.test(name)) {
    throw new Error(
      "worktree name may only contain letters, digits, dots, underscores, dashes, and / as a separator",
    );
  }

  const segments = name.split("/");
  if (segments.some((segment) => segment === "." || segment === ".." || segment === "")) {
    throw new Error("worktree name must not contain '.', '..', or empty path segments");
  }

  return name;
}

/**
 * Run a git command and return trimmed stdout.
 *
 * @param {string[]} args - git argv (without the leading `git`).
 * @param {string} cwd - working directory for the command.
 * @returns {Promise<string>} trimmed stdout.
 */
export async function runGit(args, cwd) {
  try {
    const { stdout } = await execFileAsync("git", args, {
      cwd,
      encoding: "utf8",
      timeout: 30_000,
      maxBuffer: 1024 * 1024,
    });
    return stdout.trim();
  } catch (error) {
    const detail = error?.stderr?.trim() || error?.message || String(error);
    throw new Error(`git ${args.join(" ")} failed: ${detail}`);
  }
}

/**
 * Resolve the repository top-level for `root`.
 *
 * @param {string} root - directory to start the git lookup from.
 * @returns {Promise<string>} absolute repository top-level path.
 */
export async function resolveRepoRoot(root) {
  const repoRoot = await runGit(["rev-parse", "--show-toplevel"], root);
  if (!isAbsolute(repoRoot)) {
    throw new Error(`git rev-parse --show-toplevel returned a non-absolute path: ${repoRoot}`);
  }
  return repoRoot;
}

/**
 * Resolve the configured worktrees directory to an absolute path.
 *
 * @param {string} repoRoot - repository top-level directory.
 * @param {string | undefined} worktreesDir - configured worktrees directory.
 * @returns {string} absolute worktrees base directory.
 */
export function resolveWorktreesDir(repoRoot, worktreesDir) {
  if (worktreesDir === undefined) {
    return resolve(repoRoot, DEFAULT_WORKTREES_DIR);
  }
  return isAbsolute(worktreesDir) ? worktreesDir : resolve(repoRoot, worktreesDir);
}

/**
 * Assert that `candidate` is strictly inside `base`.
 *
 * @param {string} base - expected parent directory.
 * @param {string} candidate - path to verify.
 * @param {string} subject - label used in the error message.
 * @returns {void}
 */
function assertInside(base, candidate, subject) {
  const relativePath = relative(base, candidate);
  if (relativePath === "" || relativePath.startsWith("..") || isAbsolute(relativePath)) {
    throw new Error(`${subject} ${candidate} escapes ${base}`);
  }
}

/**
 * Remove now-empty parent directories of a deleted worktree, stopping at the
 * configured worktrees base directory. Best effort only.
 *
 * @param {string} target - deleted worktree path.
 * @param {string} base - worktrees base directory that must not be removed.
 * @returns {Promise<void>}
 */
async function pruneEmptyAncestors(target, base) {
  const stop = resolve(base);
  let current = dirname(target);
  while (relative(stop, current) !== "" && !relative(stop, current).startsWith("..")) {
    try {
      await rmdir(current);
    } catch {
      return;
    }
    current = dirname(current);
  }
}

/**
 * Add the configured worktree directory to `.git/info/exclude` when it lives
 * inside the repository, so the main checkout does not report each worktree as
 * an untracked directory.
 *
 * Best effort only: a repository that cannot update the exclude file still gets
 * its worktree.
 *
 * @param {string} repoRoot - repository top-level directory.
 * @param {string} base - absolute worktrees base directory.
 * @returns {Promise<void>}
 */
export async function ensureGitExclude(repoRoot, base) {
  const inside = relative(repoRoot, base);
  if (inside === "" || inside.startsWith("..") || isAbsolute(inside)) return;

  const pattern = `/${inside.replace(/\\/g, "/").replace(/^\/+|\/+$/g, "")}/`;
  const excludePath = join(repoRoot, ".git", "info", "exclude");
  try {
    const current = await readFile(excludePath, "utf8");
    if (current.split(/\r?\n/).some((line) => line.trim() === pattern)) return;
    await writeFile(excludePath, `${current.replace(/\r?\n$/, "")}\n${pattern}\n`, "utf8");
  } catch {
    // Best effort only; the worktree itself is still created by git.
  }
}

/**
 * Check whether a git branch already exists in the repository.
 *
 * @param {string} branch - branch name to check, e.g. `dsh/feat/okta-sso`.
 * @param {string} root - directory to locate the git repository from.
 * @returns {Promise<boolean>} true when the branch exists.
 */
export async function branchExists(branch, root) {
  if (typeof branch !== "string" || branch.trim() === "") return false;
  try {
    await runGit(["show-ref", "--verify", "--quiet", `refs/heads/${branch.trim()}`], root);
    return true;
  } catch {
    return false;
  }
}

/**
 * Parse `git worktree list --porcelain` output and return the branch attached
 * to the requested worktree path, if any.
 *
 * @param {string} porcelain - raw porcelain output.
 * @param {string} targetPath - absolute worktree path to look for.
 * @returns {{ registered: boolean, branch: string | null }} parsed result.
 */
export function parseWorktreePorcelain(porcelain, targetPath) {
  let registered = false;
  let branch = null;
  let currentPath = null;
  let currentBranch = null;

  const finishBlock = () => {
    if (currentPath === targetPath) {
      registered = true;
      branch = currentBranch;
    }
    currentPath = null;
    currentBranch = null;
  };

  for (const line of porcelain.split("\n")) {
    if (line === "") {
      finishBlock();
    } else if (line.startsWith("worktree ")) {
      finishBlock();
      currentPath = line.slice("worktree ".length);
    } else if (line.startsWith("branch refs/heads/")) {
      currentBranch = line.slice("branch refs/heads/".length);
    }
  }
  finishBlock();

  return { registered, branch };
}

/**
 * Remove a worktree previously created under the configured worktrees
 * directory.
 *
 * When `deleteBranch` is true, the branch recorded by
 * `git worktree list --porcelain` for that path is safely deleted with
 * `git branch -d` after the worktree itself is removed. If the branch has
 * unmerged commits, git refuses and the branch is kept (`branchDeleteRefused`
 * is true).
 *
 * @param {object} options - options bag.
 * @param {string} options.root - directory to locate the git repository from.
 * @param {string} [options.worktreesDir] - worktree root used for the safety fence.
 * @param {string} options.path - absolute worktree path to remove.
 * @param {boolean} [options.deleteBranch=true] - whether to also delete the worktree's branch.
 * @returns {Promise<{removed: boolean, branch: string | null, branchDeleted: boolean, branchDeleteRefused: boolean}>}
 */
export async function removeGitWorktree(options) {
  if (typeof options.path !== "string" || !isAbsolute(options.path)) {
    throw new Error("worktree path must be an absolute path");
  }

  const repoRoot = await resolveRepoRoot(options.root);
  const base = resolveWorktreesDir(repoRoot, options.worktreesDir);
  assertInside(base, options.path, "worktree path");

  const porcelain = await runGit(["worktree", "list", "--porcelain"], repoRoot);
  const { registered, branch } = parseWorktreePorcelain(porcelain, options.path);

  if (registered) {
    await runGit(["worktree", "remove", "--force", options.path], repoRoot);
    await pruneEmptyAncestors(options.path, base);
  }

  let branchDeleted = false;
  let branchDeleteRefused = false;
  if (options.deleteBranch !== false && branch !== null) {
    try {
      await runGit(["branch", "-d", branch], repoRoot);
      branchDeleted = true;
    } catch {
      branchDeleted = false;
      branchDeleteRefused = true;
    }
  }

  return { removed: registered, branch, branchDeleted, branchDeleteRefused };
}

/**
 * Create a git worktree for a new dsh session.
 *
 * The worktree is created at `<repoRoot>/<worktreesDir>/<name>` with a new
 * branch based on HEAD. The branch defaults to `dsh/<name>`; callers may pass
 * a custom branch name. If `worktreesDir` is absolute it is used as-is;
 * otherwise it resolves relative to the repository top-level.
 *
 * @param {object} options - options bag.
 * @param {string} options.root - directory to locate the git repository from.
 * @param {string} [options.worktreesDir] - directory under which worktrees live.
 * @param {string} options.name - user-supplied worktree name.
 * @param {string} [options.branch] - custom branch name; defaults to `dsh/<name>`.
 * @returns {Promise<{path: string, branch: string, repoRoot: string}>}
 */
export async function createGitWorktree(options) {
  const name = normalizeWorktreeName(options.name);
  const repoRoot = await resolveRepoRoot(options.root);
  const base = resolveWorktreesDir(repoRoot, options.worktreesDir);
  const path = resolve(base, name);

  // Safety rail: the validated name is relative and has no `..`, so the
  // resolved path must stay under the configured worktrees directory.
  assertInside(base, path, "worktree path");

  const branch = options.branch?.trim() || `dsh/${name}`;
  if (await branchExists(branch, repoRoot)) {
    throw new Error(`Branch "${branch}" already exists`);
  }

  await ensureGitExclude(repoRoot, base);
  await runGit(["worktree", "add", "-b", branch, path, "HEAD"], repoRoot);

  return { path, branch, repoRoot };
}
