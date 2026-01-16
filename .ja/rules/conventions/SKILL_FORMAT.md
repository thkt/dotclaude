# スキルフォーマットガイド

Claude Codeスキルの公式フォーマット。<https://code.claude.com/docs/en/skills> に基づく

## 必須フィールド

```yaml
---
name: skill-name # 小文字、ハイフン、最大64文字
description: > # 最大1024文字、トリガー含む
  トリガーキーワード付きの簡潔な概要。
  Triggers: "keyword1", "keyword2", "キーワード".
allowed-tools: # 任意だが推奨
  - Read
  - Write
  - Grep
---
```

## 命名規則

**動名詞形を使用** (verb-ing):

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

**プログレッシブロード**: ClaudeはまずSKILL.mdを読み、参照は必要時のみ。

## 説明の要件

1. **三人称のみ**: 「ファイルを処理します」ではなく「ファイルを処理する」
2. **トリガー含む**: EN/JPのキーワードを列挙
3. **最大1024文字**

## 非公式フィールド（使用禁止）

無視されるフィールド: `version`, `author`, `triggers`, `sections`, `patterns`, `tokens`

## 検証チェックリスト

### YAMLフロントマター

- [ ] `name`: 小文字ハイフン、64文字以下
- [ ] `description`: 1024文字以下、トリガー含む
- [ ] `allowed-tools`: 指定済み
- [ ] 非公式フィールドなし

### コンテンツ

- [ ] 明確で狭いフォーカス
- [ ] ステップバイステップの手順
- [ ] 例を含む

### バイリンガル（該当する場合）

- [ ] JP版が`.ja/skills/`に存在
- [ ] EN版と構造が一致
- [ ] トリガーキーワードが翻訳済み

## 関連

- [公式スキルガイド](https://code.claude.com/docs/en/skills)
