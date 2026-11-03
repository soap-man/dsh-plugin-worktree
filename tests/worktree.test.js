import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";

import {
  branchExists,
  createGitWorktree,
  ensureGitExclude,
  normalizeWorktreeName,
  parseWorktreePorcelain,
  removeGitWorktree,
  resolveRepoRoot,
  resolveWorktreesDir,
  runGit,
} from "../lib/worktree.js";
import { makeTempDir, makeTempRepo } from "./helpers.js";

test("normalizeWorktreeName accepts valid names", () => {
  assert.equal(normalizeWorktreeName("feat"), "feat");
  assert.equal(normalizeWorktreeName("feat/okta-sso"), "feat/okta-sso");
  assert.equal(normalizeWorktreeName("  feat/okta-sso  "), "feat/okta-sso");
  assert.equal(normalizeWorktreeName("a.b-c_d"), "a.b-c_d");
});

test("normalizeWorktreeName rejects invalid names", () => {
  const invalid = [
    [null, /string/],
    [42, /string/],
    ["", /empty/],
    ["   ", /empty/],
    ["a".repeat(65), /at most 64/],
    ["/abs", /relative/],
    ["\\abs", /relative/],
    ["feat/name with space", /letters, digits/],
    ["feat;drop", /letters, digits/],
    [".", /must not contain/],
    ["..", /must not contain/],
    ["feat/../x", /must not contain/],
    ["feat//x", /letters, digits/],
    ["feat/.", /must not contain/],
  ];

  for (const [input, pattern] of invalid) {
    assert.throws(() => normalizeWorktreeName(input), pattern);
  }
});

test("normalizeWorktreeName accepts the maximum length", () => {
  const name = "a".repeat(64);
  assert.equal(normalizeWorktreeName(name), name);
});

test("runGit returns trimmed stdout", async (t) => {
  const repo = await makeTempRepo(t);
  assert.equal(await runGit(["rev-parse", "--show-toplevel"], repo), repo);
});

test("runGit throws a descriptive error on failure", async (t) => {
  const dir = await makeTempDir(t);
  await assert.rejects(() => runGit(["rev-parse", "--show-toplevel"], dir), /git .* failed/);
});

test("resolveRepoRoot resolves the repository top-level", async (t) => {
  const repo = await makeTempRepo(t);
  const nested = join(repo, "packages", "a");
  await import("node:fs/promises").then((fs) => fs.mkdir(nested, { recursive: true }));
  assert.equal(await resolveRepoRoot(nested), repo);
});

test("resolveRepoRoot rejects directories outside a repository", async (t) => {
  const dir = await makeTempDir(t);
  await assert.rejects(() => resolveRepoRoot(dir), /git .* failed/);
});

test("resolveWorktreesDir resolves relative and absolute paths", async (t) => {
  const repo = await makeTempRepo(t);
  assert.equal(resolveWorktreesDir(repo, undefined), join(repo, ".dsh/worktrees"));
  assert.equal(resolveWorktreesDir(repo, "custom/worktrees"), join(repo, "custom/worktrees"));
  assert.equal(resolveWorktreesDir(repo, "/tmp/absolute-worktrees"), "/tmp/absolute-worktrees");
});

test("ensureGitExclude adds the worktrees directory to .git/info/exclude", async (t) => {
  const repo = await makeTempRepo(t);
  const base = join(repo, ".dsh/worktrees");
  await ensureGitExclude(repo, base);

  const excludePath = join(repo, ".git", "info", "exclude");
  const exclude = await readFile(excludePath, "utf8");
  assert.match(exclude, /\/\.dsh\/worktrees\//);

  await ensureGitExclude(repo, base);
  const again = await readFile(excludePath, "utf8");
  assert.equal(again.match(/\/\.dsh\/worktrees\//g)?.length, 1);
});

test("ensureGitExclude ignores worktrees outside the repository", async (t) => {
  const repo = await makeTempRepo(t);
  const outside = await makeTempDir(t);
  await ensureGitExclude(repo, outside);

  const exclude = await readFile(join(repo, ".git", "info", "exclude"), "utf8");
  assert.doesNotMatch(exclude, new RegExp(outside.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
});

test("branchExists detects existing and missing branches", async (t) => {
  const repo = await makeTempRepo(t);
  assert.equal(await branchExists("main", repo), true);
  assert.equal(await branchExists("missing", repo), false);
  assert.equal(await branchExists("", repo), false);
  assert.equal(await branchExists(null, repo), false);
});

test("parseWorktreePorcelain parses registered worktree branches", () => {
  const porcelain = [
    "worktree /repo/main",
    "HEAD abc123",
    "branch refs/heads/main",
    "",
    "worktree /repo/.dsh/worktrees/feat/x",
    "HEAD def456",
    "branch refs/heads/dsh/feat/x",
    "",
  ].join("\n");

  assert.deepEqual(parseWorktreePorcelain(porcelain, "/repo/.dsh/worktrees/feat/x"), {
    registered: true,
    branch: "dsh/feat/x",
  });
  assert.deepEqual(parseWorktreePorcelain(porcelain, "/repo/main"), {
    registered: true,
    branch: "main",
  });
  assert.deepEqual(parseWorktreePorcelain(porcelain, "/repo/unknown"), {
    registered: false,
    branch: null,
  });
});

test("createGitWorktree creates a worktree with a dsh branch", async (t) => {
  const repo = await makeTempRepo(t);
  const result = await createGitWorktree({ root: repo, name: "feat/okta-sso" });

  assert.equal(result.repoRoot, repo);
  assert.equal(result.branch, "dsh/feat/okta-sso");
  assert.equal(result.path, join(repo, ".dsh/worktrees/feat/okta-sso"));
  assert.equal(await branchExists("dsh/feat/okta-sso", repo), true);

  await stat(result.path);
});

test("createGitWorktree supports a custom worktreesDir and branch", async (t) => {
  const repo = await makeTempRepo(t);
  const result = await createGitWorktree({
    root: repo,
    worktreesDir: "custom/worktrees",
    name: "experiment",
    branch: "custom/exp",
  });

  assert.equal(result.path, join(repo, "custom/worktrees/experiment"));
  assert.equal(result.branch, "custom/exp");
  assert.equal(await branchExists("custom/exp", repo), true);
});

test("createGitWorktree rejects an existing branch", async (t) => {
  const repo = await makeTempRepo(t);
  await assert.rejects(
    () => createGitWorktree({ root: repo, name: "dup", branch: "main" }),
    /already exists/,
  );
});

test("createGitWorktree rejects invalid names before touching git", async (t) => {
  const repo = await makeTempRepo(t);
  await assert.rejects(
    () => createGitWorktree({ root: repo, name: "../escape" }),
    /must not contain/,
  );
});

test("removeGitWorktree removes a worktree and its branch", async (t) => {
  const repo = await makeTempRepo(t);
  const created = await createGitWorktree({ root: repo, name: "feat/cleanup" });

  const result = await removeGitWorktree({
    root: repo,
    path: created.path,
    deleteBranch: true,
  });

  assert.equal(result.removed, true);
  assert.equal(result.branch, "dsh/feat/cleanup");
  assert.equal(result.branchDeleted, true);
  assert.equal(result.branchDeleteRefused, false);
  assert.equal(await branchExists("dsh/feat/cleanup", repo), false);
  await assert.rejects(() => stat(created.path), /ENOENT/);
});

test("removeGitWorktree can keep the branch", async (t) => {
  const repo = await makeTempRepo(t);
  const created = await createGitWorktree({ root: repo, name: "feat/keep-branch" });

  const result = await removeGitWorktree({
    root: repo,
    path: created.path,
    deleteBranch: false,
  });

  assert.equal(result.removed, true);
  assert.equal(result.branchDeleted, false);
  assert.equal(await branchExists("dsh/feat/keep-branch", repo), true);
});

test("removeGitWorktree keeps unmerged branches and reports refusal", async (t) => {
  const repo = await makeTempRepo(t);
  const created = await createGitWorktree({ root: repo, name: "feat/unmerged" });

  const worktreeFile = join(created.path, "new-file.txt");
  await import("node:fs/promises").then((fs) =>
    fs.writeFile(worktreeFile, "change\n", "utf8"),
  );
  await runGit(["add", "new-file.txt"], created.path);
  await runGit(["commit", "-m", "worktree commit"], created.path);

  const result = await removeGitWorktree({
    root: repo,
    path: created.path,
    deleteBranch: true,
  });

  assert.equal(result.removed, true);
  assert.equal(result.branchDeleted, false);
  assert.equal(result.branchDeleteRefused, true);
  assert.equal(await branchExists("dsh/feat/unmerged", repo), true);
});

test("removeGitWorktree rejects paths outside the worktrees directory", async (t) => {
  const repo = await makeTempRepo(t);
  await assert.rejects(
    () => removeGitWorktree({ root: repo, path: join(repo, "outside") }),
    /escapes/,
  );
});

test("removeGitWorktree returns removed=false for an unknown path inside the fence", async (t) => {
  const repo = await makeTempRepo(t);
  const missing = join(repo, ".dsh/worktrees/never-created");
  const result = await removeGitWorktree({ root: repo, path: missing });

  assert.equal(result.removed, false);
  assert.equal(result.branch, null);
  assert.equal(result.branchDeleted, false);
  assert.equal(result.branchDeleteRefused, false);
});
