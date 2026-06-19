---
name: use-cli-codegraph
description: codegraph CLI 経由でシンボル単位のコード構造を照会する。呼び出し元、呼び出し先、変更影響、シンボルのソース追跡。
when_to_use: who calls this, what breaks if I change X, impact analysis, callers, callees, call graph, symbol definition, code structure navigation, 影響範囲, 呼び出し元, 呼び出し先, 構造把握, 変更波及, dependency trace, 誰が呼んでいる
allowed-tools: Bash Read
user-invocable: false
---

# use-cli-codegraph

## コマンド

オプション、出力形式、exit code は `codegraph <subcommand> --help` を参照する。インストール済みバージョンの正典は help 出力。

| 目的                               | コマンド                        |
| ---------------------------------- | ------------------------------- |
| 変更影響 (何が壊れるか)            | `codegraph impact <symbol>`     |
| 呼び出し元                         | `codegraph callers <symbol>`    |
| 呼び出し先                         | `codegraph callees <symbol>`    |
| シンボルのソース + 呼び出し追跡    | `codegraph node <name>`         |
| 領域探索 (ソース + call path 一括) | `codegraph explore <query...>`  |
| シンボル検索                       | `codegraph query <search>`      |
| 変更が波及するテスト               | `codegraph affected [files...]` |
| index 状態                         | `codegraph status`              |

## 使いどころ

構造クエリ限定。誰が呼ぶ・何が壊れるといった symbol 単位の構造質問だけ codegraph に回し、自由文の内容検索は Grep / Explore のまま使う。

| 質問                                  | ツール                                    |
| ------------------------------------- | ----------------------------------------- |
| X を変えたら何が壊れる / X を誰が呼ぶ | codegraph (Grep は構造を辿れない)         |
| シンボル定義 + caller/callee 追跡     | codegraph node / explore                  |
| 変更ファイルに波及するテスト          | codegraph affected                        |
| 自由文・文字列の内容検索              | Grep / Explore (codegraph は symbol 単位) |
| `.codegraph` index がないリポ         | Grep / Explore、または init を促す        |

## 前提

| 項目   | 内容                                                                                                                         |
| ------ | ---------------------------------------------------------------------------------------------------------------------------- |
| index  | `.codegraph/` が必要。リポごとに `codegraph init` を一度実行。未作成なら init するか確認して止まり、勝手に作らない           |
| 鮮度   | `codegraph status` で up to date を確認。大きな変更後は `codegraph sync`。watcher 常駐時は自動追従                           |
| binary | bun global (`~/.config/bun/bin/codegraph`)。install / upgrade で EPERM が出たら `npm_config_cache=$TMPDIR/cg` を前置して回避 |
