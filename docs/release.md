# Release

This guide is for **maintainers** releasing `dsh-plugin-worktree` and keeping
it listed in the community plugin store.

## Versioning

Use [semantic versioning](https://semver.org/):

- `0.x` for early development while the public API is still stabilizing.
- `minor` for new features.
- `patch` for bug fixes.
- `major` for breaking changes.

The npm version in `package.json`, the git tag, and the GitHub Release must all
match.

## Branch model

```text
main:   stable, always releasable
dev:    integration branch for the next release
feature/*:  branched from dev, merged via PR
hotfix/*:   branched from main, merged to main and dev
release/vX.Y.Z: optional stabilization branch
```

## Manual release workflow

```bash
# 1. Prepare from dev
git checkout dev
git pull
git checkout -b release/v0.2.0

# 2. Bump version and update changelog
npm version 0.2.0 --no-git-tag-version
# edit CHANGELOG.md

# 3. Validate
npm test
npm pack --dry-run

# 4. Merge to main and tag
git checkout main
git merge --no-ff release/v0.2.0
git tag v0.2.0
git push origin main --tags

# 5. Publish to npm
npm publish

# 6. Create a GitHub Release
gh release create v0.2.0 --generate-notes

# 7. Sync back to dev
git checkout dev
git merge --no-ff main
git push origin dev

# 8. Clean up
git branch -d release/v0.2.0
```

## Automated releases (recommended)

Use [release-please](https://github.com/googleapis/release-please) or
[Changesets](https://github.com/changesets/changesets) in CI:

- pushes to `main` open/update a release PR;
- merging the release PR bumps `package.json`, updates `CHANGELOG.md`, tags the
  release, and publishes to npm.

## Publishing checklist

- [ ] `npm test` passes.
- [ ] `npm pack --dry-run` includes `lib/`, `cordis.patch.yml`, `README.md`,
      `LICENSE`, and `docs/` when needed.
- [ ] `package.json` version matches the tag.
- [ ] `CHANGELOG.md` is updated.
- [ ] GitHub Release notes are complete.
- [ ] If the plugin description changed, update the awesome-dsh-plugin entry.

## Registering in the community plugin store

There is no built-in dsh plugin store. The community stores
([dsh-market](https://github.com/dsh-market/dsh-market),
[dsh-extension-hub](https://github.com/Relistencode/dsh-extension-hub)) read
from the curated [awesome-dsh-plugin](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin)
registry.

To register:

1. Publish the plugin to npm (recommended).
2. Add the GitHub topic `dsh-plugin` to the repository.
3. Open a PR in `awesome-dsh-plugin/awesome-dsh-plugin` adding
   `data/plugins/<owner>__<repo>.yml`:

   ```yaml
   url: https://github.com/<owner>/<repo>
   name: <owner>/<repo>
   category: git
   description:
     en: One-line accurate description ending with a period.
   ```

4. Regenerate the READMEs with their script if required.
5. Optionally add screenshots to `data/screenshots.json`.

After merge, the community stores pick the entry up automatically. You do not
need to re-submit for every npm release.
