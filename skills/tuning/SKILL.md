---
name: tuning
description: Empirical prompt tuning loop. Dispatch fresh subagents against skill/agent/command prompts, collect ambiguities, patch one at a time.
when_to_use: skill チューニング, agent チューニング, command チューニング, プロンプト再現性, empirical prompt tuning, 暗黙知排除, 再現性テスト
allowed-tools: Read Edit Write Grep Glob Task
model: opus
argument-hint: "[target-path]"
---

# Tuning - Empirical Prompt Tuning

## Principle

Prompt authors are the worst readers of their own prompts. They fill tacit knowledge without noticing. Only an independent executor AI, reading the prompt cold, can surface missing context. The loop is TDD-shaped: the executor is the test, the prompt is the production code.

## Target

| Target        | Path                               | Dispatch                     |
| ------------- | ---------------------------------- | ---------------------------- |
| Skill         | `~/.claude/skills/<name>/SKILL.md` | Task + general-purpose agent |
| Agent         | `~/.claude/agents/**/<name>.md`    | Task + subagent_type=<name>  |
| Slash command | `~/.claude/commands/<name>.md`     | Task + general-purpose agent |

## Loop

1. Fix scenarios and requirements up front, freeze them
2. Dispatch fresh subagents in parallel (no reuse)
3. Collect reports: requirements / ambiguities / discretionary fills / retries
4. Patch ONE ambiguity per iteration (minimal edit)
5. Re-dispatch with fresh subagents until a stop condition fires

One iteration, one theme. Multiple patches in one round breaks attribution.

## Scenario Design

| Type     | Count | Purpose                                  |
| -------- | ----- | ---------------------------------------- |
| Median   | 1     | Typical happy path                       |
| Edge     | 1-2   | Boundary conditions, unusual inputs      |
| Hold-out | 1     | Never used for tuning, overfitting check |

Scenarios stay frozen across iterations. Tuning scenarios to match prompt changes hides real ambiguities.

## Requirements Checklist

Every scenario carries a checklist. Tag at least one item `[critical]`. A run is successful only when every `[critical]` item is met. Without critical tags, success collapses into "50% everywhere" and the next patch target becomes invisible.

## Subagent Prompt Template

```text
あなたは <対象プロンプト名> を白紙で読む実行者です。

## 対象プロンプト
<プロンプト本文 or ファイルパス>

## シナリオ
<状況設定 1段落>

## 要件チェックリスト
1. [critical] <最低ライン項目>
2. <通常項目>
...

## タスク
1. 対象プロンプトに従ってシナリオを実行し、成果物を生成
2. 終了時に下記レポート構造で返答

## レポート構造
- 成果物: <生成物 or 実行結果サマリ>
- 要件達成: 各項目について ○ / × / 部分的 (理由付き)
- 不明瞭点: 詰まった箇所、解釈に迷った文言
- 裁量補完: 指示で決まっておらず自分の判断で埋めた箇所
- 再試行: 同じ判断をやり直した回数とその理由
```

## Stop Conditions

| Outcome   | Criteria                                                                          |
| --------- | --------------------------------------------------------------------------------- |
| Converged | 連続2回で 新規不明瞭点 0, 精度 ±3pt, steps ±10%, duration ±15%, hold-out 落ちなし |
| Diverged  | 3回以上反復しても新規不明瞭点が減らない. パッチで直さず構造を書き直す             |
| Cut off   | 改善コスト > 残り重要度. 90→100 は頭打ち寄りなので打ち切り候補                    |

## Metrics

Task tool 戻り値の末尾に `<usage>total_tokens: N, tool_uses: M, duration_ms: D</usage>` が付く。毎回これを拾って比較する。「速くなった気がする」では再評価できない。

### tool_uses Diagnosis

シナリオ間で `tool_uses` を比べる。4シナリオが 1〜3 なのに 1シナリオだけ 15+ なら、そのシナリオは references 漁りまくり, 自己完結性が低いサイン。本文に「最小完成例 inline」「いつ references を読むかの指針」を足すと落ちる。精度 100% でも構造的な穴は `tool_uses` に出る。

## Common Failures

| Failure                          | Fix                                               |
| -------------------------------- | ------------------------------------------------- |
| Task tool が dispatch されない   | 「Task tool を使って subagent を起動して」と明示  |
| `<usage>` が出ない               | dispatch 時にレポート構造を強制                   |
| レートリミット (529/overloaded)  | 並列 3 → 1, または 30s 待って再 dispatch          |
| 親 context token 枯渇            | 評価専用の別セッションを新規起動                  |
| シナリオが本文をなぞる           | median + edge を再設計, エッジケース必須          |
| 同じ AI を使い回す               | 毎回新規 dispatch. SendMessage で続行しない       |
| 1反復で複数修正                  | 1反復1テーマ. 効いたものが追えなくなる            |
| メトリクスだけで判断             | 質的 (不明瞭点/裁量補完) が主, 量的は補助         |
| 軸名で雑に修正                   | 判定表の閾値文言を subagent に明示参照させる      |

## Do Not Apply

| Case                           | Reason                               |
| ------------------------------ | ------------------------------------ |
| 一回限りの使い捨てプロンプト   | 反復コストが見合わない               |
| 書き手の主観的好みを残す用途   | バイアス排除が主目的なのと矛盾       |
| 自己再読で代替                 | 作者の暗黙知が入る, 検出できない     |

## Handoff

反復ログはその場で破棄せず、対象プロンプトと同じディレクトリに `TUNING_LOG.md` として残す候補。スコア推移, シナリオ, 各反復の修正テーマを記録。次回チューニング時の起点になる。

## Related

| Skill                           | Relation                                                  |
| ------------------------------- | --------------------------------------------------------- |
| use-workflow-tdd-cycle          | 同じ Red-Green-Refactor 構造を prompt に適用              |
| use-context-root-cause-analysis | 不明瞭点の深掘り (5 Whys) で構造的欠陥を特定              |
| use-workflow-spec-validation    | Spec 整合性は別, こちらは prompt の再現性を計測           |
| assert                          | `/assert` は code outcome の Ready/NotReady gate, 対象が別 |
| challenge                       | adversarial な穴探しは別, こちらは iterative patch ループ |
