---
name: fix
description: 開発環境で小さなバグや軽微な改善を素早く修正する。新機能実装や大規模変更には使わない (/code を使う)。
when_to_use: バグ修正, 直して, 修正して, fix bug, 不具合
allowed-tools: Bash(git diff:*) Bash(git ls-files:*) Bash(npm test:*) Bash(npm run) Bash(npm run:*) Bash(yarn run:*) Bash(pnpm run:*) Bash(bun run:*) Edit MultiEdit Read LS Task AskUserQuestion Skill Bash(ugrep:*) Bash(bfs:*)
model: opus
argument-hint: "[bug or issue description]"
---

# /fix - クイックバグ修正

根本原因分析と TDD 検証を伴って小さなバグを素早く修正する。

## 入力

- `$ARGUMENTS`: バグ説明、または `/audit` の Suggestion ID (例: `SUG-001`)
- スコープ: 小さく、十分理解されている問題 (1-3 ファイル)

### ルーティング

| `$ARGUMENTS` パターン | モード                       |
| --------------------- | ---------------------------- |
| `/^SUG-[0-9]+$/`      | Suggestion ID Mode           |
| 空                    | Fix Prompt (AskUserQuestion) |
| その他                | Standard Flow                |

### Fix Prompt

`$ARGUMENTS` が空のとき AskUserQuestion で尋ねる。

| 質問        | 選択肢                                 |
| ----------- | -------------------------------------- |
| Fix type    | Bug fix / Error message / Test failure |
| Description | [Other で自由記述]                     |

### Suggestion ID Mode

| Step | 動作                                                                  |
| ---- | --------------------------------------------------------------------- |
| 1    | ${CLAUDE_SKILL_DIR}/../../workspace/history/ から最新 snapshot を読む |
| 2    | ID で一致する suggestion を探す                                       |
| 3    | 直接修正を適用 (RCA をスキップ。audit findings を信頼)                |
| 4    | テスト pass を確認                                                    |
| 5    | 対象を絞った再 audit を提案: `/audit <modified files>`                |

## 委譲マップ

| 種別      | 委譲先                          | 目的                                        |
| --------- | ------------------------------- | ------------------------------------------- |
| Skill     | use-context-root-cause-analysis | 非自明バグへの 5 Whys                       |
| Agent     | generator-test                  | symptom + 再現手順から regression test 生成 |
| Agent     | resolver-build                  | TypeScript やビルドエラーの triage          |
| Reference | references/defense-in-depth.md  | Recurring/Systematic への多層検証           |

## 実行

### ビルドチェック

プロジェクトのビルドコマンドを実行 (package.json やプロジェクト設定から検出)。

| 結果         | 動作                                                  |
| ------------ | ----------------------------------------------------- |
| ビルドエラー | `Task` を `subagent_type: resolver-build` で起動、END |
| エラーなし   | Triage に進む                                         |

### Triage

| 条件                                           | パス                       |
| ---------------------------------------------- | -------------------------- |
| 単一箇所が特定 + 1-3 行修正 + 類似パターンなし | Obvious: Direct Fix        |
| 断続的、複数の再現条件、または根本原因が不明   | Non-obvious: Full Protocol |

### Obvious: Direct Fix

| Step | 動作                                               |
| ---- | -------------------------------------------------- |
| 1    | 最小限の修正を適用                                 |
| 2    | 影響コードをカバーするテストを実行 (なければ skip) |

### Non-obvious: Full Protocol

| Step | 動作                                                                                              |
| ---- | ------------------------------------------------------------------------------------------------- |
| 1    | `Skill("use-context-root-cause-analysis")` で 5 Whys。出力: Symptom / Root cause / Pattern        |
| 2    | `Task(subagent_type: generator-test)` で regression test (symptom と再現手順のみ渡す)             |
| 3    | regression test が Red であることを確認                                                           |
| 4    | 修正を適用                                                                                        |
| 5    | regression test が Green、他のテストに regression がないことを確認                                |
| 6    | Pattern ∈ {Recurring, Systematic} なら ${CLAUDE_SKILL_DIR}/references/defense-in-depth.md を適用 |

## エスカレーション

客観的トリガー。自己評価による信頼度判断はしない。

| トリガー                       | 動作                                              |
| ------------------------------ | ------------------------------------------------- |
| RCA で根本原因が特定できない   | エスカレーション → `/research`                   |
| 修正試行が 3 回失敗            | STOP。完全なコンテキストで `/research` にエスカレ |
| 複数ファイル影響 (>3 ファイル) | 委譲 → `/code`                                   |
| 新機能スコープ                 | 委譲 → `/think`                                  |
| Pattern = Systematic           | エスカレーション → `/research`                   |

3 回ルール: 異なる修正試行が 3 回失敗するなら、ローカルバグでなくアーキテクチャ問題の可能性が高い。エスカレートせず 4 回目を試みない。

## エラー処理

| エラー                      | 動作                                     |
| --------------------------- | ---------------------------------------- |
| resolver-build 失敗         | エラーを提示しユーザーに指示を仰ぐ       |
| generator-test タイムアウト | regression test をスキップして修正を続行 |
| 修正後もテスト失敗          | 根本原因を再分析またはエスカレーション   |

## 検証

| チェック                          | 必須                            |
| --------------------------------- | ------------------------------- |
| 根本原因の特定 (Non-obvious パス) | Yes                             |
| 全テスト pass                     | Yes                             |
| RCA からの Pattern フィールド記録 | Yes (Non-obvious パス)          |
| 必要時の defense-in-depth 適用    | Yes (Recurring/Systematic のみ) |
