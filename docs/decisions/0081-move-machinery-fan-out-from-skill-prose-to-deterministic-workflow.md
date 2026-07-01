---
status: "accepted"
date: 2026-07-01
decision-makers: thkt
---

# ADR-0081: machinery の fan-out を skill prose から決定論 workflow へ移す

## Context and Problem Statement

/build の machinery phase (challenge / research / think / code / audit / polish) は各々 adversarial な agent fan-out を核に持つ。audit なら glob 表で選んだ十数体の reviewer を並列起動し、critic-audit で反証、critic-evidence で検証、team-integration で統合する。この fan-out が発火して初めて「positions to be argued」型のレビューが成立する。

実運用を計測すると、この fan-out はほぼ発火していない。全 130 件の /build dispatch のうち、9 phase をフル連鎖したのは 1 件 (0.8%)、57 件 (44%) は sub-skill を1つも dispatch せず全工程をインライン実行していた。phase 別 dispatch 率は challenge 26% / research 5% / think 9% / code 5% / audit 7% / polish 8%。orchestrator モデルは build 本体をロード後、各 sub-skill を discrete な Skill() として呼ばず、記述された作業を直接インラインで実行する。

決定的なのは、build skill は既にインラインを禁止している点。「machinery phase は必ず Skill(X) を呼び、inline 代替は禁止」と明記済みで、build skill 自体は既に thin dispatcher になっている。それでも 44% がフルインライン。つまり prose による禁止は決定論を買えない。「インラインテキストを削れば直るのでは」という仮説は、既に削られている (禁止済み) のに発火しないという計測で否定される。

fan-out が確実に発火する場所は2つしかない。main loop 自身の dispatch (これは prose 依存で上記のとおり漏れる) か、workflow script の決定論制御フロー。そして agent は fan-out を入れ子にできない。workflow が spawn する agent は Skill と advisor を持つが Task/Agent を持たないため、audit を「agent 化して skill と workflow の両方から呼ぶ」設計は fan-out を単一コンテキストのインラインに潰し、adversarial coverage を 0 にする。ゆえに fan-out は workflow script に置くしかない。

## Decision Drivers

- fan-out の trigger 率が skill path では 7% (audit)、prose 禁止は既に施行済みでなお漏れる (n=130)
- 期待カバレッジ = fidelity × trigger 率。skill path は fidelity 1.0 だが trigger 0.07。workflow path は fidelity を下げても (sonnet / headless) trigger をほぼ 1.0 にできる
- workflow の agent は Task/Agent を持たないため、fan-out を agent に閉じ込めると潰れる。fan-out は script に置く以外にない
- routing (拡張子 → reviewer 表) が skill prose にあると main loop が再導出して drift する。JS に移せば選択は決定論になる
- 対話 (focus / scope の AskUserQuestion) は fan-out の前に来る。deep-research と同型で workflow の whenToUse に置けば、launcher skill を挟まず main loop が対話してから workflow を呼べる。workflow 内部は headless で問題ない

## Considered Options

- Option A: fan-out を決定論 workflow script が所有する。audit.js を pilot unit とし、routing を JS に移植、reviewer / critic は agent。launcher skill は置かず、deep-research と同型で workflow がそのまま /audit を供給する (workflows/\*.js は自動で同名 slash command 化)。standalone の /audit からも build から workflow("audit") でも同一 script を呼ぶ
- Option B: build skill から inline prose を削り dispatch prose だけ残す
- Option C: audit を subagent 化し、skill と workflow の両方からその1体を呼ぶ
- Option D: 現状維持。skill prose のまま main loop の dispatch に委ねる

## Decision Outcome

Option A を採用する。machinery の fan-out を決定論 workflow script に移し、audit.js を最初の unit として実装した。routing 表 (拡張子 → reviewer list、focus フィルタ) を JS に移植し選択を決定論化、git I/O と各 reviewer / critic だけを agent にした。pipeline は reviewer → challenge → verify → integrate で、reviewer → aggregate は禁止。audit.js は standalone でも build から workflow("audit") でも呼べる。

/audit の launcher skill (skills/audit/ と .ja mirror) は廃止した。当初は focus / scope の対話を残すため thin launcher を保持する設計だったが、workflows/\*.js が自動で同名 slash command を生成する (deep-research と同じ機構) ため launcher は不要と判明した。対話は workflow の whenToUse に移し、main loop が focus / scope を尋ねてから args 付きで workflow を呼ぶ。build からの呼び出しも Skill("audit") でなく Workflow({name:"audit"}) に差し替えた。

### Pilot 結果

audit.js を単一の staged ファイル (audit.js 自身、292 行) に対し default focus で実行した。

| 段階                           | 結果                                                                                                               |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| Route                          | 1 agent が staged ファイル列挙 + churn 計上                                                                        |
| Review                         | routing 表通り 12 reviewer が全発火。skipped 0                                                                     |
| Challenge → Verify → Integrate | critic-audit → critic-evidence → team-integration 完走、cross-domain root cause に統合、findings は file:line 付き |
| 総計                           | 16 agent / 約 956k tokens / 22 分                                                                                  |

skill path で 7% だった audit の期待 trigger が、workflow path では実測 12/12 発火。決定論 fan-out が成立した。

### Pilot 後に足した範囲

seam 実証後、/audit skill の運用機能のうち 3 つを workflow へ移植した。

- pre-flight。tests-only (runner 検出 → test 実行 60s → pass/fail 記録)。静的解析は gates hook の担当なので linter は回さない。失敗は context 記録のみで block も finding 化もしない。build の Code phase が既に test を green まで回すため skipPreflight で nested 時は抑止
- file 数ポリシー。reviewer あたり 10 file を上限とする batch-split で per-agent 負荷を有界化。>30 file は対話 prompt が無い headless では警告して継続 (narrow-scope の対話は launcher 境界に残す)
- snapshot 永続化。integrate 後に bash agent が `$HOME/.claude/workspace/history/audit-<ts>.json` へ raw_findings / pre_flight / delta を書く disk 副作用。return 契約 (findings / assignments / skipped) は不変。script は Date.now / fs 不可のため timestamp は `date -u`、session は $CLAUDE_SESSION_ID を agent が解決

### なお deferred の範囲 (silent でなく明示)

- reviewer-causation の 5 Whys 全 findings 通しは deferred
- 複数 run の集約は deferred
- output template (templates/output.md) render は deferred。headless は構造化 object を返し、レンダリングは呼び出し側に委ねる
- reviewer は sonnet 固定。opus + 深い解析は stream watchdog を stall させる audit の既知教訓に従う
- reviewer が workflow script を監査すると、Workflow runtime 契約 (parallel の失敗隔離・入力順序保証) を知らないため RC-1 / RC-2 型の architecture-gap 指摘を上げる。これは false positive で、コード修正対象ではない

### Consequences

- Good, fan-out が main loop の裁量から外れ、routing 表通りに漏れなく発火する。skill path の 7% が workflow path で 12/12 になった
- Good, routing を JS に移したため reviewer 選択が drift しない。workflow が存在する唯一の理由 (選択の決定論化) が保証される
- Good, 対話 (focus / scope) は workflow の whenToUse に載せたため、launcher skill を廃止しても main loop が fan-out 前に尋ねられる。決定論化で対話機能を失わない
- Good, audit.js は standalone と nested の両方から同一 unit を呼ぶため、fan-out を2箇所で再現しない (build の audit phase が 6/12 reviewer に縮んでいた最悪の cut を解消する)
- Bad, fan-out を確実に回すぶん token / 時間コストが前払いになる (pilot は 12 reviewer で 956k tokens / 22 分)
- Bad, 名前付き workflow のレジストリは session 開始時のスナップショット。新規 workflow は同一 session 内では Workflow(name) で解決されず、scriptPath 起動が必要。次 session から /audit launcher が name 解決できる
- Bad, headless workflow は sonnet 固定で fidelity が opus より下がる。trigger を 1.0 に上げる対価としての fidelity 低下は許容だが、質への影響は運用で測る必要がある

### Confirmation

audit.js が workflows/audit.js と .ja mirror に存在し、pilot run が全 12 reviewer 発火 + pipeline 完走を記録したことを確認済み。本 ADR は README に登録済み。build.js の audit phase は workflow("audit") 呼び出しへ差し替え済み。/audit の launcher skill (skills/audit/ と .ja mirror) は廃止し、build/SKILL.md の呼び出しも Skill("audit") から Workflow({name:"audit"}) へ差し替えた。6/12 reviewer の curated cut を撤去し full routing に委譲、header comment と whenToUse も実態へ更新、node --check pass、.ja と mirror が identical であることを確認した。seam 実証後に pre-flight (tests-only) / file 数ポリシー (batch-split + >30 headless 警告) / snapshot 永続化を追加し、return 契約は不変のまま node --check pass と mirror identical を再確認した。残る follow-up は /audit launcher の Workflow("audit") 配線と、追加 3 機能の live pilot run 検証。

## Pros and Cons of the Options

### Option A (workflow script が fan-out を所有)

- Good, fan-out が決定論制御フローに載り trigger がほぼ 1.0 になる。pilot で 12/12 実証
- Good, routing を JS 化し drift を消す。対話は launcher 境界に残る
- Bad, token / 時間の前払いコスト。名前付きレジストリの session 境界制約

### Option B (build skill の inline prose を削る)

- Good, 追加実装なし
- Bad, build skill は既にインライン禁止済みで、それでも 44% がフルインライン (n=130)。prose を削る余地が既に無く、削っても決定論は買えない

### Option C (audit を subagent 化し両方から呼ぶ)

- Good, skill と workflow が同一 unit を共有でき、設計が対称になる
- Bad, workflow の agent は Task/Agent を持たない。fan-out を agent に閉じ込めると 12 reviewer が単一コンテキストのインラインに潰れ、adversarial coverage が 0 になる。共有すべきは router / critic であって fan-out 自体は script に置くしかない

### Option D (skill prose のまま現状維持)

- Good, 追加コストゼロ
- Bad, audit の trigger は 7%。machinery の adversarial 品質ゲートが 93% の run でバイパスされる

## Reassessment Triggers

- workflow path の trigger 率が build 内 (nested workflow) で低下した場合、build.js の呼び出し形を再検討する
- sonnet / headless の fidelity 低下が実測で coverage を削っていると判明した場合、reviewer の model 割り当てを再判断する
- audit の seam が build 内で安定したら、残る machinery phase (challenge / think / code / polish) の fan-out も workflow script に移す判断に着手する
- 名前付きレジストリの session 境界制約が運用の障害になった場合、workflow の登録形を見直す
