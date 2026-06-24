---
status: "accepted"
date: 2026-06-23
decision-makers: thkt
---

# ADR-0079: polish を Codex + cleanup へ純化し audit との境界を確定する

## Context and Problem Statement

review 系スキルは audit / assert / preview / probe / polish の 5 つ。このうち audit↔assert の境界は ADR-0035 で (static-only / static+dynamic、confidence floor 0.60 / 0.70) 確定し、preview (PR screening、独自ラベル) と probe (spec 抽出) は別ドメインで分離している。polish だけが専用 ADR を持たず、finding atom family (ADR-0078 = issue/audit/assert/challenge) にも属さない孤児だった。

polish の Phase 1 は code-review (内部 review skill、high effort) + Codex + CodeRabbit + Antigravity を並列起動し、critic-audit で challenge してから修正を適用していた。このうち code-review (内部 review) と critic-audit (audit と共有) が audit と機能的に重複し、polish が「修正も適用する audit-lite」に見える曖昧さを生んでいた。さらに ADR-0077 で audit→/fix の修正ループ (finding ID を severity で gate) が閉じたため、「内部 finding の修正適用」は audit→/fix が所有済みで、polish の内部 review + 修正と二重化していた。

加えて外部 CLI 3 種のうち Antigravity (agy) は quota 枯渇が頻発し、CodeRabbit はフリープランの rate-limit と精度の点で signal が薄かった。3 種並列はオーケストレーションと triage のコストに見合わず、polish の「軽量・スムーズ」という狙いと逆行していた。

## Decision Drivers

- polish だけ専用 ADR が無く、boundary が暗黙で曖昧
- code-review (内部 review) は audit のドメインで、polish が持つと役割が deep audit と被る
- ADR-0077 で audit→/fix が内部 finding の修正適用を所有済み
- Antigravity は quota 枯渇が頻発し、CodeRabbit は rate-limit と精度で摩擦が大きい
- Codex は OpenAI 系で Claude 以外の視点を与え、Self-Enhancement バイアス対抗 (旧 Antigravity の load-bearing 理由) を単独で引き継ぐ
- polish の固有資産は外部レビュー + cleanup (simplify/enhancer-code) と直接修正であり、これは audit が持たない

## Considered Options

- Option A: Codex + cleanup へ純化。code-review を audit に委譲し、外部レビュー source を Codex 単独に絞る。polish = Codex + critic-audit (FP gate) + cleanup + 直接修正
- Option B: 現状維持 + description 強化のみ。code-review と外部 3 種を残し重複・摩擦も残す
- Option C: polish 廃止。外部レビュー + cleanup を audit の --fix モードへ吸収

## Decision Outcome

Option A を採用する。polish の Phase 1 から code-review を外し、外部レビュー source を Codex 単独にする。CodeRabbit と Antigravity は quota / rate-limit / 精度の摩擦が固有資産に見合わないため外す。critic-audit (Phase 1.5) は Codex の過剰報告を challenge する FP gate として残し、cleanup (Phase 2: simplify + enhancer-code) と直接修正は polish 固有資産として維持する。

境界はこれで一文に縮む。Codex の指摘を叩いて軽く直す = polish、内部 reviewer で deep に findings 報告 = audit。harness-native の内部 review が欲しい時は audit を使う。

### audit との役割分担

| 軸            | polish                        | audit                          |
| ------------- | ----------------------------- | ------------------------------ |
| review source | 外部 CLI (Codex)              | 内部 reviewer-\* fan-out       |
| 出力          | 修正を直接適用                | findings 報告 + snapshot       |
| FP 抑制       | critic-audit (1 回 challenge) | critic-audit + critic-evidence |
| 深さ          | 軽量・前面                    | deep・read-only                |
| 修正ループ    | 直接適用 (前面)               | audit→/fix (ID gate、ADR-0077) |

### 外部ツールを Codex 単独に絞る理由

Codex (OpenAI 系) は Claude 以外の視点を与え、Claude 生成コードの Self-Enhancement バイアスに対抗する。これは旧 Antigravity の load-bearing 理由だったが、Codex も non-Claude なので単独で同じ性質を満たす。Antigravity は quota 枯渇が頻発し、CodeRabbit は rate-limit と精度で signal が薄いため、両者を外しても cross-family の懐疑性は Codex が保持する。security の深掘りは audit (reviewer-security) が所有するため、CodeRabbit の security レーンを外す損失は audit が吸収する。

### Consequences

- Good, polish↔audit の境界が「外部 vs 内部」「修正 vs 報告」で一文に縮み、audit-lite の曖昧さが消える
- Good, code-review (内部 review) の所有が audit に一本化され、内部 review の二重 entry point が消える
- Good, 外部ツールが Codex 1 本になり、quota 枯渇・rate-limit の摩擦が消え、polish の「軽量・スムーズ」が回復する
- Good, ADR-0077 の audit→/fix と polish 直接修正が、内部 finding (audit→/fix) と外部 finding (polish) で棲み分く
- Bad, 外部レビュー source が Codex 単独になり、codex 未導入・障害時は Phase 1 が空になり polish は cleanup のみになる。これは「Codex の指摘を叩く」という polish の定義に整合し、cleanup は常に利用可能なので degrade でなく仕様
- Bad, Antigravity の Gemini 固有の catch と多様性は失う。cross-family の non-Claude 性は Codex が保つが、二つ目のモデル視点は無くなる
- Bad, polish SKILL.md の Phase 1 (table/step/output/error) から code-review / CodeRabbit / Antigravity を除去する改修が要る

### Confirmation

polish/SKILL.md の Phase 1 外部レビューが Codex 1 source のみで、code-review / coderabbit / agy への呼び出しが本文・table・step・output・error から消えていることを diff で確認する。critic-audit (Phase 1.5)、cleanup (Phase 2)、direct fix は維持する。preview/probe/assert/audit は変更しない。

## Pros and Cons of the Options

### Option A (Codex + cleanup へ純化)

- Good, 境界が外部 vs 内部で最も明確。固有資産だけ残る。外部ツール 1 本で摩擦最小
- Bad, Codex 障害時に Phase 1 が空になる (cleanup は残る)。Gemini の多様性を失う

### Option B (現状維持 + 説明強化)

- Good, 改修コスト最小
- Bad, code-review の重複と外部 3 種の摩擦が残り audit-lite の曖昧さが消えない

### Option C (audit へ吸収)

- Good, スキル数削減
- Bad, ADR-0077 の audit→/fix ループと衝突。外部レビュー + cleanup の独自性が audit に埋もれる

## Reassessment Triggers

- Codex が恒常的に使えず polish が事実上 cleanup 専用に退化した場合、simplify/enhancer-code への直接統合を再検討
- Antigravity の quota や CodeRabbit の精度が改善し、cross-family の二つ目視点が triage コストに見合うようになった場合、外部 source への再投入を再判断
- audit→/fix が外部レビュー finding も受けるよう拡張された場合、polish の直接修正の所有を再判断
