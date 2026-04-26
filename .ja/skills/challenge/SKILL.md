---
name: challenge
description: 提案、設計、計画、分析に対してdevil's advocateを実行。ユーザーがdevils advocate, 反論, チャレンジ, challenge, 叩いて, 穴探し等に言及した場合に使用。コードレビューの発見事項には /audit、outcome assertion には /assert（adversarial testing 内蔵）を使用。
allowed-tools: Read, Glob, Grep, LS, Task
model: opus
argument-hint: "[提案ファイル | 説明]"
user-invocable: true
---

# /challenge

提案、分析、計画に対して `devils-advocate-design` を実行する。

## 入力

- `$1`: チャレンジ対象（提案ファイルのパスまたは説明文）
- `$1` が空の場合: 処理を中止してユーザーに対象を確認する。会話履歴からの推測は誤爆リスクが高いため行わない。

## 実行

| Step | アクション | 詳細                                                          |
| ---- | ---------- | ------------------------------------------------------------- |
| 1    | 対象の特定 | `$1` から抽出                                                 |
| 2    | DA実行     | Task(subagent_type: devils-advocate-design, background: true) |
| 3    | レポート   | エージェント出力 + 対応アクション                             |

### Step 2: プロンプト

対象とユーザーが参照したファイルパスを含める。対象プロジェクトに ARCHITECTURE.md 等の構造制約ファイルがあれば言及する。エージェントが Read/Grep/Glob で独自にコンテキストを収集する。

## 出力

エージェントの構造化出力をそのまま提示し、対応アクション（維持・削除・修正すべき具体的なアクション上位3件）を追記する。
