import assert from "node:assert/strict";
import test from "node:test";

import { remoteMethods } from "@deepseek-ai/dsh-typert-protocol";
import WorktreeService from "../lib/index.js";
import { branchExists } from "../lib/worktree.js";
import { makeTempRepo } from "./helpers.js";

function makeService(repo) {
  const ctx = {
    reflect: {
      provide() {},
    },
  };
  return new WorktreeService(ctx, { root: repo });
}

test("WorktreeService registers all remote methods", async (t) => {
  const repo = await makeTempRepo(t);
  const service = makeService(repo);
  const methods = remoteMethods(service).map((entry) => entry.method).sort();

  assert.deepEqual(methods, ["branchExists", "create", "remove", "removeWorktree"]);
});

test("WorktreeService.create creates a worktree", async (t) => {
  const repo = await makeTempRepo(t);
  const service = makeService(repo);

  const result = await service.create("feat/service");
  assert.equal(result.repoRoot, repo);
  assert.equal(result.branch, "dsh/feat/service");
  assert.equal(await branchExists(result.branch, repo), true);
});

test("WorktreeService.branchExists checks the repository", async (t) => {
  const repo = await makeTempRepo(t);
  const service = makeService(repo);

  assert.equal(await service.branchExists("main"), true);
  assert.equal(await service.branchExists("missing"), false);
});

test("WorktreeService.remove deletes worktree and branch", async (t) => {
  const repo = await makeTempRepo(t);
  const service = makeService(repo);
  const created = await service.create("feat/service-remove");

  const result = await service.remove(created.path);
  assert.equal(result.removed, true);
  assert.equal(result.branchDeleted, true);
  assert.equal(await branchExists("dsh/feat/service-remove", repo), false);
});

test("WorktreeService.removeWorktree keeps the branch", async (t) => {
  const repo = await makeTempRepo(t);
  const service = makeService(repo);
  const created = await service.create("feat/service-keep");

  const result = await service.removeWorktree(created.path);
  assert.equal(result.removed, true);
  assert.equal(result.branchDeleted, false);
  assert.equal(await branchExists("dsh/feat/service-keep", repo), true);
});
