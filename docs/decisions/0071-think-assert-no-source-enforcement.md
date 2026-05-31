---
status: "accepted"
date: 2026-06-01
decision-makers: thkt
---

# ADR-0071: think と assert の no-source 状態の統一原則と enforcement 非対称

## Context and Problem Statement

think と assert は同じ「no-source 状態」(判断の根拠が見つからない状態) を逆向きに扱っている (確証バイアス対策 Gap1+2、DA verdict 2026-05-02)。think の step-1 Gate は Why field (Outcome/Problem) が vague なら dialog を強制し halt する。assert の adversarial Verdict Rules は「no source found or source confirms → promote」で、確認できない test も finding に promote する false-positive generator になっている。両者の no-source 出口を統一原則で確定し、その原則を bypass できない enforcement を定める。

## Decision Drivers

- no-source の扱いが think と assert で不統一 (V2 high)
- enforcement が生成 LLM 自身の self-judge に依存し bypass 可能 (V5 high)。think の `UNKNOWN — probe: X` placeholder は text 指示の Gate をすり抜ける
- #36 (PR #54) で「LLM の gate 判定は consumer 側の機械 decode で enforce し、生成 agent に self-judge させない」を実証済み

## Considered Options

- Option A: 全 no-source を dialog 強制 (think 流を assert に拡張)
- Option B: 全 no-source を defer (assert 流を think に拡張)
- Option C: spine に self-judge 禁止を置き、routing (定義=halt / 検証=defer) と非対称 enforcement を載せる

## Decision Outcome

Option C を採用する。

### 核 (spine)

生成 LLM は no-source 状態を self-judge してはいけない。判定を生成 agent の外に出す。これが両 Gap を貫く原則で、#36 の evidence に乗る。

### routing rule

no-source の出口は field の役割で決まる。define-or-verify、cost-of-wrong-default、who-can-resolve の3軸が同じ振り分けに収束する。

| 役割 | 例                          | 出口                           | 理由                                                                     |
| ---- | --------------------------- | ------------------------------ | ------------------------------------------------------------------------ |
| 定義 | think Why (Outcome/Problem) | dialog 強制 + human checkpoint | 空白だと後続 Scope/AC/Spec が導出不能。human しか埋められない            |
| 検証 | assert adversarial test     | defer                          | 後で evidence で解決可。promote は self-judge の偽陽性、exclude は見逃し |

### enforcement の非対称

assert は decision が discrete (verdict enum, gate enum) なので機械 gate で enforce できる (#36 と同形、強い)。think の「この Why が genuine か fabricated-plausible か」は discretize できない。hook は literal placeholder (UNKNOWN) と absence は reject できるが、`TBD pending analytics` のような fabricated-plausible は捕れない (text 指示と同じ arms race が hook 側に移動するだけ)。よって think は dialog-forcing と human checkpoint に依存する。両者を symmetric な hook validator として書くことは、この initiative が防ごうとする false-confidence そのものなので避ける。

### Consequences

- Good, no-source の確認不能 test が finding に昇格しなくなり false-positive が減る
- Good, gate 判定が生成 agent の self-confidence から外部化される
- Bad, think 側の enforcement は原理的に弱く、human checkpoint が残る。これは隠さず明記する

### Confirmation

V2 は routing と spine で no-source 扱いを統一して閉じる。V5 は spine の self-judge 禁止で閉じ、enforcement の非対称を正直に書くことで false-confidence を避ける。chain が #36 の出荷物に乗ることを確認した。adversarial defer は gate-decision の Ready (caveat) intent_deferred に渡り、ADR-0025 の /goal Integration で Ready (caveat) は completion を signal しない。確認不能な test は merge を block しないが auto-complete もせず human に surface する。

## Pros and Cons of the Options

### Option A (全て dialog 強制)

- Good, 一貫して止まる
- Bad, assert の自動検証フローが対話で停止し /goal ループが回らない

### Option B (全て defer)

- Good, 一貫して継続する
- Bad, think の定義空白を defer すると後続の Scope/AC/Spec が宙に浮く

### Option C (spine + routing + 非対称 enforcement)

- Good, 定義と検証で cost-of-wrong が違うことを正しく扱う
- Good, enforcement を実装可能な形 (assert=機械 gate、think=dialog+human) に分ける
- Bad, 出口が2つあるため原則の説明コストがかかる

## More Information

### Implications (design-only, implementation deferred)

実装は本 ADR の対象外 (#23 Scope)。原則から導かれる変更案を記録する。

1. adversarial Verdict Rules を promote / exclude / defer の3値にし、no-source を promote から defer に修正する
2. gate-decision の Ready (caveat) reason を env_failure / intent_deferred / both に構造化する
3. think Why field の UNKNOWN を SOW Write 時に hook で reject する (literal と absence のみ。fabricated-plausible は対象外と明記する)

### Trade-offs

think の機械 enforcement を諦める代わりに、原則の誠実さ (捕れないものを捕れると言わない) を取る。

### Reassessment Triggers

- think の Why field に machine-checkable な schema を与える手段が見つかったとき
- assert の defer が intent_deferred として滞留し /goal ループの妨げになったとき

### References

- Issue #23 (Gap1+2 統一)、#36 / PR #54 (reviewer JSON 化、self-judge 排除の evidence)
- ADR-0025 (ralph-loop 退役、native /goal 採用。Ready (caveat) non-completion の前提)
- arxiv `2603.18740` は元記事からの引用で独自 verify 未実施。claimed, unverified inspiration として扱い、本 ADR の論拠には含めない
