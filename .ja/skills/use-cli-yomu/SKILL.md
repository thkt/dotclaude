---
name: use-cli-yomu
description: yomu CLI 経由で TS/JSX/CSS/HTML/Rust/Markdown のセマンティック コード検索 (概念 / 識別子 / 関連コード) を行う。
when_to_use: concept search, identifier lookup, related code, 意味検索, 概念検索, hooks that do Y, where does X happen, unknown identifier
allowed-tools: Bash Read
user-invocable: false
---

# use-cli-yomu

## コマンド

| 目的                    | コマンド                                                    |
| ----------------------- | ----------------------------------------------------------- |
| セマンティック検索      | `yomu search "query"`                                       |
| JSON 出力               | `yomu search "query" --json`                                |
| 件数制限 / オフセット   | `yomu search "query" --limit N --offset M`                  |
| パスフィルタ            | `yomu search "query" --path <prefix>` (繰り返し可)          |
| 類似検索                | `yomu search --from <file>` または `--from <file>:<symbol>` |
| 影響範囲 (file)         | `yomu impact <file>` (プロジェクトルートからの相対)         |
| 影響範囲 (symbol)       | `yomu impact <file> --symbol <name>`                        |
| 影響範囲 (semantic)     | `yomu impact <file> --semantic`                             |
| インデックス状態        | `yomu status`                                               |
| 増分インデックス        | `yomu index`                                                |
| 完全リビルド            | `yomu rebuild`                                              |
| 未 embed 分の embedding | `yomu embed` (セマンティック検索に必要)                     |

## 使用判断

| use-cli-yomu                         | Grep / Glob                           |
| ------------------------------------ | ------------------------------------- |
| 概念: "form validation", "auth flow" | リテラル文字列または regex            |
| 関連: "hooks that do Y"              | 既知パス: `src/components/Button.tsx` |
| 未知の識別子: "where does X happen"  | ファイル glob: `**/*.tsx`             |
| TS/JSX/CSS/HTML/Rust/Markdown        | Swift / Python / Go / その他          |

## 前提

最初に `yomu status` を実行する。

| 状態                    | アクション                   |
| ----------------------- | ---------------------------- |
| インデックスなし        | `yomu rebuild`, `yomu embed` |
| 未 embed のチャンクあり | `yomu embed`                 |
| 編集後に古い            | `yomu index`, `yomu embed`   |
