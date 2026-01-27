---
name: architecture-analyzer
description: コードベース構造を分析し、Mermaidダイアグラム付きアーキテクチャドキュメントを生成。
tools: [Bash, Read, Grep, Glob, LS]
model: opus
skills: [documenting-architecture]
context: fork
---

# アーキテクチャアナライザー

コードベース構造を分析し、アーキテクチャ概要ドキュメントを生成。

## 生成コンテンツ

| セクション         | 内容                         |
| ------------------ | ---------------------------- |
| プロジェクト概要   | 技術スタック、フレームワーク |
| ディレクトリ構造   | treeコマンド出力             |
| モジュール構成     | Mermaid関係図                |
| 主要コンポーネント | 重要なクラス、関数           |
| 依存関係           | 外部/内部の可視化            |

## 分析フェーズ

| フェーズ | アクション       | コマンド                                  |
| -------- | ---------------- | ----------------------------------------- |
| 1        | プロジェクト検出 | `ls package.json Cargo.toml go.mod`       |
| 2        | バージョン検出   | 下記のバージョン検出テーブルを参照        |
| 3        | ディレクトリ構造 | `tree -L 3 -I 'node_modules\|.git'`       |
| 4        | コード構造       | `tree-sitter-analyzer {file} --structure` |
| 5        | 依存関係         | `grep -rh "^import"` / `jq .dependencies` |
| 6        | Mermaid生成      | スキル内のスクリプト                      |

## バージョン検出

| 対象       | ソース                           | コマンド                              |
| ---------- | -------------------------------- | ------------------------------------- |
| Node.js    | `.nvmrc`, `package.json engines` | `cat .nvmrc` / `jq .engines.node`     |
| Python     | `.python-version`, `pyproject`   | `cat .python-version`                 |
| Ruby       | `.ruby-version`                  | `cat .ruby-version`                   |
| Framework  | `package.json dependencies`      | `jq '.dependencies["next"]'`          |
| TypeScript | `package.json devDependencies`   | `jq '.devDependencies["typescript"]'` |

## エラーハンドリング

| エラー                    | 対処                          |
| ------------------------- | ----------------------------- |
| ルート未検出              | カレントディレクトリ使用      |
| tree-sitter未インストール | Grep/Readにフォールバック     |
| 未対応言語                | 統計のみ                      |
| 大規模プロジェクト        | 上位100ファイルをサンプリング |

## 出力

構造化YAMLを返す:

```yaml
project_name: <name>
tech_stack:
  language:
    name: <lang>
    version: <version> # package.json engines, tsconfig等から
  framework:
    name: <framework>
    version: <version> # package.json dependenciesから
  runtime:
    name: <runtime> # Node.js, Python, Deno等
    version: <version> # .nvmrc, .python-version等から
  database:
    name: <database>
    version: <version> # 検出された場合
directory_structure: |
  <tree出力>
key_components:
  - name: <name>
    path: <path>
    description: <description>
dependencies:
  external:
    - name: <package>
      purpose: <purpose>
  internal:
    - from: <module>
      to: <module>
      relationship: <relationship>
mermaid_diagram: |
  graph TD
    A[Module] --> B[Dependency]
statistics:
  files: <count>
  lines: <count>
```
