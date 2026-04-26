# CHANGELOG Generation Tools

Tools to auto-generate CHANGELOG from Conventional Commits.

## Tool Comparison

| Tool             | Command                | Best For                     |
| ---------------- | ---------------------- | ---------------------------- |
| standard-version | `npx standard-version` | Simple projects (deprecated) |
| release-it       | `npx release-it`       | GitHub Release integration   |
| semantic-release | `npx semantic-release` | Full CI/CD automation        |
| changesets       | `npx changeset`        | Monorepos                    |

> **Note**: standard-version is deprecated and no longer maintained. Consider release-it or semantic-release for new projects.

## standard-version

Simplest option. Local CHANGELOG generation + version bump.

```bash
# Install
npm install --save-dev standard-version

# Usage
npx standard-version           # patch
npx standard-version --minor   # minor
npx standard-version --major   # major
npx standard-version --dry-run # preview
```

### package.json

```json
{
  "scripts": {
    "release": "standard-version",
    "release:minor": "standard-version --release-as minor",
    "release:major": "standard-version --release-as major"
  }
}
```

## release-it

Powerful GitHub Release integration.

```bash
# Install
npm install --save-dev release-it

# Usage
npx release-it
npx release-it --dry-run
npx release-it --ci  # non-interactive
```

### .release-it.json

```json
{
  "git": {
    "commitMessage": "chore: release v${version}"
  },
  "github": {
    "release": true
  },
  "npm": {
    "publish": false
  },
  "plugins": {
    "@release-it/conventional-changelog": {
      "preset": "angular",
      "infile": "CHANGELOG.md"
    }
  }
}
```

## semantic-release

For full CI/CD automation.

```bash
# Install
npm install --save-dev semantic-release

# Requires CI configuration (GitHub Actions, etc.)
```

### GitHub Actions

```yaml
name: Release
on:
  push:
    branches: [main]
jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npx semantic-release
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
```

## Selection Guide

| Condition                  | Recommended      |
| -------------------------- | ---------------- |
| Manual release             | release-it       |
| GitHub Release integration | release-it       |
| Full CI/CD automation      | semantic-release |
| Monorepo                   | changesets       |

## Prerequisites

All tools require **Conventional Commits** format.

Reference: [@./git-essentials.md](./git-essentials.md) - Conventional Commits section

## Keep a Changelog Format

Generated CHANGELOG follows [Keep a Changelog](https://keepachangelog.com/) format:

```markdown
# Changelog

## [1.2.0] - 2026-01-27

### Added

- New feature X

### Fixed

- Bug in Y

### Changed

- Updated Z
```
