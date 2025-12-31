---
name: creating-hooks
description: >
  Claude Codeで望ましくない動作を防ぐためのカスタムフック作成。
  トリガー: hook, hookify, rule, block, warn, prevent, pattern, detect,
  unwanted behavior, dangerous command, coding standards
allowed-tools: Read, Write, Edit, Glob, Grep
---

# Hookify - カスタムフック作成

## 目的

危険な操作をブロックしたり、潜在的な問題について警告するための宣言的ルールを作成。

## ルールファイル形式

```yaml
---
name: rule-name
enabled: true
event: file|bash|stop|prompt|all
pattern: regex-pattern  # シンプルなルール
action: warn|block
conditions:  # 複雑なルール（オプション）
  - field: file_path|new_text|command|user_prompt
    operator: regex_match|contains|not_contains
    pattern: pattern-to-match
---

パターンがマッチしたときに表示されるメッセージ（**Markdown**サポート）。
```

## イベントタイプ

| イベント | トリガータイミング | ユースケース |
| --- | --- | --- |
| `file` | Edit/Write | コードパターン、デバッグコード |
| `bash` | Bashコマンド | 危険なコマンド |
| `stop` | Claudeが停止 | 完了前にテスト必須 |
| `prompt` | ユーザーメッセージ | 入力検証 |

## アクション

| アクション | 動作 | 終了コード |
| --- | --- | --- |
| `warn` | メッセージを表示、続行 | 0 |
| `block` | メッセージを表示、停止 | 2 |

## フィールドリファレンス

| イベント | フィールド |
| --- | --- |
| file | `file_path`, `new_text`, `old_text`, `content` |
| bash | `command` |
| prompt | `user_prompt` |
| stop | `transcript` |

## 一般的なパターン

| パターン | マッチ対象 |
| --- | --- |
| `rm\s+-rf` | rm -rfコマンド |
| `console\.log\(` | console.log文 |
| `\.env$` | .envファイル |
| `chmod\s+777` | chmod 777 |

## ルール管理

| 場所 | スコープ |
| --- | --- |
| `.claude/hookify.*.local.md` | プロジェクト |
| `~/.claude/hookify.*.local.md` | グローバル |

**コマンド**: `/hookify [desc]`, `/hookify:list`, `/hookify:configure`

## ベストプラクティス

`warn`から始めて、必要に応じて`block`にアップグレード。誤検知を避けるために具体的なパターンを使用。

## 参照

- コマンド: `/hookify`, `/hookify:list`, `/hookify:configure`
- 関連: `reviewing-security`（危険なパターンを検出）
