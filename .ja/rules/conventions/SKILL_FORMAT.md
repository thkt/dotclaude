---
paths:
  - ".claude/skills/**"
---

# スキルフォーマットガイド

Claude Codeスキルの公式フォーマット。<https://code.claude.com/docs/en/skills> に基づく

## YAMLフロントマター

```yaml
---
name: skill-name # 小文字、ハイフン、最大64文字
description: > # 最大1024文字、"Use when"パターン
  機能の簡潔な概要。
  Use when [scenario] or when user mentions keyword1, keyword2, キーワード.
allowed-tools: # 推奨 - "tool not allowed"エラー防止
  - Read
  - Write
  - Grep
agent: agent-name # 任意: agents/の対応エージェントにリンク
context: fork # 任意: サブエージェントコンテキストで実行
user-invocable: false # 任意: デフォルトfalse
---
```

## スキル vs エージェントのフィールド

| フィールド       | スキル                 | エージェント | 備考                                   |
| ---------------- | ---------------------- | ------------ | -------------------------------------- |
| `name`           | ✓ 必須                 | ✓ 必須       | 識別子                                 |
| `description`    | ✓ 必須                 | ✓ 必須       | 目的、"Use when"パターン               |
| `allowed-tools`  | 推奨                   | -            | スキルのツール権限                     |
| `tools`          | -                      | ✓ 必須       | エージェントのツール権限               |
| `agent`          | 任意                   | -            | スキルをエージェントにリンク           |
| `context`        | 任意                   | 任意         | fork = サブエージェント, inline = 本体 |
| `user-invocable` | 任意 (デフォルトfalse) | -            | ユーザーによる直接起動を許可           |
| `model`          | -                      | 任意         | LLM選択                                |

## 命名規則

動名詞形を使用 (verb-ing):

| パターン | 例                                                              |
| -------- | --------------------------------------------------------------- |
| 良い     | `creating-adrs`, `optimizing-performance`, `reviewing-security` |
| 避ける   | `helper`, `utils`, `tools` (曖昧すぎる)                         |

## ディレクトリ構造

```text
skill-name/
├── SKILL.md (必須)
└── references/ (任意)
    └── detailed-guide.md
```

プログレッシブロード: ClaudeはまずSKILL.mdを読み、参照は必要時のみ。

## 説明の要件

| ルール       | 要件                   | 例                                                                         |
| ------------ | ---------------------- | -------------------------------------------------------------------------- |
| 人称         | 三人称のみ             | 「処理します」ではなく「処理する」                                         |
| フォーマット | "Use when"パターン使用 | `Use when reviewing code for issues or when user mentions security, OWASP` |
| キーワード   | EN/JPトリガーを含む    | `Use when ... or when user mentions security, セキュリティ`                |
| 長さ         | 最大1024文字           | -                                                                          |

## 検証

| チェック           | 基準                                            |
| ------------------ | ----------------------------------------------- |
| YAMLフロントマター | name ≤64文字, description ≤1024文字, "Use when" |
| コンテンツ         | 狭いスコープ、ステップバイステップ、例          |
| バイリンガル構造   | `.ja/skills/`がEN構造と一致                     |

## 参照深度（スキルのみ）

SKILL.mdからの参照は1レベルに保ち、部分読み取りを避ける。

| パターン | 例                                  | 状態 |
| -------- | ----------------------------------- | ---- |
| 良い     | SKILL.md → reference.md             | ✓    |
| 悪い     | SKILL.md → advanced.md → details.md | ✗    |

理由: Claudeは深くネストされたファイルに `head -100` を使用する可能性があり、不完全な情報になる。

## コンテンツサイズガイドライン

| ルール       | 閾値      | アクション         |
| ------------ | --------- | ------------------ |
| SKILL.md本文 | 500行     | 参照ファイルに分割 |
| 参照ファイル | 100行以上 | 先頭にTOCを追加    |

長いファイルのTOC例:

```markdown
## 目次

- セクション1
- セクション2
- セクション3
```
