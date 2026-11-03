# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
