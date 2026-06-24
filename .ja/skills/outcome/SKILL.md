---
name: outcome
description: .claude/OUTCOME.md を対話的に生成 / 更新する。不在や空 (Behavior 空 / 全セクションが未記入) なら AskUserQuestion で収集して stub を生成し、既存なら現状を提示して更新する。
when_to_use: OUTCOME作って, OUTCOME更新, アウトカム定義, create outcome, update outcome
allowed-tools: Read Write Edit AskUserQuestion
---

# /outcome - OUTCOME.md 生成 / 更新

`.claude/OUTCOME.md` を対話的に生成 / 更新する。他スキルが `OUTCOME.md` 不在を検知したときの受け皿でもある。強制停止にせず対話生成にするのは新規リポの立ち上げを止めないため。警告だけで素通りさせないのは、曖昧な outcome のまま作業が進むのを防ぐため。

## 分岐

| 状態                                                    | フロー |
| ------------------------------------------------------- | ------ |
| ファイル不在、Behavior が空、または全セクションが未記入 | 生成   |
| 上記以外                                                | 更新   |

## 生成

1. `${CLAUDE_SKILL_DIR}/templates/outcome.md` を読む (構造と例)
2. Behavior (1 つ以上、主体明示)、Non-goals、Constraints の 3 項目を、AskUserQuestion 1 回で各項目 1 問ずつ収集する
3. 各 Behavior をアウトカムテストに通す。fail なら書き直してユーザーに再提示する
4. テンプレートに流し込み、`.claude/OUTCOME.md` を Write

## 更新

1. `.claude/OUTCOME.md` を読み、現状の 3 セクションを提示
2. 変更するセクションとその内容を AskUserQuestion で確認
3. 変更後の Behavior をアウトカムテストに通してから Edit

## 完了条件

すべての Behavior がアウトカムテストの 4 項目を満たしてから、Write / Edit する。
