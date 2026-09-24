# Research: ablate-deterministic-metrics-candidate

Generated: 2026-09-19
Session: 01CdGwmPis6ZSyZ228i3aawP
Intent: Candidate memo (未着手)
Domain: Harness
Prior research: 2026-09-19-jev-guardrail-hook-candidate.md（Jev の基礎情報はそちら）

## Purpose

ハーネスの効果を検証する eval として /ablate を拡張する案を、着手前の候補として残す。参照実装は vinilana/jev-eval-agent で、持ってくるのは判定の決定論化と結果の保管形式の 2 点。

## Candidate

/ablate の `complies`（transcript を読んで判断する）に加えて、run の出力から機械的に数えられる process indicator を観測に入れ、run ごとの結果を versioned JSON で残す。

| 優先 | 差分 | 今の /ablate | jev-eval-agent | 判断 |
| --- | --- | --- | --- | --- |
| 1 | 判定の材料 | `complies` を transcript の読みで判断し、人間が確認する（`skills/ablate/references/measurement-criteria.md` § What complies means） | イベントストリームから steps / tool calls / wrong tool / completion / cost / duration を抽出 | 推奨。`claude --print --output-format json`（`skills/ablate/scripts/arms.ts:16`）は usage / cost / num_turns / duration を返すので、hook 発火回数、tool 呼び出し数、禁止コマンド試行回数を同じ run から数えられる。OUTCOME「品質保証を決定論的な層へ移す」を eval 自身に適用する |
| 2 | hooks / workflows の trigger task | `enumerate_elements` は `hooks/**` を列挙する（`skills/_lib/harness_elements.ts:51-53`）が、measurement-criteria の表は rules 20 件だけなので hook は `unmeasured` のまま | 各タスクが必要 tool 族と distractor を宣言する | 推奨。ハーネスの効果を hook まで含めて測るならここが先 |
| 3 | 結果の保管 | `docs/audit/<日時>-ablate.md` の Markdown | `eval-results/<mode>/<model>/<task>.json` + `history.jsonl` 追記 + ダッシュボード | 候補。run 間の比較と variance の測定（arms.ts の RUN_COUNT=5 は暫定で、variance 測定後に見直すと注記あり）に効く |
| 4 | 失敗の型に名前を付けて数える | 違反の有無 | 「引数の捏造」「早すぎる完了」「兄弟 tool 誤選択」 | 候補。1 と同じ抽出器で数える |
| 5 | `complies` の一次判定を Jev の Noul に置き換える | 人間 | 完了ゲートに Noul を使用 | 保留。20 要素 × 3 arm × 5 run = 300 判定でも数セントだが、transcript を 32k request に収める切り出しが設計の中心になる。人間の最終確認は残す |

## Key Findings

| Priority | Finding | Source | Next Action |
| --- | --- | --- | --- |
| High | 100 tool のモック agent で、LLM 直接選択と Jev ルーターを 8 モデル × 6 タスクで比較。結果 JSON は repo に versioned で入り、ダッシュボードとデッキが読む | https://github.com/vinilana/jev-eval-agent（README、eval-ui/slides.html） | 結果保管の形式の参照 |
| High | 結論は「Jev の利点はコストとステップ規律で、精度ではない」。直接 mode ではどのモデルも紛らわしい tool に引っかからず、仮説は否定された | 同上 deck n12 | 仮説を否定できる eval 設計の参照。効果がないという結果を出せる形にする |
| High | Opus 5 の 6 タスク: 直接 mode は完了率 1.0 が 6/6、コスト $0.27〜0.40。Jev mode は 4/6、$0.037〜0.115、所要は 12〜32 秒に伸びる。誤 tool は両方 0 | `eval-results/{llm-direct,jev-classifier}/opus-5/history.jsonl`（本セッションで集計。他 7 モデルは未集計） | record only |
| High | Jev が判定できない失敗: LLM が引数（参加者のメール）を捏造すると、Jev は「会議は作られた」と見て連絡先検索へ戻せない。ルーターはモデルが飛ばした lookup を強制できない | 同上 deck n13 | state に見えないものは判定できない。Noul 判定に渡す transcript の切り出し設計に反映 |
| Medium | 同作者の jev-gateway は `--routing off` でベースラインを取り、dashboard で入出力トークン、キャッシュ比率、reasoning トークン、秒数を request ごとに数える。jev-gateway-bench は同じタスクを routing on / off で各 5 回走らせ、隠し verifier で合否を採点する（チェスのルールエンジン 2 タスク、plugin なしのクリーンな agent、40 セッション） | https://github.com/vinilana/jev-gateway § Dashboard, § Benchmark | Candidate 1 の process indicator の一覧と、Candidate 3 の run ごとの結果保管の参照。on / off の 2 arm + 隠し verifier は ablate の wiped / full + `complies` と同型 |
| Medium | 計測の罠の実例（ニュース選別 53 日の比較）: ラベルは 1 回の実行結果で正解ではない。到達できない母集団（枠外の記事）を含めて上位 N 件で測ると、既定の並び順が構造的に勝つので、比較は到達可能な母集団の内側で行う。判定器同士の差は日ごとの対で取り、日単位のブートストラップで 95% 信頼区間を出す。53 日では区間が広い。SDK が返す費用は公開単価から自前で再計算して照合する。条件が揃わない比較（前置き 9 千トークン、まとめて相対判定と 1 件ずつ単独判定）は限界として明記する | https://zenn.dev/acropapa330/articles/typesafe-jev-news-triage-53days § 物差しの作り方と、その罠、§ 限界 | ablate の `complies` は 1 回の run のラベルなので、RUN_COUNT の run 間で対にして差を取り、区間を出す。wiped と full の比較は同じ trigger task の内側で行う |
| Medium | 早すぎる完了は「依頼された操作は全部済んだか」の Noul をゲートにして止めた | 同上 deck b13b | jev-guardrail-hook-candidate の Stop hook 案の参照実装 |
| Medium | 指標の定義: efficiency = completion × ideal ÷ calls × ½（誤 tool があれば） | 同上 README § Metrics | 1 つの合成指標に頼らず、result indicator と process indicator を分けて持つ（BOUNDARIES.md § Measurement） |

## Available Data

| Type | Item | Note |
| --- | --- | --- |
| Skill | `skills/ablate/` | arms.ts（3 arm、RUN_COUNT=5）、verdict.ts、dr_gate.ts、usage_counts.ts、report.ts |
| Lib | `skills/_lib/harness_elements.ts` | rules / hooks / scripts を列挙 |
| Ref | `skills/ablate/references/measurement-criteria.md` | rules 20 件の trigger task 表。hooks / workflows の行なし |
| Output | `docs/audit/*-ablate.md` | 現行のレポート先 |

## Constraints

| Category | Constraint |
| --- | --- |
| OUTCOME (Behavior) | 品質保証を決定論的な層へ移す。eval の判定も同じ方向に寄せる |
| OUTCOME (Non-goal) | 他メンバーへの配布はしない。ダッシュボードを作るなら thkt のローカルで足りる |
| wiki | 数値は script 定数に置き、SKILL.md 本文に写さない（`docs/wiki/deterministic-script-judgment.md`） |
| 発見 | hooks は列挙されるが trigger task がないので、今のままでは測れない |

## Next Steps

- 着手する場合は /think で「観測に process indicator を足す」と「hooks の trigger task を足す」を別の unit に分けて設計し、/issue に落とす
- 決めること: `--output-format json` から何を数えるか、hook の発火をどこから読むか（hook 自身のログか transcript か）、結果 JSON の置き場
