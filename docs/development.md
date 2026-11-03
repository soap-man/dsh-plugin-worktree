# Development

This guide is for **contributors** working on `dsh-plugin-worktree`.

## Project layout

```text
lib/
  index.js       # host Cordis/Typert service
  worktree.js    # pure git-worktree helpers
  client.js      # browser half (single-file dsh client bundle)
  client.d.ts    # browser/client type declarations
  index.d.ts     # host type declarations
cordis.patch.yml # bundle patch row installed by dsh
docs/            # user + maintainer documentation
tests/           # node:test test suite
```

## Local linked install

Install the plugin as a linked dependency into the `web` profile:

```bash
cd /absolute/path/to/dsh-plugin-worktree
npm install

dsh plugin --profile web add /absolute/path/to/dsh-plugin-worktree
```

`dsh plugin add` links the profile dependency to this checkout, so edits here
are picked up directly.

> **Important for linked development**: because this checkout is symlinked
> from the profile, Node resolves `@deepseek-ai/dsh-typert-protocol` (and its
> `@deepseek-ai/cordis` peer) from this checkout’s `node_modules`, not from the
> profile. Those packages must be the **same module instances** the dsh host
> uses, otherwise the Typert `Remote` markers are invisible to the dsh API
> gateway and `worktree/create` returns 404. After `npm install`, replace the
> two real installed copies with symlinks to the dsh installation’s copies:
>
> ```bash
> dsh_root="$(dirname "$(dirname "$(command -v dsh)")")"
> rm -rf node_modules/@deepseek-ai/dsh-typert-protocol node_modules/@deepseek-ai/cordis
> ln -s "$dsh_root/@deepseek-ai/dsh-typert-protocol" node_modules/@deepseek-ai/dsh-typert-protocol
> ln -s "$dsh_root/@deepseek-ai/cordis" node_modules/@deepseek-ai/cordis
> ```

## Iteration loop

After each change:

- host-side changes (`lib/index.js`, `lib/worktree.js`, `cordis.patch.yml`) →
  restart `dsh web`;
- client-side changes (`lib/client.js`) → restart `dsh web` (or trigger the
  client HMR refresh if it is active).

You do **not** need to re-run `dsh plugin add` after every edit. Re-run
`npm install` only when `package.json` dependencies change; re-run
`dsh plugin --profile web install` only when the profile’s dependency graph
needs refreshing.

## Running tests

```bash
npm test
```

The test suite uses Node’s built-in `node:test` runner and exercises the git
helpers against temporary repositories. No external test framework is needed.

## Code style

- Plain ESM JavaScript with JSDoc types.
- The host code is split into a thin service (`lib/index.js`) and pure helpers
  (`lib/worktree.js`).
- Keep pure functions side-effect free and unit-testable.
- The browser bundle is intentionally self-contained; keep its public surface
  limited to `apply` and `inject`, plus a `__test` export used only by tests.

## Release checklist

See [Release](release.md).
