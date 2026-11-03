import assert from "node:assert/strict";
import { before, test } from "node:test";

let client;

before(async () => {
  let factory;
  const previousWindow = globalThis.window;

  globalThis.window = {
    __ModuleLoader__: {
      load(handoff) {
        factory = handoff.factory;
      },
    },
  };

  try {
    await import(new URL("../lib/client.js", import.meta.url).href);
  } finally {
    if (previousWindow === undefined) {
      delete globalThis.window;
    } else {
      globalThis.window = previousWindow;
    }
  }

  assert.ok(factory, "client bundle did not register a factory");

  const requireStub = (spec) => {
    switch (spec) {
      case "react":
        return {
          Fragment: Symbol("Fragment"),
          isValidElement: () => false,
          useCallback() {},
          useEffect() {},
          useRef() {},
          useState() {},
        };
      case "react/jsx-runtime":
        return {
          Fragment: Symbol("Fragment"),
          jsx: (...args) => ({ kind: "jsx", args }),
          jsxs: (...args) => ({ kind: "jsxs", args }),
        };
      case "react-dom/client":
        return {
          createRoot() {
            return { render() {}, unmount() {} };
          },
        };
      case "@deepseek-ai/dsh-client-ui-primitives":
        return {
          Button: {},
          IconFolderCloseRegular: {},
          IconPlusOutlineRegular: {},
          Input: {},
          Menu: {},
          Modal: {},
          Toast: {},
        };
      default:
        throw new Error(`Unexpected require in client bundle: ${spec}`);
    }
  };

  client = factory(requireStub);
  assert.ok(client.__test, "client bundle should expose __test helpers");
  assert.equal(typeof client.apply, "function");
  assert.deepEqual(client.inject, ["slots", "workspaces", "connection", "remote", "remote.directoryPicker", "locale"]);
});

test("pathBasename handles separators and trailing slashes", () => {
  const { pathBasename } = client.__test;

  assert.equal(pathBasename("/repo/.dsh/worktrees/feat/x"), "x");
  assert.equal(pathBasename("/repo/"), "repo");
  assert.equal(pathBasename("C:\\repo\\worktrees\\feat"), "feat");
  assert.equal(pathBasename(""), "");
  assert.equal(pathBasename(null), null);
  assert.equal(pathBasename(undefined), undefined);
});

test("worktreePathInfo recognizes worktree paths", () => {
  const { worktreePathInfo } = client.__test;

  assert.deepEqual(worktreePathInfo("/repo/.dsh/worktrees/feat/x"), {
    rootPath: "/repo",
    name: "feat/x",
  });
  assert.deepEqual(worktreePathInfo("C:\\repo\\.dsh\\worktrees\\feat"), {
    rootPath: "C:/repo",
    name: "feat",
  });
  assert.equal(worktreePathInfo("/repo/plain"), null);
  assert.equal(worktreePathInfo("/.dsh/worktrees/x"), null);
  assert.equal(worktreePathInfo("/repo/.dsh/worktrees/"), null);
  assert.equal(worktreePathInfo(null), null);
});

test("isWorktreePath matches the same rule", () => {
  const { isWorktreePath } = client.__test;

  assert.equal(isWorktreePath("/repo/.dsh/worktrees/feat/x"), true);
  assert.equal(isWorktreePath("/repo/plain"), false);
});

test("decorateWorkspaceSnapshot marks and titles worktree workspaces", () => {
  const { decorateWorkspaceSnapshot, WORKTREE_BADGE } = client.__test;
  const source = {
    items: [
      { path: "/repo", title: "Repo", workspaceId: "root", sessionIds: [] },
      { path: "/repo/.dsh/worktrees/feat/x", title: "Old", workspaceId: "wt", sessionIds: [] },
    ],
  };

  const result = decorateWorkspaceSnapshot(source);

  assert.equal(result.items[0].worktree, false);
  assert.equal(result.items[1].worktree, true);
  assert.equal(result.items[1].rootPath, "/repo");
  assert.equal(result.items[1].rootWorkspaceId, "root");
  assert.equal(result.items[1].rootWorkspaceTitle, "Repo");
  assert.equal(result.items[1].title, `Repo${WORKTREE_BADGE}feat/x`);
});

test("decorateWorkspaceSnapshot falls back to the root path basename", () => {
  const { decorateWorkspaceSnapshot, WORKTREE_BADGE } = client.__test;
  const source = {
    items: [
      { path: "/repo/.dsh/worktrees/feature", title: "Old", workspaceId: "wt", sessionIds: [] },
    ],
  };

  const result = decorateWorkspaceSnapshot(source);
  assert.equal(result.items[0].rootWorkspaceTitle, "repo");
  assert.equal(result.items[0].title, `repo${WORKTREE_BADGE}feature`);
});

test("decorateWorkspaceSnapshot returns the same object when unchanged", () => {
  const { decorateWorkspaceSnapshot, WORKTREE_BADGE } = client.__test;
  const source = {
    items: [
      {
        path: "/repo/.dsh/worktrees/feature",
        title: `repo${WORKTREE_BADGE}feature`,
        worktree: true,
        worktreeName: "feature",
        rootPath: "/repo",
        rootWorkspaceId: undefined,
        rootWorkspaceTitle: "repo",
        sessionIds: [],
      },
    ],
  };

  assert.equal(decorateWorkspaceSnapshot(source), source);
});

test("titleWithIcon renders icon elements for worktree titles", () => {
  const { titleWithIcon, WORKTREE_BADGE } = client.__test;

  assert.equal(titleWithIcon("plain title"), "plain title");
  const rendered = titleWithIcon(`repo${WORKTREE_BADGE}feature`);
  assert.equal(typeof rendered, "object");
  assert.equal(rendered.kind, "jsxs");
});
