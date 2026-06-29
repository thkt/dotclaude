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

`$ARGUMENTS` はバグ説明、または `/audit` で `${CLAUDE_SKILL_DIR}/../../workspace/history/` に作成された snapshot の finding ID (例: `RC-001`, `SEC-003`)。対象は十分に理解できている 1〜3 ファイル規模の問題に限る。`$ARGUMENTS` のパターンでモードに分岐する。

| パターン            | モード          | 動作                                                                                                                                                                                |
| ------------------- | --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/^[A-Z]+-[0-9]+$/` | Finding ID 解決 | snapshot を読み findings[] の ID 一致を探す。severity / fix_type / root cause を保持し Outcome Anchor とビルドチェックを省いてトリアージへ。不在ならエラー提示 + Standard Flow 提案 |
| 空                  | Fix プロンプト  | AskUserQuestion で Fix type (Bug fix / Error message / Test failure) と Description (Other で自由記述) を尋ねて実行                                                                 |
| その他              | Standard Flow   | バグ説明とみなし Outcome Anchor から実行                                                                                                                                            |

## 委譲マップ

| 種別      | 委譲先                                               | 目的                                        |
| --------- | ---------------------------------------------------- | ------------------------------------------- |
| Skill     | `use-context-root-cause-analysis`                    | 非自明バグへの 5 Whys                       |
| Agent     | `generator-test`                                     | symptom + 再現手順から regression test 生成 |
| Agent     | `resolver-build`                                     | TypeScript やビルドエラーの triage          |
| Reference | `${CLAUDE_SKILL_DIR}/references/defense-in-depth.md` | Recurring / Systematic への多層検証         |

## アウトカム参照

ビルドチェックの前に `.claude/OUTCOME.md` を読む。不在なら `/outcome` で stub を生成。バグまたは修正が outcome 状態の中にあるか確認する。範囲外なら § エスカレーション。

## ビルドチェック

package.json やプロジェクト設定からビルドコマンドを検出して実行。

| 結果         | 動作                                            |
| ------------ | ----------------------------------------------- |
| ビルドエラー | `Task(subagent_type: resolver-build)` 起動、END |
| エラーなし   | トリアージに進む                                |

## トリアージ

Obvious は RCA と regression test 生成の双方を省くため、誤修正リスクの低い finding に限る。

| 入力       | 条件                                            | パス        |
| ---------- | ----------------------------------------------- | ----------- |
| バグ説明   | 単一箇所が特定 + 1〜3 行修正 + 類似パターンなし | Obvious     |
| バグ説明   | 断続的、複数の再現条件、または根本原因が不明    | Non-obvious |
| Finding ID | `fix_type: auto` かつ severity low / med        | Obvious     |
| Finding ID | それ以外 (critical / high、または auto 以外)    | Non-obvious |

## Obvious

1. 最小限の修正を適用
2. 影響コードをカバーするテストがあれば実行

## Non-obvious

1. `Skill("use-context-root-cause-analysis")` を起動して 5 Whys を実行する。Finding ID 経由なら、snapshot の root cause を 5 Whys の起点として渡す。Symptom / Root cause / Pattern を出力する。
2. `Task(subagent_type: generator-test)` で regression test (symptom と再現手順のみ渡す)
3. regression test が Red であることを確認
4. 修正を適用
5. regression test が Green、他のテストに regression がないことを確認
6. Pattern が Recurring または Systematic なら `${CLAUDE_SKILL_DIR}/references/defense-in-depth.md` を適用

## エスカレーション

客観的トリガーで分岐し、自己評価による信頼度判断はしない。エスカレーションなしで 4 回目の修正を試みない。

| トリガー                          | 動作                                                        |
| --------------------------------- | ----------------------------------------------------------- |
| RCA で根本原因が特定できない      | `/research` にエスカレーション                              |
| 修正後もテスト失敗                | 根本原因を再分析。3 回失敗で `/research` にエスカレーション |
| 複数ファイル影響 (4 ファイル以上) | `/code` に委譲                                              |
| 新機能スコープ                    | `/think` に委譲                                             |
| Pattern = Systematic              | `/research` にエスカレーション                              |
| Fix が OUTCOME.md スコープ外      | ユーザーに確認。Non-goals を再定義するか `/code` に委譲     |

## エラー処理

| エラー                      | 動作                                     |
| --------------------------- | ---------------------------------------- |
| resolver-build 失敗         | エラーを提示しユーザーに指示を仰ぐ       |
| generator-test タイムアウト | regression test をスキップして修正を続行 |

## 完了条件

すべて満たすまで完了としない。括弧付きの項目は、該当する場合のみ必須。

- [ ] 根本原因を特定 (Non-obvious パス)
- [ ] 全テスト pass
- [ ] RCA から Pattern フィールドを記録 (Non-obvious パス)
- [ ] defense-in-depth を適用 (Recurring / Systematic のみ)
- [ ] Finding ID 経由なら再 audit を提案 (Finding ID パス)
