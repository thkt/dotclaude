---
paths:
  - ".claude/skills/**"
---

# スキル規約

`.claude/skills/` 配下のスキルファイルの規約。

## YAMLフロントマター

```yaml
---
name: skill-name               # 小文字-ハイフン、≤64文字
description: >                 # ≤1024文字、"Use when" パターン必須
  機能の簡潔な概要。Use when [scenario] or when user mentions keyword1, キーワード.
allowed-tools: [Read, Write]   # 推奨
agent: agent-name              # 任意: agents/ にリンク
context: fork                  # 任意: fork = サブエージェント, inline = 本体
user-invocable: false          # 任意: デフォルト false
---
```

## 説明

| ルール     | 要件                      |
| ---------- | ------------------------- |
| 人称       | 三人称のみ                |
| 形式       | "Use when" パターンを含む |
| キーワード | EN/JP トリガーを含む      |

## 命名

動名詞形 (verb-ing) を使う。

| パターン | 例                                      |
| -------- | --------------------------------------- |
| 良い     | `creating-adrs`, `reviewing-security`   |
| 避ける   | `helper`, `utils`, `tools` (曖昧すぎる) |

## ディレクトリ構造

```text
skill-name/
├── SKILL.md (必須)
└── references/ (任意)
    └── detailed-guide.md
```

Claude はまず SKILL.md を読み、references は必要時のみ読む。

## サイズ制限

| ルール        | 閾値      | アクション         |
| ------------- | --------- | ------------------ |
| SKILL.md 本文 | 500行     | 参照ファイルに分割 |
| 参照ファイル  | 100行以上 | 先頭に TOC 追加    |
