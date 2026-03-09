---
paths:
  - ".claude/skills/**"
---

# モジュール化ルール

スキルファイルの作成ルール。ファイル構造と責任分離の開発者ガイド。

## スキルタイプ

| 種類            | 配置場所                    | 目的                     | 呼び出し方法                                         |
| --------------- | --------------------------- | ------------------------ | ---------------------------------------------------- |
| User-invocable  | `skills/name/SKILL.md`      | ユーザー向けワークフロー | `/skill-name`（短い名前）                            |
| Context-trigger | `skills/verb-noun/SKILL.md` | 知識ベース + 参照        | コンテキストで自動ロードまたは `skill-name` トリガー |

## ルール

| ルール               | ガイドライン                                  |
| -------------------- | --------------------------------------------- |
| ミラーの法則         | 責任 ≤7（8-9: 警告、>9: 分割必須）            |
| 薄いラッパーパターン | 調整のみ、実装詳細を含まない                  |
| 統合スキル           | すべて skills/ に統合（Agentsは分析用に別途） |
| サイズ制限           | ≤100行（101-200: 警告、>200: 分割必須）       |

## 適用タイミング

| 条件                       | アクション               |
| -------------------------- | ------------------------ |
| スキルファイル > 100行     | モジュール化を検討       |
| 責任 > 7                   | モジュール化必須         |
| マルチフェーズワークフロー | 各フェーズのスキルを参照 |
| 再利用可能な知識           | skills/ に抽出           |

## 構造

```text
skills/
├── lib/              # 共有 @-include フラグメント
├── [short-name]/     # user-invocable: true (例: commit, fix, audit)
│   └── SKILL.md
└── [verb-noun]/      # user-invocable: false (例: reviewing-type-safety)
    ├── SKILL.md
    └── references/
        ├── [workflow].md
        └── [topic].md
```

## 命名規則

| `user-invocable` | 命名スタイル | 例                                                 |
| ---------------- | ------------ | -------------------------------------------------- |
| `true`           | 短い名前     | `commit`, `fix`, `audit`                           |
| `false`          | `動詞-名詞`  | `reviewing-type-safety`, `orchestrating-workflows` |

## 例

### Good: 薄いラッパー (~80行)

```markdown
# /code

RGRCサイクルによるTDD実装。

## フェーズ参照

- [@../skills/generating-tdd-tests/SKILL.md]
- [@../skills/orchestrating-workflows/references/code-workflow.md]
```

良い理由: フェーズを調整し、詳細をスキルに委譲。

### Bad: モノリシック (900行)

```markdown
# /code

## 完全なTDD説明をここに

## 完全なRGRCサイクルをここに

## 完全なテストパターンをここに
```

悪い理由: ミラーの法則違反、DRY違反、保守困難。
