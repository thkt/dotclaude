---
name: tuning
description: 経験的なプロンプトチューニングループ。skill / agent / コマンドのプロンプトに対して新規 subagent をディスパッチし、曖昧さを集めて 1 つずつ修正する。
when_to_use: skill チューニング, agent チューニング, command チューニング, プロンプト再現性, empirical prompt tuning, 暗黙知排除, 再現性テスト
allowed-tools: Read Edit Write Task Bash(ugrep:*) Bash(bfs:*)
model: opus
argument-hint: "[target-path]"
---

# Tuning - 経験的プロンプトチューニング

## 原則

プロンプト作者は自分のプロンプトの最悪の読者。気付かないうちに暗黙知を埋めてしまう。プロンプトを冷ややかに読む独立した実行 AI のみが、欠けたコンテキストを浮き彫りにできる。ループは TDD 形状。実行者がテスト、プロンプトがプロダクションコード。

## 対象

| 対象          | パス                                          | ディスパッチ                 |
| ------------- | --------------------------------------------- | ---------------------------- |
| Skill         | ${CLAUDE_SKILL_DIR}/../<name>/SKILL.md        | Task + general-purpose agent |
| Agent         | ${CLAUDE_SKILL_DIR}/../../agents/**/<name>.md | Task + subagent_type=<name>  |
| Slash command | ${CLAUDE_SKILL_DIR}/../../commands/<name>.md  | Task + general-purpose agent |

## ループ

1. シナリオと要件を最初に固定し、凍結する
2. 新規 subagent を並列でディスパッチ (再利用しない)
3. レポートを集める。要件 / 曖昧さ / 任意で埋めたもの / リトライ
4. 1 反復で 1 つの曖昧さを修正 (最小編集)
5. 停止条件が発火するまで新規 subagent で再ディスパッチ

1 反復 1 テーマ。1 ラウンドで複数パッチを当てると帰属が崩れる。

## シナリオ設計

| 種類     | 数  | 目的                                     |
| -------- | --- | ---------------------------------------- |
| Median   | 1   | 典型的なハッピーパス                     |
| Edge     | 1-2 | 境界条件、異常な入力                     |
| Hold-out | 1   | チューニングに使わない、過学習チェック用 |

シナリオは反復をまたいで凍結する。プロンプト変更に合わせてシナリオを変えると、本当の曖昧さが隠れる。

## 要件チェックリスト

各シナリオはチェックリストを持つ。少なくとも 1 項目に `[critical]` を付ける。すべての `[critical]` 項目を満たしたときのみ run が成功となる。critical タグなしでは成功が「全領域 50%」に崩れ、次のパッチ対象が見えなくなる。

## Subagent プロンプトテンプレート

```text
You are the executor reading <target prompt name> cold.

## Target Prompt
<prompt body or file path>

## Scenario
<one-paragraph situation>

## Requirements Checklist
1. [critical] <minimum-line item>
2. <regular item>
...

## Task
1. Follow the target prompt against the scenario and produce the deliverable
2. Return a report in the structure below at the end

## Report Structure
- Deliverable: <output or execution summary>
- Requirement check: pass / fail / partial (with reasoning) per item
- Ambiguities: stall points, wording that was hard to interpret
- Discretionary fills: gaps filled by your own judgment
- Retries: how many times you redid the same decision and why
```

## 停止条件

| 結果     | 基準                                                                                                     |
| -------- | -------------------------------------------------------------------------------------------------------- |
| 収束     | 連続 2 回の run で新規曖昧さ 0、accuracy ±3pt、steps ±10%、duration ±15%、hold-out リグレッションなし |
| 発散     | 3 反復以上で新規曖昧さが減らない。パッチではなく構造を書き直す                                           |
| 打ち切り | 改善コスト > 残る重要度。90→100 は逓減点、打ち切り候補                                                  |

## メトリクス

Task tool の戻り値は `<usage>total_tokens: N, tool_uses: M, duration_ms: D</usage>` を末尾に付ける。各 run で記録し反復間で比較する。「速くなった気がする」は比較可能なメトリクスではない。

### tool_uses の診断

シナリオ間で `tool_uses` を比較する。4 シナリオが 1-3 にとどまり 1 つが 15+ に跳ねたら、そのシナリオは reference を掘っており、自己完結性の低さを示している。本文にインラインの最小例と「reference を読むタイミング」のガイドラインを足してこれを下げる。accuracy 100% でも構造の隙間は `tool_uses` に表れる。

## よくある失敗

| 失敗                             | 修正                                                             |
| -------------------------------- | ---------------------------------------------------------------- |
| Task tool がディスパッチされない | subagent に Task tool で別エージェントをスポーンするよう明示する |
| `<usage>` ブロックが欠ける       | ディスパッチプロンプトでレポート構造を強制する                   |
| Rate limit (529/overloaded)      | 並列度を 3 から 1 に下げる、または 30s 待って再ディスパッチ      |
| 親コンテキストのトークン枯渇     | 評価専用の新規セッションをスポーンする                           |
| シナリオが本文をなぞる           | median + edge を再設計。edge ケースは必須                        |
| 同じ AI を再利用                 | 必ず新規ディスパッチ。SendMessage で続けない                     |
| 1 反復で複数パッチ               | 1 反復 1 テーマ。それ以外は帰属が失われる                        |
| メトリクスのみで判断             | 定性 (曖昧さ、任意で埋めた箇所) が主導、定量が補助               |
| 軸名による曖昧なパッチ           | subagent に rubric のしきい値テキストを引用させる                |

## 適用しないケース

| ケース                       | 理由                                   |
| ---------------------------- | -------------------------------------- |
| 1 度きりの使い捨てプロンプト | 反復コストが見合わない                 |
| 作者の主観的な趣を保ちたい   | 作者バイアス除去という目的と衝突する   |
| 自己再読で代替               | 作者の暗黙知が検出されないまま入り込む |

## 引き継ぎ

反復ログをその場で捨てない。対象プロンプトの隣に `TUNING_LOG.md` として残す。スコア推移、シナリオ、反復ごとのパッチテーマを記録する。次回チューニングの起点になる。

## 関連

| Skill                           | 関係                                                                       |
| ------------------------------- | -------------------------------------------------------------------------- |
| use-workflow-tdd-cycle          | プロンプトに同じ Red-Green-Refactor サイクルを適用                         |
| use-context-root-cause-analysis | 曖昧さを掘る (5 Whys) ことで構造的なギャップを見つける                     |
| use-workflow-spec-validation    | Spec の整合性は別物、こちらはプロンプト再現性を測る                        |
| assert                          | `/assert` はコードのアウトカムに対する Ready/NotReady ゲート。対象が異なる |
| challenge                       | 敵対的なギャップ探しは別物、こちらは反復的なパッチループ                   |
