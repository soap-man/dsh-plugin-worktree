# Contributing

Thanks for contributing to `dsh-plugin-worktree`!

## Development setup

See [Development](docs/development.md) for local linked-install instructions,
the iteration loop, and test commands.

## Branch model

- `main` is always releasable.
- `dev` is the integration branch for the next release.
- Create feature branches from `dev`:

  ```bash
  git checkout dev
  git checkout -b feature/my-change
  ```

- Open a PR from `feature/my-change` into `dev`.
- Hotfixes branch from `main` and are merged back into `dev` too.

## Commit messages

Use concise, conventional commit messages:

```text
feat: add worktree creation flow
fix: handle unmerged branch deletion
docs: split user and developer guides
test: cover worktree path safety
refactor: extract git porcelain parser
```

## Before submitting

- Run `npm test`.
- Run `npm pack --dry-run` and confirm the published file list is correct.
- Keep the browser bundle self-contained.
- Add tests for new behavior.
- Update `CHANGELOG.md` under `[Unreleased]`.

## Code of conduct

Be respectful and constructive. This project follows a simple rule: code
reviews are about the code, not the person.
