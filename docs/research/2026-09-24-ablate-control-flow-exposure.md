# Research: ablate-control-flow-exposure

Generated: 2026-09-24
Intent: #744 の実走前 pilot。skill-reference arm が control-flow.md を測れるかを確かめる
Domain: Harness
Prior research: 2026-09-19-ablate-deterministic-metrics-candidate.md

## Purpose

#746 の部品で control-flow.md を測る前に、reviewer-readability が reference を自然に読む割合 (露出率) と 1 run の費用を実測する。露出率が低いと、露出で絞った run 数が RUN_COUNT に届かず、verdict が unmeasured になる。

## Setup

- fixture: `reference_arm_command` で wiped と wiped+1 を 5 個ずつ組み、cwd を `realpathSync` で実パスに揃えた
- 対象: `src/shipping.ts`。7 分岐の if/else if で配送業者から日数を変数へ代入する lookup (8〜24 行目)。関数 20 行、ネスト 1 で、SKILL.md の Detection 表と閾値には掛からない。control-flow.md の Bad 例 (`if (code === X) return`) とは形を変えた
- 起動: `claude --print --output-format stream-json --verbose --setting-sources project --agent reviewer-readability --max-budget-usd 1.0 "Review src/shipping.ts. Return findings as a JSON array of objects with file, line, summary." < /dev/null`
- model: agent frontmatter の opus (init イベントで `claude-opus-5-5` を確認)

## Results

| 項目                                                           | 値                                                                                                                        |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| 露出 (fixture の control-flow.md の Read)                      | 0/10 (wiped 0/5、wiped+1 0/5)                                                                                             |
| 仕込んだ欠陥への当たり (line 8 で lookup 表への置き換えを提案) | 10/10 (wiped 5/5、wiped+1 5/5)                                                                                            |
| 汚染                                                           | 1/10。wiped+1 の 1 run が `ls ~/.claude/agents/_lib/calibration/CQ.md ~/.claude/agents/_lib/finding-schema.md` を実行した |
| Read した対象                                                  | 全 run が `src/shipping.ts` だけを Read した。SKILL.md も Read していない (agent の `skills:` で先に読み込まれる)         |
| 費用                                                           | 計 $0.48、1 run $0.04〜0.07                                                                                               |

## Key Findings

| Priority | Finding                                                                                                                                                                         | Next Action                                                                                              |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| High     | opus の reviewer-readability は、この欠陥のレビューで control-flow.md を開かない。露出で絞る #746 の集約では、どの arm も counted run が 0 になり、verdict は unmeasured になる | #744 の CLI を作る前に、測る問いを決め直す                                                               |
| High     | reference が空でも (wiped) 欠陥を 5/5 で当てた。自然に使われる範囲で、control-flow.md は結果を動かしていない                                                                    | control-flow.md の扱いを決める                                                                           |
| Medium   | fixture の cwd は `/var/folders` の symlink を解決しないと、agent の Read パス (`/private/var/folders/...`) と一致しない                                                        | `reference_arm.ts` の fixture パスを `realpathSync` で返す修正を入れる                                   |
| Medium   | agent 本文の Calibration と Output が `${CLAUDE_PLUGIN_ROOT}/agents/_lib/...` を指し、fixture に無いので `~/.claude` を読みにいく run が出る                                    | fixture に `agents/_lib/finding-schema.md` と `calibration/CQ.md` を写すか、それらの Read を汚染から外す |
| Low      | `--agent` と `--json-schema` を併用すると `structured_output` は null になり、findings は Markdown 中の JSON で返る (haiku で確認)                                              | findings を取るには result テキストから最後の fenced JSON 配列を取り出す                                 |

## Limits

- 対象は branch-lookup の欠陥 1 種だけ。control-flow.md の Guard Clauses や Checklist の他の行は試していない
- n=10。露出率 0/10 の 95% 上限はおよそ 0.26

## Follow-up: #747 (残り 3 reference)

#747 の修正 (fixture の実パス化、汚染を本物の skills への到達に限定) を当てた fixture で、各 reference を wiped と wiped+1 で 5 run ずつ走らせた。起動と prompt は control-flow.md と同じにした。

| reference | agent | 仕込んだ欠陥 | 露出 | 当たり (wiped / wiped+1) | 汚染 | 費用 |
| --- | --- | --- | --- | --- | --- | --- |
| readability/ai-antipatterns.md | reviewer-readability | 実行時に変わらない割引を Strategy interface と 3 class で切り替える (`src/pricing.ts` 1〜21 行目) | 0/10 | 5/5 / 5/5 | 0/10 | $0.49 |
| testability/pure-functions.md | reviewer-testability | 引数の配列へ `cart.push(item)` して合計を返す (`src/cart.ts` 7〜12 行目) | 0/10 | 5/5 / 5/5 | 0/10 | $0.47 |
| silence/detection-patterns.md | reviewer-silence | async 関数 `saveAuditEvent` を await も catch も無く呼ぶ (`src/audit.ts` 11〜13 行目) | 0/10 | 5/5 / 5/5 | 0/10 | $0.48 |

- 当たりは is_hit の行範囲の重なりで判定し、全 30 run の result テキストが欠陥の主題 (strategy/class、mutation/push、await/promise) に触れていることも確かめた
- 10 run が `~/.claude/agents/_lib/` を `ls` か Read した。修正後の判定では汚染にならない
- 4 つの reviewer reference を合わせて、露出は 0/40、reference が空の wiped arm の当たりは 20/20

## Conclusion

opus の reviewer 3 種は、ここで試した欠陥のレビューで skill の reference を開かず、SKILL.md と model 自身の知識だけで欠陥を当てる。露出で絞る集約では、この 4 reference はどれも unmeasured にしかならない。/ablate で reference を測る CLI は、露出がある reference が見つかるまで作らない。
