# Architecture

`dsh-plugin-worktree` is a dsh **bundle** with both a host half and a browser
half.

## Bundle manifest

`package.json` declares:

```json
{
  "dsh": {
    "bundle": { "patch": "./cordis.patch.yml" },
    "client": {
      "inject": [
        "@deepseek-ai/dsh-client-connection",
        "@deepseek-ai/dsh-client-locale",
        "@deepseek-ai/dsh-client-runtime"
      ],
      "platform": "web"
    }
  }
}
```

`cordis.patch.yml` inserts one loader row:

```yaml
- insert:
    - id: worktree
      name: dsh-plugin-worktree
```

When a profile lists this package in `dsh.profile.bundles`, dsh applies that
patch and loads the `worktree` service.

## Host side

`lib/index.js` mounts `ctx.worktree`, a `TypertRemoteService` with four remote
methods:

- `worktree/create` — validate the name, resolve the repository root, create a
  git worktree at `.dsh/worktrees/<name>` with a `dsh/<name>` branch, and
  return `{ path, branch, repoRoot }`.
- `worktree/remove` — remove a worktree **and** its branch before the workspace
  registration is deleted.
- `worktree/removeWorktree` — remove a worktree only, keeping its branch.
- `worktree/branchExists` — check whether a branch already exists.

The service delegates to `lib/worktree.js`, which contains pure git helpers and
no dsh imports, so it can be tested against real repositories.

### Worktree creation flow

1. The user types a worktree name (e.g. `feat/okta-sso`).
2. The client calls `worktree/create`.
3. The host runs `git rev-parse --show-toplevel`, then
   `git worktree add -b dsh/<name> <repo>/.dsh/worktrees/<name> HEAD`.
4. The client creates a new dsh session whose cwd is inside that worktree.

After the session is created its cwd is immutable (dsh stores the session cwd
in the session header and the workspace registry validates session attachment
against it), so all following turns run locally inside the worktree.

### Worktree deletion flow

1. The client detects a worktree workspace in the sidebar delete request.
2. It shows a confirmation dialog with two checkboxes: delete the git worktree,
   and delete the branch.
3. If requested, it calls `worktree/remove` or `worktree/removeWorktree`.
4. It deletes the dsh workspace registration.
5. It shows a toast summarizing whether the branch was deleted or kept because
   it had unmerged commits.

## Client side

`lib/client.js` is a self-contained dsh client bundle. It:

- shadows `conversation.hero.workspace` at priority `-1` and re-creates the
  workspace picker with an inline **Worktree** chip and worktree menu;
- renders the worktree creation modal directly from that chip (the sidebar and
  hero directory-flow slots are left untouched, so **Add workspace** keeps its
  original folder picker);
- decorates the workspace snapshot store so worktree workspaces carry
  `worktree: true` and a `⑂` badge in their display title;
- patches the sidebar `WorkspaceBrowser` delete request so worktree workspaces
  show the worktree/branch removal dialog **before** dsh’s own confirm modal
  (non-worktree deletes keep the original confirmation).

## Safety rails

- Worktree names are validated: relative, safe segments, no `.` or `..`, max
  64 characters.
- Worktree paths are resolved under the configured worktrees directory; a path
  that escapes it is rejected.
- Deleting a worktree only removes paths registered in
  `git worktree list --porcelain` and under the configured worktrees directory.
- Branch deletion uses `git branch -d`, so git refuses to delete branches with
  unmerged commits; the client surfaces that as “branch kept”.
