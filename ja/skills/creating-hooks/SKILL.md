---
name: creating-hooks
description: >
  Claude Codeで不要な動作を防止するカスタムフック作成。
  トリガー: hook, hookify, ルール, ブロック, 警告, 防止, パターン, 検出,
  不要な動作, 危険なコマンド, コーディング規約
allowed-tools: Read, Write, Edit, Glob, Grep
---

# Hookify - カスタムフック作成

## 目的

危険な操作をブロックしたり、潜在的な問題について警告する宣言的ルールを作成。

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

パターンにマッチした時に表示されるメッセージ（**Markdown**対応）。
```

## イベントタイプ

| イベント | トリガー条件 | ユースケース |
| --- | --- | --- |
| `file` | Edit/Write | コードパターン、デバッグコード |
| `bash` | Bashコマンド | 危険なコマンド |
| `stop` | Claude停止時 | 完了前にテスト必須 |
| `prompt` | ユーザーメッセージ | 入力検証 |

## アクション

| アクション | 動作 | 終了コード |
| --- | --- | --- |
| `warn` | メッセージ表示、続行 | 0 |
| `block` | メッセージ表示、停止 | 2 |

## フィールドリファレンス

| イベント | フィールド |
| --- | --- |
| file | `file_path`, `new_text`, `old_text`, `content` |
| bash | `command` |
| prompt | `user_prompt` |
| stop | `transcript` |

## よく使うパターン

| パターン | マッチ対象 |
| --- | --- |
| `rm\s+-rf` | rm -rf コマンド |
| `console\.log\(` | console.log 文 |
| `\.env$` | .env ファイル |
| `chmod\s+777` | chmod 777 |

## ルール管理

| 場所 | スコープ |
| --- | --- |
| `.claude/hookify.*.local.md` | プロジェクト |
| `~/.claude/hookify.*.local.md` | グローバル |

**コマンド**: `/hookify [説明]`, `/hookify:list`, `/hookify:configure`

## ベストプラクティス

まず `warn` で開始し、必要に応じて `block` にアップグレード。誤検知を避けるため具体的なパターンを使用。

## 参照

- コマンド: `/hookify`, `/hookify:list`, `/hookify:configure`
- 関連: `reviewing-security`（危険なパターンの検出）
