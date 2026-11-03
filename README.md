# dsh-plugin-worktree

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![npm version](https://img.shields.io/npm/v/@soap%2Fdsh-plugin-worktree)](https://www.npmjs.com/package/@soap/dsh-plugin-worktree)

A [dsh](https://github.com/deepseek-ai/deepseek-harness) plugin that brings
Claude Code-style git worktree support to the dsh web UI. Create, switch, and
delete worktree-backed sessions without leaving the browser.

## Features

- **New-session hero** — the workspace chip shows the **root workspace** name when the current session is in a worktree, and the **Worktree** chip shows the current worktree name. You can list the repository's worktree workspaces, create a new git worktree, or switch to another worktree.
- **Sidebar badge** — worktree workspaces are normal workspaces whose titles carry a `⑂` branch badge.
- **Delete dialog** — deleting a worktree workspace asks whether to also remove the git worktree directory and its `dsh/<name>` branch, or keep them on disk.

## Requirements

- dsh `0.2.0-rc.1` or newer (`0.2.x`); works with both the desktop app and a
  `web` profile
- `git` available on the host machine
- Node.js 22.19 or newer (the version required by dsh `0.2.x`)

## Install

### From npm

```bash
# Desktop app
dsh plugin --profile desktop add @soap/dsh-plugin-worktree

# Web profile
dsh plugin --profile web add @soap/dsh-plugin-worktree
```

Restart dsh (or the desktop app) afterwards. The plugin registers the `worktree`
bundle row automatically.

### From GitHub

```bash
dsh plugin --profile web add github:limoiie/dsh-plugin-worktree#main
```

Pin a released version by replacing `#main` with a tag, for example:

```bash
dsh plugin --profile web add github:limoiie/dsh-plugin-worktree#v0.2.0
```

Git-hosted installs may need pnpm's `allowBuilds` approval for the package's
`prepare` script, as pnpm prints during installation.

### Update

```bash
dsh plugin --profile web update @soap/dsh-plugin-worktree
```

Restart `dsh web` after updating.

If you installed from GitHub, re-run the same GitHub install command to move to
the latest commit of that branch or tag.

### Remove

```bash
dsh plugin --profile desktop remove @soap/dsh-plugin-worktree
# or: dsh plugin --profile web remove @soap/dsh-plugin-worktree
```

Restart dsh after removing. This uninstalls the plugin and removes its
bundle layer from the `web` profile.

## Quick start

1. Install the plugin and restart dsh (desktop app or `dsh web`).
2. Open a new session.
3. In the workspace picker, open the **Worktree** chip.
4. Choose **New worktree…**, enter a name such as `feat/okta-sso`, and confirm.
5. dsh creates a git worktree at `.dsh/worktrees/<name>` on a `dsh/<name>` branch and opens a new session inside it.

To switch later, start another new session and pick an existing worktree
workspace from the **Worktree** chip or the sidebar. To remove a worktree
workspace, use the sidebar delete flow and choose whether to also remove the
git worktree and its branch.

## Configuration

The `worktree` row accepts:

| field          | default            | meaning                                                       |
| -------------- | ------------------ | ------------------------------------------------------------- |
| `root`         | `process.cwd()`    | directory used for `git rev-parse --show-toplevel`            |
| `worktreesDir` | `.dsh/worktrees`   | worktree root; absolute, or relative to the repository top     |

Name rules: at most 64 characters, one or more `/`-separated segments made of
letters, digits, dots, underscores, and dashes (`feat/okta-sso` works; `.` and
`..` segments are rejected).

Users can override these values in their profile or home `cordis.patch.yml` by
targeting `id: worktree` without editing the plugin.

## How it works

- The host service exposes `worktree/create`, `worktree/remove`, `worktree/removeWorktree`, and `worktree/branchExists` RPCs.
- Creating a worktree runs `git worktree add -b dsh/<name> <repo>/.dsh/worktrees/<name> HEAD`.
- The browser client registers the worktree path as a normal DSH workspace and opens a new session inside it.
- Deleting a worktree workspace asks whether to remove the git worktree and/or its branch before removing the workspace registration.

See [Architecture](docs/architecture.md) for implementation details.

## Safety

- Worktree names are validated to prevent path traversal and invalid git names.
- Worktree paths are resolved under the configured worktrees directory; paths that escape it are rejected.
- Branch deletion uses `git branch -d`, so git refuses to delete branches with unmerged commits; the client surfaces that as “branch kept”.
- The configured worktrees directory is added to `.git/info/exclude` on a best-effort basis so main-checkout status stays clean.

## Related plugins

The dsh ecosystem already has several worktree plugins. They are not direct
replacements for each other: they emphasize different parts of the workflow,
so the right choice depends on whether the worktree is primarily for the
**human in the web UI**, for **parallel agent tasks**, or for **durable
agent-created workspaces**.

| Plugin | Focus | Primary interface | Worktree model | Best for |
| --- | --- | --- | --- | --- |
| **dsh-plugin-worktree** (this plugin) | Human-first, web-native worktree sessions | dsh web: new-session hero chip, sidebar `⑂` badges, delete dialog | Regular DSH workspaces created in `.dsh/worktrees/<name>` on a `dsh/<name>` branch | Starting focused sessions in dedicated worktrees and managing them from the dsh web UI, with a clear choice to keep or remove the git worktree and branch on delete |
| [**dsh-plugin-worktrees**](https://github.com/Luck9Star/dsh-worktrees) | Agent-first parallel task isolation | `worktree_*` agent tools | Task-scoped worktrees with a serial merge queue and conflict-scene retention | Dispatching parallel subagents into isolated checkouts and integrating their branches one at a time |
| [**dsh-worktree**](https://github.com/FlashingChen/dsh-worktree) | Durable, Codex-style worktrees | `worktree_*` agent tools and `/worktree` command | Permanent detached checkouts recorded in a per-repo manifest | Having the agent create, list, and reopen long-lived worktrees across sessions without touching the main checkout |

This plugin intentionally keeps the scope on the web UI workflow: a worktree
is just a DSH workspace, so creating one is also creating a session context,
the branch badge makes worktree sessions recognizable in the sidebar, and
deleting asks explicitly whether to remove the worktree directory and its
`dsh/<name>` branch or keep them on disk. It complements agent-tool and
merge-automation plugins rather than competing with them.

## Documentation

- [Getting started](docs/getting-started.md) — install, verify, and configure
- [Architecture](docs/architecture.md) — how the plugin works
- [Development](docs/development.md) — set up a local checkout and iterate
- [Release](docs/release.md) — versioning, publishing, and store registration
- [Contributing](CONTRIBUTING.md) — branch flow and contribution guidelines

## Development

```bash
npm install
npm test
```

See [Development](docs/development.md) for the full local setup.

## License

[MIT](LICENSE)