---
paths:
  - ".claude/skills/**"
---

# Modularization

## Skill 種別

| 種別              | 配置                        | 用途                          | 起動方法                                     |
| ----------------- | --------------------------- | ----------------------------- | -------------------------------------------- |
| User-invocable    | `skills/name/SKILL.md`      | ユーザー向けワークフロー      | `/skill-name` (短縮名)                       |
| Context-triggered | `skills/verb-noun/SKILL.md` | ナレッジベース + リファレンス | コンテキストまたは `skill-name` で自動ロード |

## ルール

| ルール               | ガイドライン                                  |
| -------------------- | --------------------------------------------- |
| Miller's Law         | 責務 ≤7 (8-9: 警告、>9: 分割)                |
| Thin Wrapper Pattern | オーケストレーションのみ。実装詳細は持たない  |
| 統一 Skills          | すべて skills/ に置く (Agents は分析用に分離) |
| サイズ制限           | ≤100 行 (101-200: 警告、>200: 分割)          |

## 適用条件

| 条件                     | アクション                     |
| ------------------------ | ------------------------------ |
| Skill ファイル > 100 行  | モジュール化を検討             |
| 責務 > 7                 | 必ずモジュール化               |
| 多段フェーズワークフロー | 各フェーズのリファレンス skill |
| 再利用可能な知識         | skills/ に抽出                 |

## 構造

```text
skills/
├── _lib/             # 共有 @-include フラグメント (例: sow-resolution.md)
├── [short-name]/     # user-invocable: true (例: commit, fix, audit)
│   └── SKILL.md
├── use-cli-[name]/      # user-invocable: false, CLI ラッパー (例: use-cli-yomu)
├── use-context-[name]/  # user-invocable: false, agent 専用 (例: use-context-reviewer-security)
└── use-workflow-[name]/ # user-invocable: false, workflow (例: use-workflow-code)
    ├── SKILL.md
    └── references/
        ├── [workflow].md
        └── [topic].md
```

## 命名規約

| `user-invocable` | バインド   | 命名スタイル          | 例                                                  |
| ---------------- | ---------- | --------------------- | --------------------------------------------------- |
| `true`           | -          | 短縮名                | `commit`, `fix`, `audit`                            |
| `false`          | CLI ラップ | `use-cli-<name>`      | `use-cli-yomu`, `use-cli-recall`                    |
| `false`          | Agent 専用 | `use-context-<name>`  | `use-context-reviewer-security`                     |
| `false`          | Workflow   | `use-workflow-<name>` | `use-workflow-code`, `use-workflow-spec-validation` |

## 参照パターン

Skill は以下の方法で他の skill を参照する。

| パターン    | 構文                              | ユースケース                          |
| ----------- | --------------------------------- | ------------------------------------- |
| @import     | `[@../name/references/file.md]`   | 内容のインライン化 (テンプレ、データ) |
| Cross-skill | `[@../_lib/file.md]`              | skills/_lib からの共有フラグメント    |
| 名前参照    | `Skill: skill-name (description)` | Skill ツールによる skill 自動ロード   |

## 例

### Good: Thin Wrapper (~80 行)

```markdown
# /code

TDD implementation with RGRC cycle.

## Skills & Agents

- Skill: use-workflow-code (RGRC cycle)
- Agent: generator-test (TDD test generation, fork)
```

フェーズをオーケストレートし、詳細は skill に委譲する。

### Bad: Monolithic (900 行)

```markdown
# /code

## Full TDD explanation here

## Full RGRC cycle here

## Full test patterns here
```

Miller's Law + DRY 違反。保守困難。
