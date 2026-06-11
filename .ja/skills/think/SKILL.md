---
name: think
description: 設計の探索と SOW、Spec の生成。計画意図のないコードベース調査には使わない (代わりに /research を使う)。
when_to_use: 計画して, 設計して, アプローチ検討, 方針決め, planning, design exploration
allowed-tools: Read Write LS Task TaskCreate TaskList AskUserQuestion Bash(ugrep:*) Bash(bfs:*)
model: opus
argument-hint: "[task description]"
---

# /think

深い設計探索。アプローチを比較し、仮定を検証し、SOW と Spec を生成する。

## 入力

`$ARGUMENTS` のタスク説明、調査コンテキスト、または空なら AskUserQuestion。

## 実行

| Step  | アクション       | 詳細                                                                               |
| ----- | ---------------- | ---------------------------------------------------------------------------------- |
| 0     | Outcome Anchor   | `.claude/OUTCOME.md` を読む。不在なら /outcome で stub を生成                      |
| 1     | Why Discovery    | ${CLAUDE_SKILL_DIR}/references/step-1-why-discovery.md (OUTCOME.md を前提とする)   |
| 2     | Q&A による明確化 | スコープ、優先度 (MoSCoW)、制約、リスク (必要に応じて)                             |
| 3-6   | 設計探索         | ${CLAUDE_SKILL_DIR}/references/step-3-6-design-exploration.md                      |
| 7     | ユーザーレビュー | トレードオフの根拠とともに設計を提示、承認を待つ                                   |
| 7.5   | ADR の提案       | 技術判断に ADR が必要か問う。単純な機能では省略                                    |
| 8-9   | SOW と Spec      | ${CLAUDE_SKILL_DIR}/references/step-8-9-document-generation.md                     |
| 10-11 | レビュー + 分割  | ${CLAUDE_SKILL_DIR}/references/step-10-11-review-decomposition.md                  |
| 12    | View 生成        | planning slug を `use-workflow-plan-preview` に渡す。返された URL をユーザーに共有 |

## 出力

Session ID: ${CLAUDE_SESSION_ID}

常にこの正確なパスを使う。Write tool が親ディレクトリを必要に応じて作成する。

`.claude/workspace/planning/YYYY-MM-DD-[feature]/sow.md` と `spec.md`

## 検証

- [ ] OUTCOME.md が存在 (Step 0)
- [ ] Why Statement が確立されている (Step 1)
- [ ] コードベースが探索されている (Step 3)
- [ ] 2 つ以上のアプローチが比較されている (Step 4)
- [ ] DA チャレンジが適用されている (Step 5)
- [ ] 設計が構成されている (Step 6)
- [ ] ユーザーレビュー済み (Step 7)
- [ ] sow.md と spec.md が生成されている (Steps 8-9)
- [ ] Spec レビューを通過 (Step 10)
- [ ] タスク分割: マイルストーン、最初の一手、スコープ削減候補 (Step 11)
- [ ] View 生成済みで `http://localhost:4321/spec/<short-slug>` URL を共有済み (Step 12)
