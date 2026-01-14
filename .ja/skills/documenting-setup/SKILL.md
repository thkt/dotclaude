---
name: documenting-setup
description: >
  コードベース分析から環境セットアップガイドドキュメントを生成。
  パッケージマネージャ、必要なツール、環境変数、起動コマンドを検出。
  トリガー: setup guide, environment setup, development environment.
allowed-tools: [Read, Write, Grep, Glob, Bash, Task]
context: fork
user-invocable: false
---

# 環境セットアップガイド生成

コードベース分析からセットアップドキュメントを自動生成。

## 検出項目

| カテゴリ               | 対象                                                           |
| ---------------------- | -------------------------------------------------------------- |
| パッケージマネージャ   | package.json, yarn.lock, pnpm-lock, pyproject.toml, Cargo.toml |
| ツールバージョン       | .nvmrc, .python-version, .ruby-version, .tool-versions         |
| 環境                   | .env.example, .env.sample, .env.template                       |
| 設定ファイル           | tsconfig.json, eslint.config, vite.config, next.config         |
| コンテナ               | Dockerfile, docker-compose.yml, .devcontainer/                 |
| コマンド               | package.json scripts, Makefile, README                         |
| テスト                 | jest.config, vitest.config, pytest.ini, テストスクリプト       |
| トラブルシューティング | README, TROUBLESHOOTING.md, FAQ, ドキュメント内のよくある問題  |

## 検出パターン

| マネージャ | 識別子                          |
| ---------- | ------------------------------- |
| npm        | `package-lock.json`             |
| yarn       | `yarn.lock`                     |
| pnpm       | `pnpm-lock.yaml`                |
| pip        | `requirements.txt`, `setup.py`  |
| poetry     | `pyproject.toml`, `poetry.lock` |
| cargo      | `Cargo.toml`, `Cargo.lock`      |

## 品質基準

| 基準                                   | 目標 |
| -------------------------------------- | ---- |
| 新メンバーが15分以内にセットアップ可能 | ✓    |
| すべての環境変数が文書化されている     | ✓    |
| よくある問題のトラブルシュートがある   | ✓    |
| コマンドがコピペ可能                   | ✓    |
