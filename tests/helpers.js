import { mkdtemp, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runGit } from "../lib/worktree.js";

/**
 * Create a temporary git repository with an initial commit and register
 * cleanup with the current node:test context.
 *
 * @param {import("node:test").TestContext} t - test context.
 * @returns {Promise<string>} absolute path to the repository root.
 */
export async function makeTempRepo(t) {
  const dir = await realpath(await mkdtemp(join(tmpdir(), "dsh-worktree-test-")));
  t.after(() => rm(dir, { recursive: true, force: true }));

  await runGit(["init", "-b", "main"], dir);
  await runGit(["config", "user.email", "test@example.com"], dir);
  await runGit(["config", "user.name", "Test"], dir);

  const file = join(dir, "README.md");
  await writeFile(file, "# test\n", "utf8");
  await runGit(["add", "README.md"], dir);
  await runGit(["commit", "-m", "initial"], dir);

  return dir;
}

/**
 * Create a temporary directory that is not a git repository.
 *
 * @param {import("node:test").TestContext} t - test context.
 * @returns {Promise<string>} absolute path to the directory.
 */
export async function makeTempDir(t) {
  const dir = await realpath(await mkdtemp(join(tmpdir(), "dsh-worktree-plain-")));
  t.after(() => rm(dir, { recursive: true, force: true }));
  return dir;
}
