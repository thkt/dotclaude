---
name: documenting-architecture
description: >
  コードベース分析からアーキテクチャ概要ドキュメントを生成。
  精密なコード構造抽出にtree-sitter-analyzerを使用。
  トリガー: architecture overview, project structure, module diagram.
allowed-tools: [Read, Write, Grep, Glob, Bash, Task]
context: fork
user-invocable: false
---

# アーキテクチャ概要生成

コードベース分析からアーキテクチャドキュメントを自動生成。

## 検出項目

| カテゴリ           | 対象                             |
| ------------------ | -------------------------------- |
| プロジェクト概要   | 技術スタック、フレームワーク、DB |
| ディレクトリ構造   | treeコマンド出力                 |
| モジュール構成     | Mermaid関係図                    |
| 主要コンポーネント | クラス、関数、エントリポイント   |
| 依存関係           | 外部パッケージ、内部モジュール   |
| 統計               | ファイル数、行数、言語比率       |

## 検出パターン

| プロジェクトタイプ | パターン                                    |
| ------------------ | ------------------------------------------- |
| Node.js            | `package.json`, `node_modules/`             |
| Python             | `pyproject.toml`, `setup.py`, `__init__.py` |
| Rust               | `Cargo.toml`, `src/main.rs`, `src/lib.rs`   |
| Go                 | `go.mod`, `main.go`, `go.sum`               |
| Java/Maven         | `pom.xml`, `src/main/java/`                 |
| Java/Gradle        | `build.gradle`, `src/main/java/`            |

## 品質基準

| 基準                                | 目標 |
| ----------------------------------- | ---- |
| 新メンバーが5分以内に構造を理解可能 | ✓    |
| モジュール関係が可視化されている    | ✓    |
| エントリポイントが明確に識別される  | ✓    |
| 技術スタックの選定理由が文書化      | ✓    |
