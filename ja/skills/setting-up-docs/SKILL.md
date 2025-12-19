---
name: setting-up-docs
description: >
  Generate environment setup guide documentation from codebase analysis.
  Detects package managers, required tools, environment variables, and startup commands.
  コードベースから環境構築ガイドドキュメントを生成します。
  パッケージマネージャ、必要ツール、環境変数、起動コマンドを検出します。
allowed-tools: Read, Write, Grep, Glob, Bash, Task

triggers:
  keywords:
    - "環境構築"
    - "セットアップガイド"
    - "setup guide"
    - "environment setup"
    - "開発環境"
    - "development environment"
---

# docs:setup スキル

環境構築ガイドドキュメントを自動生成するスキル。

## 機能

### 検出項目

1. **パッケージマネージャ**
   - Node.js: package.json, package-lock.json, yarn.lock, pnpm-lock.yaml
   - Python: pyproject.toml, requirements.txt, Pipfile
   - Rust: Cargo.toml
   - Go: go.mod
   - Flutter/Dart: pubspec.yaml
   - Ruby: Gemfile
   - Java: pom.xml, build.gradle

2. **必要なツール・バージョン**
   - .nvmrc, .node-version (Node.js)
   - .python-version (Python)
   - .ruby-version (Ruby)
   - .tool-versions (asdf)
   - rust-toolchain.toml (Rust)

3. **環境変数**
   - .env.example, .env.sample, .env.template
   - README内の環境変数セクション

4. **コンテナ設定**
   - Dockerfile
   - docker-compose.yml, docker-compose.yaml
   - .devcontainer/

5. **起動コマンド**
   - package.json scripts
   - Makefile
   - README内のコマンドセクション

## 解析スクリプト

### detect-environment.sh

プロジェクトの環境設定を検出：

```bash
~/.claude/skills/setting-up-docs/scripts/detect-environment.sh {path}
```

**出力:**

- パッケージマネージャ種類
- 必要なランタイムバージョン
- 環境変数一覧
- 利用可能なスクリプト/コマンド

### extract-env-vars.sh

環境変数を抽出：

```bash
~/.claude/skills/setting-up-docs/scripts/extract-env-vars.sh {path}
```

## テンプレート

`assets/setup-template.md` - 環境構築ガイドのMarkdownテンプレート

## 生成ドキュメント構成

```markdown
# 環境構築ガイド

## 必要条件
- ランタイム・バージョン
- 必要なツール

## インストール手順
1. リポジトリクローン
2. 依存関係インストール
3. 環境変数設定

## 環境変数
| 変数名 | 説明 | 必須 |
|--------|------|------|

## 起動方法
- 開発サーバー起動
- ビルド
- テスト実行

## Docker（オプション）
- コンテナでの起動方法
```

## 使用例

```bash
# コマンドから呼び出し
/docs:setup

# スキル直接参照
「環境構築ガイドを生成して」
```

## 関連

- 兄弟スキル: `docs:architecture`
- コマンド: `/docs:setup`
