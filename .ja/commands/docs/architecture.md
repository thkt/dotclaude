---
description: コードベース分析からアーキテクチャ概要ドキュメントを生成
aliases: [arch-docs, architecture-docs]
agents:
  - architecture-analyzer
---

# /docs:architecture - アーキテクチャ概要生成

## 概要

コードベースを分析し、アーキテクチャ概要ドキュメントを自動生成。

## 使用方法

```bash
# カレントディレクトリを分析
/docs:architecture

# 特定ディレクトリを分析
/docs:architecture src/

# 出力先を指定
/docs:architecture --output docs/ARCHITECTURE.md
```

## オプション

| オプション | 説明 | デフォルト |
| --- | --- | --- |
| `path` | 分析対象ディレクトリ | カレントディレクトリ |
| `--output` | 出力ファイルパス | `.claude/workspace/docs/architecture.md` |
| `--format` | 出力形式 | `markdown` |

## 生成コンテンツ

- **プロジェクト概要 & 技術スタック**
- **ディレクトリ構造** - treeコマンドによる可視化
- **モジュール関係図** - Mermaid形式
- **主要コンポーネント一覧** - クラスと関数の統計
- **依存関係** - 外部/内部依存関係
- **統計** - ファイル数、行数等

## 実行フロー

### フェーズ1: プロジェクト検出

```bash
# パッケージマネージャーと設定ファイルを確認
ls package.json pubspec.yaml Cargo.toml go.mod pyproject.toml 2>/dev/null
```

### フェーズ2: ディレクトリ構造分析

```bash
~/.claude/skills/documenting-architecture/scripts/analyze-structure.sh {path}
```

### フェーズ3: コード構造分析

```bash
~/.claude/skills/documenting-architecture/scripts/extract-modules.sh {path}
```

### フェーズ4: Mermaidダイアグラム生成

```bash
# モジュール関係図
~/.claude/skills/documenting-architecture/scripts/generate-mermaid.sh {path} module

# 依存関係図
~/.claude/skills/documenting-architecture/scripts/generate-mermaid.sh {path} dependency
```

### フェーズ5: ドキュメント生成

分析結果をテンプレート（`~/.claude/skills/documenting-architecture/assets/architecture-template.md`）に埋め込み、Markdownドキュメントを生成。

### フェーズ6: Markdownバリデーション

```bash
~/.claude/skills/scripts/validate-markdown.sh {output-file}
```

生成されたMarkdownのフォーマット問題を検証。ブロッキングなし（警告のみ）。

## 出力例

```markdown
# プロジェクト名 - アーキテクチャ概要

## 技術スタック
| カテゴリ | 技術 |
|----------|------------|
| 言語 | TypeScript |
| フレームワーク | React |
| ビルドツール | Vite |

## ディレクトリ構造
├── src/
│   ├── components/
│   ├── hooks/
│   └── utils/

## モジュール構造
（Mermaidダイアグラム）

## 統計
- 総ファイル数: 150
- 総行数: 12,000
```

## 必要なツール

| ツール | 用途 | インストール |
| --- | --- | --- |
| tree-sitter-analyzer | コード構造分析 | `uv tool install "tree-sitter-analyzer[popular]"` |
| tree | ディレクトリ構造 | `brew install tree` |
| jq | JSON処理 | `brew install jq` |

## エラーハンドリング

| エラー | アクション |
| --- | --- |
| tree-sitter-analyzer未インストール | フォールバック分析を実行 |
| 対象ディレクトリが見つからない | エラーメッセージを表示 |
| サポート外の言語のみ | 統計のみ出力 |

## 関連

- **エージェント**: `architecture-analyzer`
