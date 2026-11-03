import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("package.json declares a dsh bundle and client", async () => {
  const pkg = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));

  assert.equal(pkg.name, "dsh-plugin-worktree");
  assert.equal(pkg.dsh.bundle.patch, "./cordis.patch.yml");
  assert.equal(pkg.dsh.client.platform, "web");
  assert.ok(Array.isArray(pkg.dsh.client.inject));
  assert.ok(pkg.files.includes("lib/index.js"));
  assert.ok(pkg.files.includes("lib/client.js"));
  assert.ok(pkg.files.includes("cordis.patch.yml"));
  assert.ok(pkg.files.includes("LICENSE"));
  assert.equal(pkg.scripts.test, "node --test tests/*.test.js");
});

test("cordis.patch.yml inserts the worktree row", async () => {
  const patch = await readFile(new URL("../cordis.patch.yml", import.meta.url), "utf8");

  assert.match(patch, /id: worktree/);
  assert.match(patch, /name: dsh-plugin-worktree/);
});

test("required repository files exist", async () => {
  const root = new URL("../", import.meta.url);
  const files = [
    "README.md",
    "LICENSE",
    "CHANGELOG.md",
    "CONTRIBUTING.md",
    "docs/getting-started.md",
    "docs/development.md",
    "docs/release.md",
    "docs/architecture.md",
  ];

  for (const file of files) {
    await assert.doesNotReject(readFile(new URL(file, root), "utf8"), `${file} should exist`);
  }
});
