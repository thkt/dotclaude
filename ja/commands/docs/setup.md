---
description: コードベース解析による環境構築ガイドを自動生成
aliases: [setup-docs, env-setup]
---

# /docs:setup - 環境構築ガイド生成

## 概要

コードベースを解析し、環境構築ガイドドキュメントを自動生成します。

## 使用方法

```bash
# 現在のディレクトリを解析
/docs:setup

# 特定のディレクトリを解析
/docs:setup src/

# 出力先を指定
/docs:setup --output docs/SETUP.md
```

## オプション

| オプション | 説明 | デフォルト |
| --- | --- | --- |
| `path` | 解析対象ディレクトリ | カレントディレクトリ |
| `--output` | 出力ファイルパス | `.claude/workspace/docs/setup-guide.md` |
| `--format` | 出力形式 | `markdown` |

## 生成内容

- **必要条件** - ランタイムバージョン、必要ツール
- **インストール手順** - 依存関係インストール手順
- **環境変数** - 必要な環境変数一覧と説明
- **起動コマンド** - 開発サーバー起動、ビルド、テストコマンド
- **Docker設定** - コンテナ起動方法（存在する場合）

## 検出項目

### パッケージマネージャー

| ファイル | 検出内容 |
| --- | --- |
| package.json | Node.js (npm/yarn/pnpm/bun) |
| pyproject.toml | Python (uv/poetry/pip) |
| requirements.txt | Python (pip) |
| Cargo.toml | Rust (cargo) |
| go.mod | Go |
| pubspec.yaml | Flutter/Dart |
| Gemfile | Ruby (bundler) |
| pom.xml | Java (Maven) |
| build.gradle | Java/Kotlin (Gradle) |

### バージョン指定ファイル

| ファイル | 検出内容 |
| --- | --- |
| .nvmrc, .node-version | Node.jsバージョン |
| .python-version | Pythonバージョン |
| .ruby-version | Rubyバージョン |
| .tool-versions | asdf管理バージョン |
| rust-toolchain.toml | Rustツールチェーン |

### 環境変数

| ファイル | 検出内容 |
| --- | --- |
| .env.example | 環境変数テンプレート |
| .env.sample | 環境変数サンプル |
| .env.template | 環境変数テンプレート |

### コンテナ設定

| ファイル | 検出内容 |
| --- | --- |
| Dockerfile | Dockerイメージ設定 |
| docker-compose.yml | マルチコンテナセットアップ |
| .devcontainer/ | Dev Container設定 |

## 実行フロー

### フェーズ1: 環境検出

```bash
~/.claude/skills/setting-up-docs/scripts/detect-environment.sh {path}
```

### フェーズ2: ドキュメント生成

検出結果をテンプレート（`~/.claude/skills/setting-up-docs/assets/setup-template.md`）に
埋め込み、Markdownドキュメントを生成。

### フェーズ3: Markdown検証

```bash
~/.claude/skills/scripts/validate-markdown.sh {output-file}
```

生成されたMarkdownのフォーマット問題を検証。非ブロッキング（警告のみ）。

## 出力例

```markdown
# プロジェクト名 - 環境構築ガイド

## 必要条件

### ランタイム
- Node.js v20.x
- npm v10.x

### 必要ツール
- Git
- Docker（オプション）

## クイックスタート

\`\`\`bash
git clone https://github.com/user/project
cd project
npm install
cp .env.example .env
npm run dev
\`\`\`

## 環境変数

| 変数名 | デフォルト値 | 説明 |
| --- | --- | --- |
| DATABASE_URL | - | データベース接続URL |
| API_KEY | - | API認証キー |
```

## エラーハンドリング

| エラー | 対処 |
| --- | --- |
| 設定ファイル未検出 | 汎用テンプレートを使用 |
| 環境変数ファイルなし | 警告を表示して続行 |
| jq/yq未インストール | 一部機能をスキップ |

## 関連

- **兄弟コマンド**: `/docs:architecture`
