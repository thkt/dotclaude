---
name: yomu-search
description: yomu CLI経由のセマンティックコード検索（概念・識別子・関連）。TS/JSX/CSS/HTML/Rust/Markdown対応。Use when: concept search, identifier lookup, related code, 意味検索, 概念検索, hooks that do Y, where does X happen, unknown identifier.
allowed-tools: [Bash, Read]
user-invocable: false
---

# yomu-search

## コマンド

| 目的                   | コマンド                       |
| ---------------------- | ------------------------------ |
| セマンティック検索     | `yomu search "query"`          |
| JSON出力               | `yomu search "query" --json`   |
| 影響分析               | `yomu impact <file-or-symbol>` |
| インデックス状態       | `yomu status`                  |

## 使い分け

| yomu-search                                | Grep / Glob                             |
| ------------------------------------------ | --------------------------------------- |
| 概念: 「form validation」「auth flow」      | リテラル文字列・正規表現                |
| 関連: 「Yをするhooks」                      | 既知のパス: `src/components/Button.tsx` |
| 未知の識別子: 「Xが起きてる場所」           | ファイルglob: `**/*.tsx`                |
| TS/JSX/CSS/HTML/Rust/Markdown               | Swift / Python / Go / その他            |

## 前提

`yomu status` で index 有無確認。無ければ `yomu rebuild` 後に `yomu index`。
