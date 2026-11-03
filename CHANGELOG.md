# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- Rename the package to `@soap/dsh-plugin-worktree` (version `0.0.1`) and
  update `cordis.patch.yml`, the browser module registration id, the install
  documentation, and the package tests to the scoped name. dsh matches a
  bundle's browser module id to its package name; the old id made the client
  half load without registering (`already executed without registering`).

## [0.2.0] - 2026-11-03

### Changed

- Target dsh `0.2.x` (including the desktop app / `desktop` profile). The
  plugin now declares `engines.dsh = ">=0.2.0-rc.1 <0.3.0-0"`, so dsh's
  compatibility gate accepts it instead of rejecting the install with
  `incompatible-version`.
- Bump `@deepseek-ai/cordis` to `^4.0.5`,
  `@deepseek-ai/dsh-typert-protocol` to `^0.2.1-rc.5`, and
  `@deepseek-ai/dsh-client-ui-primitives` to `^0.2.1-rc.5` in
  `peerDependencies` and `devDependencies`.
- Require Node.js `22.19.0` or newer, matching dsh `0.2.x`.
- Reduce the client `dsh.client.inject` list to the connection and locale
  packages actually imported by the bundle.
- Open the worktree folder picker through `remote.directoryPicker.pick()`;
  `workspaces.pickDirectory()` no longer exists in dsh `0.2.x`.
- Use the dsh `0.2.x` icon exports (`IconFolderCloseRegular`,
  `IconPlusOutlineRegular`) with fallbacks for the removed `*16` names.

### Fixed

- Keep worktree workspace titles as plain strings. The sidebar interpolates
  the title into accessible labels, so the previous React-element title
  rendered as `[object Object]` in row action labels.
- Prune empty parent directories under the worktrees root after removing a
  git worktree.

### Documentation

- Document dsh `0.2.x` and desktop-profile installation in `README.md` and
  `docs/getting-started.md`, and refresh the architecture notes for the
  `0.2.x` client contracts.

## [0.1.1] - 2026-09-04

### Changed

- Bump `@deepseek-ai/dsh-typert-protocol` dependency range from `^0.1.0-rc.6`
  to `^0.1.2-rc.1` in `peerDependencies` and `devDependencies`, matching the
  dsh `0.1.2-rc.1` runtime. The previous range did not satisfy `0.1.2-rc.1`
  under strict npm semver prerelease rules.
- Refresh `package-lock.json` to resolve the updated ranges.

## [0.1.0] - 2025-08-19

### Added

- Initial release: git worktree sessions for dsh web.
- Project documentation structure: `docs/getting-started.md`,
  `docs/development.md`, `docs/release.md`, `docs/architecture.md`,
  `CONTRIBUTING.md`, and `CHANGELOG.md`.
- Node built-in test suite covering worktree helpers, host service behavior,
  and client-side pure logic.
- `LICENSE` file (MIT).
- Package metadata for npm publishing and community store registration.

### Changed

- Refactored host/worktree code for clarity and maintainability.
- Updated type declarations to include `branchDeleteRefused`.
