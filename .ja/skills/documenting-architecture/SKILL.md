---
name: documenting-architecture
description: >
  コードベース分析からアーキテクチャ概要ドキュメントを生成。
  精密なコード構造抽出にtree-sitter-analyzerを使用。
  ビジュアル表現にMermaidダイアグラムを生成。
  トリガー: architecture overview, project structure, module diagram,
  dependency graph, code structure, directory structure.
allowed-tools: Read, Write, Grep, Glob, Bash, Task
---

# docs:architecture - アーキテクチャ概要生成

コードベース分析からアーキテクチャドキュメントを自動生成。

## 生成コンテンツ

| セクション | 説明 |
| --- | --- |
| プロジェクト概要 | 技術スタック、フレームワーク検出 |
| ディレクトリ構造 | treeコマンド出力 |
| モジュール構成 | Mermaid関係図 |
| 主要コンポーネント | クラス、関数と統計 |
| 依存関係 | 外部/内部の可視化 |
| 統計 | ファイル数、行数等 |

## 処理フロー

| フェーズ | アクション |
| --- | --- |
| 1. 初期化 | ルート特定、言語/フレームワーク検出 |
| 2. 構造 | treeコマンド、ディレクトリ分類 |
| 3. コード | tree-sitter-analyzer: クラス、関数、インポート |
| 4. 依存関係 | インポート解析、関係マッピング |
| 5. 生成 | Mermaidダイアグラム、テンプレート埋め込み |

## 分析コマンド

```bash
# ディレクトリ構造
tree -L 3 -I 'node_modules|.git|dist|build|__pycache__|.venv' --dirsfirst

# コード構造（ファイルごと）
tree-sitter-analyzer {file} --structure --output-format json

# 依存関係 - TypeScript/JavaScript
grep -r "^import\|^export" --include="*.ts" --include="*.tsx"

# 依存関係 - Python
grep -r "^import\|^from.*import" --include="*.py"
```

## エラーハンドリング

| エラー | 解決策 |
| --- | --- |
| ルート未検出 | カレントディレクトリを使用 |
| tree-sitter利用不可 | Grep/Readにフォールバック |
| 大規模プロジェクト | 上位100ファイルをサンプリング |

## Markdownバリデーション

生成後、出力を検証:

```bash
~/.claude/skills/scripts/validate-markdown.sh {output-file}
```

ブロッキングなし（警告のみ） - スタイル問題はドキュメント作成をブロックしない。

## 参照

- [@../../../agents/analyzers/architecture-analyzer.md] - architecture-analyzerエージェント
- コマンド: `/docs:architecture`
