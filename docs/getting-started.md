# Getting Started

This guide is for **users** who want to install and configure
`dsh-plugin-worktree`.

## Prerequisites

- A working [dsh](https://github.com/deepseek-ai/deepseek-harness) installation
- `git` available on the host running `dsh web`

## Install from npm

```bash
dsh plugin --profile web add dsh-plugin-worktree
```

`dsh plugin` forwards to pnpm and automatically appends the package to
`dsh.profile.bundles` when it detects the package declares a `dsh.bundle`
patch (this one does).

Restart `dsh web`. That is all — no manual `cordis.patch.yml` edit is needed.

You can verify the result in `~/.dsh/profiles/web/package.json`; it should
show the dependency and `"dsh-plugin-worktree"` appended to
`dsh.profile.bundles`.

## Install from GitHub

```bash
dsh plugin --profile web add github:limoiie/dsh-plugin-worktree#main
```

To pin a release tag:

```bash
dsh plugin --profile web add github:limoiie/dsh-plugin-worktree#v0.1.0
```

Git-hosted installs may need pnpm's `allowBuilds` approval for the package's
`prepare` script, as pnpm prints during installation.

## Update

```bash
dsh plugin --profile web update dsh-plugin-worktree
```

Restart `dsh web` after updating.

If you installed from GitHub, re-run the same GitHub install command to move
to the latest commit of that branch or tag.

## Remove

```bash
dsh plugin --profile web remove dsh-plugin-worktree
```

Restart `dsh web` after removing. This uninstalls the plugin and removes its
bundle layer from the `web` profile.

## Install from a local checkout

```bash
cd /absolute/path/to/dsh-plugin-worktree
npm install

dsh plugin --profile web add /absolute/path/to/dsh-plugin-worktree
```

This creates a pnpm `link:` dependency, so edits in the checkout are picked up
directly. See [Development](development.md) for the full linked-development
setup.

## Install from a tarball

```bash
cd /absolute/path/to/dsh-plugin-worktree
npm pack

dsh plugin --profile web add /absolute/path/to/dsh-plugin-worktree/dsh-plugin-worktree-0.1.0.tgz
```

pnpm installs the tarball as a regular dependency (not a live link), so later
local edits do not affect the installed copy.

## Manual install (alternative)

If you prefer not to add the bundle, first run `npm install` in this checkout
and install the dependency into the profile, then add an entry to
`~/.dsh/profiles/web/cordis.patch.yml`:

```yaml
- insert:
    - id: worktree
      name: dsh-plugin-worktree
      config:
        root: !!js process.cwd()
        worktreesDir: .dsh/worktrees
```

## Verify installation

```bash
dsh --profile web --dump-config
```

The output should include a `# == dsh-plugin-worktree` layer with the
`worktree` row.

## Configuration

The `worktree` row accepts:

| field          | default            | meaning                                                       |
| -------------- | ------------------ | ------------------------------------------------------------- |
| `root`         | `process.cwd()`    | directory used for `git rev-parse --show-toplevel`            |
| `worktreesDir` | `.dsh/worktrees`   | worktree root; absolute, or relative to the repository top     |

Users can override these values in their profile or home `cordis.patch.yml` by
targeting `id: worktree` without editing the plugin.

## Worktree name rules

- At most 64 characters.
- One or more `/`-separated segments.
- Segments may contain letters, digits, dots, underscores, and dashes.
- `.` and `..` segments are rejected.
- Example: `feat/okta-sso` works.
