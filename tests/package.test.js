import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("package.json declares a dsh bundle and client", async () => {
  const pkg = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));

  assert.equal(pkg.name, "@soap/dsh-plugin-worktree");
  assert.equal(pkg.dsh.bundle.patch, "./cordis.patch.yml");
  assert.equal(pkg.dsh.client.platform, "web");
  assert.ok(Array.isArray(pkg.dsh.client.inject));
  assert.ok(pkg.files.includes("lib/index.js"));
  assert.ok(pkg.files.includes("lib/client.js"));
  assert.ok(pkg.files.includes("cordis.patch.yml"));
  assert.ok(pkg.files.includes("LICENSE"));
  assert.equal(pkg.scripts.test, "node --test tests/*.test.js");
  assert.equal(pkg.version, "0.0.1");
  assert.equal(pkg.engines.dsh, ">=0.2.0-rc.1 <0.3.0-0");
  assert.equal(pkg.engines.node, ">=22.19.0");
  assert.equal(pkg.peerDependencies["@deepseek-ai/dsh-typert-protocol"], "^0.2.1-rc.5");
  assert.equal(pkg.peerDependencies["@deepseek-ai/dsh-client-ui-primitives"], "^0.2.1-rc.5");
  assert.equal(pkg.peerDependencies["@deepseek-ai/cordis"], "^4.0.5");
});

test("cordis.patch.yml inserts the worktree row", async () => {
  const patch = await readFile(new URL("../cordis.patch.yml", import.meta.url), "utf8");

  assert.match(patch, /id: worktree/);
  assert.match(patch, /name: "@soap\/dsh-plugin-worktree"/);
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
