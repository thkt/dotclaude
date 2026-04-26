# CHANGELOG 生成ツール

Conventional Commits から CHANGELOG を自動生成するツール群。

## ツール比較

| ツール           | コマンド               | 最適な用途                       |
| ---------------- | ---------------------- | -------------------------------- |
| standard-version | `npx standard-version` | シンプルなプロジェクト（非推奨） |
| release-it       | `npx release-it`       | GitHub Release連携               |
| semantic-release | `npx semantic-release` | CI/CD完全自動化                  |
| changesets       | `npx changeset`        | モノレポ                         |

> **注意**: standard-versionは非推奨（メンテナンス終了）。新規プロジェクトにはrelease-itまたはsemantic-releaseを推奨。

## standard-version

最もシンプル。ローカルで CHANGELOG 生成 + バージョンバンプ。

```bash
# インストール
npm install --save-dev standard-version

# 使用方法
npx standard-version           # patch
npx standard-version --minor   # minor
npx standard-version --major   # major
npx standard-version --dry-run # プレビュー
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

GitHub Release 連携が強力。

```bash
# インストール
npm install --save-dev release-it

# 使用方法
npx release-it
npx release-it --dry-run
npx release-it --ci  # 非インタラクティブ
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

CI/CD での完全自動化向け。

```bash
# インストール
npm install --save-dev semantic-release

# CI設定が必要（GitHub Actions等）
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

## 選択ガイド

| 条件                      | 推奨             |
| ------------------------- | ---------------- |
| 手動リリース              | release-it       |
| GitHub Release も作りたい | release-it       |
| CI/CD で完全自動化        | semantic-release |
| モノレポ                  | changesets       |

## 前提条件

すべてのツールは **Conventional Commits** 形式を前提とする。

参照: [@./git-essentials.md](./git-essentials.md) - Conventional Commits セクション

## Keep a Changelog フォーマット

生成される CHANGELOG は [Keep a Changelog](https://keepachangelog.com/) 形式に準拠：

```markdown
# Changelog

## [1.2.0] - 2026-01-27

### Added

- 新機能X

### Fixed

- Yのバグ

### Changed

- Zの更新
```
