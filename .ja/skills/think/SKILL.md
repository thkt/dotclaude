---
name: think
description: 設計の探索と SOW、Spec の生成。計画意図のないコードベース調査には使わない (代わりに /research を使う)。
when_to_use: 計画して, 設計して, アプローチ検討, 方針決め, planning, design exploration
allowed-tools: Read Write Glob Grep LS Task TaskCreate TaskList AskUserQuestion
model: opus
argument-hint: "[task description]"
---

# /think

深い設計探索。アプローチを比較し、仮定を検証し、SOW と Spec を生成する。

## 入力

`$ARGUMENTS` のタスク説明、調査コンテキスト、または空なら AskUserQuestion。

## 実行

| Step | アクション       | 詳細                                                             |
| ---- | ---------------- | ---------------------------------------------------------------- |
| 0    | Why Discovery    | ${CLAUDE_SKILL_DIR}/references/step-0-why-discovery.md           |
| 1    | Q&A による明確化 | スコープ、優先度 (MoSCoW)、制約、リスク (必要に応じて)           |
| 2-5  | 設計探索         | ${CLAUDE_SKILL_DIR}/references/step-2-5-design-exploration.md    |
| 6    | ユーザーレビュー | トレードオフの根拠とともに設計を提示、承認を待つ                 |
| 6.5  | ADR の提案       | 技術判断に ADR が必要か問う。単純な機能では省略                  |
| 7-8  | SOW と Spec      | ${CLAUDE_SKILL_DIR}/references/step-7-8-document-generation.md   |
| 9-10 | レビュー + 分割  | ${CLAUDE_SKILL_DIR}/references/step-9-10-review-decomposition.md |

## 出力

Session ID: ${CLAUDE_SESSION_ID}

常にこの正確なパスを使う。Write tool が親ディレクトリを必要に応じて作成する。

`.claude/workspace/planning/YYYY-MM-DD-[feature]/sow.md` と `spec.md`

## 検証

- [ ] Why Statement が確立されている (Step 0)
- [ ] コードベースが探索されている (Step 2)
- [ ] 2 つ以上のアプローチが比較されている (Step 3)
- [ ] DA チャレンジが適用されている (Step 4)
- [ ] 設計が構成されている (Step 5)
- [ ] ユーザーレビュー済み (Step 6)
- [ ] sow.md と spec.md が生成されている (Steps 7-8)
- [ ] Spec レビューを通過 (Step 9)
- [ ] タスク分割: マイルストーン、最初の一手、スコープ削減候補 (Step 10)
