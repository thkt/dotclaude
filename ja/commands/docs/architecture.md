---
description: コードベース解析によるアーキテクチャ概要ドキュメントを自動生成
aliases: [arch-docs, architecture-docs]
agents:
  - architecture-analyzer
---

# /docs:architecture - アーキテクチャ概要生成

## 概要

コードベースを解析し、アーキテクチャ概要ドキュメントを自動生成します。

## 使用方法

```bash
# 現在のディレクトリを解析
/docs:architecture

# 特定のディレクトリを解析
/docs:architecture src/

# 出力先を指定
/docs:architecture --output docs/ARCHITECTURE.md
```

## オプション

| オプション | 説明 | デフォルト |
|-----------|------|----------|
| `path` | 解析対象ディレクトリ | カレントディレクトリ |
| `--output` | 出力ファイルパス | `.claude/workspace/docs/architecture.md` |
| `--format` | 出力形式 | `markdown` |

## 生成内容

- **プロジェクト概要と技術スタック**
- **ディレクトリ構造** - treeコマンドによる可視化
- **モジュール関係図** - Mermaid形式
- **主要コンポーネント一覧** - クラス・関数の統計
- **依存関係** - 外部/内部依存関係
- **統計情報** - ファイル数、行数など

## 実行フロー

### フェーズ1: プロジェクト検出

```bash
# パッケージマネージャーと設定ファイルの確認
ls package.json pubspec.yaml Cargo.toml go.mod pyproject.toml 2>/dev/null
```

### フェーズ2: ディレクトリ構造解析

```bash
~/.claude/skills/documenting-architecture/scripts/analyze-structure.sh {path}
```

### フェーズ3: コード構造解析

```bash
~/.claude/skills/documenting-architecture/scripts/extract-modules.sh {path}
```

### フェーズ4: Mermaid図生成

```bash
# モジュール関係図
~/.claude/skills/documenting-architecture/scripts/generate-mermaid.sh {path} module

# 依存関係図
~/.claude/skills/documenting-architecture/scripts/generate-mermaid.sh {path} dependency
```

### フェーズ5: ドキュメント生成

解析結果をテンプレート（`~/.claude/skills/documenting-architecture/assets/architecture-template.md`）に
埋め込み、Markdownドキュメントを生成。

## 出力例

```markdown
# プロジェクト名 - アーキテクチャ概要

## 技術スタック
| カテゴリ | 技術 |
|---------|------|
| 言語 | TypeScript |
| フレームワーク | React |
| ビルドツール | Vite |

## ディレクトリ構造
├── src/
│   ├── components/
│   ├── hooks/
│   └── utils/

## モジュール構造
(Mermaid図)

## 統計情報
- 総ファイル数: 150
- 総行数: 12,000
```

## 必要ツール

| ツール | 用途 | インストール |
|--------|------|------------|
| tree-sitter-analyzer | コード構造解析 | `uv tool install "tree-sitter-analyzer[popular]"` |
| tree | ディレクトリ構造 | `brew install tree` |
| jq | JSON処理 | `brew install jq` |

## エラーハンドリング

| エラー | 対処 |
|-------|------|
| tree-sitter-analyzer未インストール | フォールバック解析を実行 |
| 対象ディレクトリ未検出 | エラーメッセージを表示 |
| 未サポート言語のみ | 統計情報のみ出力 |

## 関連

- **エージェント**: `architecture-analyzer`
