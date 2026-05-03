---
name: challenge
description: 提案、設計、計画、分析を devil's advocate で chalenge する。コードレビュー findings には使わない (/audit を使用)。outcome assertion にも使わない (/assert に組み込み adversarial testing がある)。
when_to_use: devils advocate, 反論, チャレンジ, challenge, 叩いて, 穴探し
allowed-tools: Read LS Task Bash(ugrep:*) Bash(bfs:*)
model: opus
argument-hint: "[proposal file | description]"
---

# /challenge

`critic-design` を提案、分析、計画に対して spawn する。

## Input

- `$ARGUMENTS`: challenge 対象 (proposal ファイルパスまたは記述)
- `$ARGUMENTS` が空: 停止して対象指定をユーザーに求める。会話からの暗黙的対象推論は誤射リスクが高い。

## Execution

| Step | アクション | 詳細                                                                                                                                                                    |
| ---- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | 対象特定   | `$ARGUMENTS` から抽出                                                                                                                                                   |
| 2    | DA spawn   | Task(subagent_type: critic-design, background: true). 対象 + 参照ファイルパスを渡す。ARCHITECTURE.md 等が存在すれば言及する。エージェントは自分のコンテキストを収集する |
| 3    | レポート   | エージェント出力 + actionable items                                                                                                                                     |

## Output

エージェントの構造化出力をそのまま提示し、actionable items (keep/remove/revise する具体アクションのトップ 3) を末尾に付ける。
