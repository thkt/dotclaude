---
name: documenting-architecture
description: >
  コードベース分析からアーキテクチャ概要ドキュメントを生成。
  tree-sitter-analyzerで正確なコード構造を抽出する。
  プロジェクト構造のドキュメント化、アーキテクチャ図の作成、または
  architecture overview, project structure, アーキテクチャ, 構成図 に言及した時に使用。
allowed-tools: [Read, Write, Grep, Glob, Bash, Task]
context: fork
user-invocable: false
---

# アーキテクチャ概要生成

## 検出

| カテゴリ           | 対象                                       |
| ------------------ | ------------------------------------------ |
| プロジェクト概要   | 技術スタック、フレームワーク、データベース |
| ディレクトリ構造   | treeコマンド出力                           |
| モジュール構成     | Mermaid関連図                              |
| 主要コンポーネント | クラス、関数、エントリーポイント           |
| 依存関係           | 外部パッケージ、内部モジュール             |
| 統計               | ファイル数、行数、言語比率                 |

## プロジェクトパターン

| タイプ      | パターン                                    |
| ----------- | ------------------------------------------- |
| Node.js     | `package.json`, `node_modules/`             |
| Python      | `pyproject.toml`, `setup.py`, `__init__.py` |
| Rust        | `Cargo.toml`, `src/main.rs`, `src/lib.rs`   |
| Go          | `go.mod`, `main.go`, `go.sum`               |
| Java/Maven  | `pom.xml`, `src/main/java/`                 |
| Java/Gradle | `build.gradle`, `src/main/java/`            |
