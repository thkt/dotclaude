---
name: outcome
description: .claude/OUTCOME.md を対話的に生成・更新する。不在や空 (Behavior 空 / 全 section TBD) なら AskUserQuestion で収集して stub を生成し、既存なら現状を提示して更新する。
when_to_use: OUTCOME作って, OUTCOME更新, アウトカム定義, create outcome, update outcome
allowed-tools: Read Write Edit AskUserQuestion
---

# /outcome - OUTCOME.md 生成・更新

`.claude/OUTCOME.md` を対話的に生成・更新する。他スキルが OUTCOME.md 不在を検知したときの受け皿でもある。hard-stop でなく対話生成なのは新規リポの立ち上げを止めないため。warn のみで進まないのは曖昧な outcome のまま作業が進むのを防ぐため。

## 分岐

| 状態                                              | フロー |
| ------------------------------------------------- | ------ |
| ファイル不在、Behavior が空、または全 section TBD | 生成   |
| 上記以外                                          | 更新   |

## 生成

| Step | 動作                                                                             |
| ---- | -------------------------------------------------------------------------------- |
| 1    | ${CLAUDE_SKILL_DIR}/templates/outcome.md を読む (構造と例)                       |
| 2    | AskUserQuestion で Behavior (≥1、主体明示)、Non-goals、Constraints を収集 (3 問) |
| 3    | 各 Behavior をアウトカムテストに通す。fail は書き直してユーザーに再提示          |
| 4    | テンプレートに流し込み、`.claude/OUTCOME.md` を Write                            |

## 更新

| Step | 動作                                                  |
| ---- | ----------------------------------------------------- |
| 1    | `.claude/OUTCOME.md` を読み、現状の 3 section を提示  |
| 2    | 変更する section とその内容を AskUserQuestion で確認  |
| 3    | 変更後の Behavior をアウトカムテストに通してから Edit |

## 完了条件

すべての Behavior がアウトカムテスト 4 項目を pass するまで Write / Edit しない。
