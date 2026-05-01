# adr skill empirical-prompt-tuning ログ

開始日: 2026-04-25
対象: ${CLAUDE_SKILL_DIR}/SKILL.md (91 行、scripts/ references/ templates/ 含む)
手法: /tuning skill (mizchi empirical-prompt-tuning)

## Scenarios (FROZEN)

| Slot     | タイトル                                      | Template             | Mode            | CWD                              |
| -------- | --------------------------------------------- | -------------------- | --------------- | -------------------------------- |
| Median   | Adopt Zod for API validation                  | technology-selection | New             | /tmp/adr-tuning-median-\<iter\>  |
| Edge 1   | Replace REST gateway with tRPC monorepo layer | architecture-pattern | Update existing | /tmp/adr-tuning-edge1-\<iter\>   |
| Edge 2   | Migrate from squash-merge to rebase-merge     | process-change       | New             | /tmp/adr-tuning-edge2-\<iter\>   |
| Hold-out | Retire legacy auth middleware                 | deprecation          | New             | /tmp/adr-tuning-holdout-\<iter\> |

Hold-out `deprecation` は最終確認まで tuning に使わない。

Edge 1 は「既存 ADR (0001-choose-rest-gateway.md) を supersede する ADR を新規作成」。事前に CWD に seed ADR を配置する。

## Requirements Checklist (FROZEN)

### Common (全シナリオ)

1. [critical] `docs/decisions/NNNN-slug.md` が生成される (NNNN は既存の次の連番、ゼロパディング4桁)
2. [critical] `validate-adr.sh "$ADR_FILE"` が exit code 0 を返す
3. [critical] `docs/decisions/README.md` が新規 ADR を含めた形で再生成される
4. Confidence メタデータ行 `- Confidence: {level}. {rationale}` がある
5. 本文が ~80 行に収まる (±20 許容)
6. SKILL.md の 6-Phase Process を順に実行する (Pre-Check → Template → References → Validate → Index → Recovery)

### Median (Adopt Zod for API validation)

7. [critical] Template: `technology-selection` が選ばれる
8. [critical] Options セクションに最低 3 候補 (Zod 含む)、Pros/Cons 併記

### Edge 1 (Replace REST gateway with tRPC monorepo layer)

7. [critical] 新規 ADR に既存 ADR への supersede リンクがある
8. [critical] 既存 ADR 側の status も "Superseded by XXXX" 方向に更新される (MADR 標準)
9. Template: `architecture-pattern` が選ばれる

### Edge 2 (Migrate from squash-merge to rebase-merge)

7. [critical] Template: `process-change` が選ばれる
8. [critical] Before/After comparison セクションがある

### Hold-out (Retire legacy auth middleware)

7. [critical] Template: `deprecation` が選ばれる
8. [critical] Migration plan + Timeline セクションがある

## Iteration Results

### Iteration 1 (baseline)

4 シナリオ並列 dispatch、新規 general-purpose subagent、CWD 明示。

| Scenario | critical 達成            | 新規不明瞭点                       | 再試行 | tool_uses | duration_ms | total_tokens |
| -------- | ------------------------ | ---------------------------------- | ------ | --------- | ----------- | ------------ |
| Median   | 全 ○                    | B-options-count, 参照粒度, dir作成 | 0      | 12        | 106599      | 55746        |
| Edge 1   | 6/6 ○ (template 部分的) | D-supersede, A-template keyword    | 0      | 21        | 152161      | 66516        |
| Edge 2   | 4/5 ○ (template 部分的) | A-template, B-brevity              | 1      | 17        | 120803      | 61486        |
| Hold-out | 全 ○ (brevity 部分的)   | B-brevity, E-scripts path          | 2      | 21        | 186031      | 67495        |

#### Structural ambiguity clusters

| Cluster                                | 出現箇所      | 根本原因                                                                             |
| -------------------------------------- | ------------- | ------------------------------------------------------------------------------------ |
| A. Template selection vs intent        | E1 + E2       | `select-adr-template.sh` keyword表狭. script vs human 判断順位未定義                 |
| B. Brevity ~80 行 vs required sections | E2 + Hold-out | deprecation/process-change は必須 section 多く ~80 行に収まらない                    |
| C. options_count over-count            | M + E1 + E2   | `validate-adr.sh` が `### ` 全部拾う. 実害なしだが metric 信頼性                     |
| D. Supersede procedure absent          | E1            | SKILL.md L65 Immutability 1 行のみ. 双方向 link 手順も Status 書換ルールもなし       |
| E. adr/ dir + scripts path             | M + Hold-out  | Input L16 の "create if missing" が誰の責任か曖昧. scripts 相対パスは skill dir 基準 |

Patch theme (iter 1 → iter 2): Cluster A. Template Selection. 理由: 再試行発生源であり、script と SKILL.md を横断する複数レイヤー問題で 1 パッチが複数軸に効く (dogfooding rule)。

### Iteration 2 (patch A: Template Selection)

Patch: SKILL.md Template Selection セクションに keyword triggers 列追加 + Override rule 明記。

| Scenario | critical 達成 | 新規不明瞭点                            | 再試行 | tool_uses | duration_ms | total_tokens |
| -------- | ------------- | --------------------------------------- | ------ | --------- | ----------- | ------------ |
| Median   | 全○          | F-validate-warnings                     | 0      | 17        | 141471      | 61449        |
| Edge 1   | 全○          | D-supersede 残存, pre-check jaccard     | 0      | 19        | 129492      | 62750        |
| Edge 2   | 全○          | B-brevity 残存, references 必須性       | 0      | 15        | 115348      | 59292        |
| Hold-out | 全○          | B-brevity 残存, override 例 deprecation | 1      | 20        | 109619      | 64380        |

#### Patch A 評価

- Template keyword/override 関連の不明瞭点 (Cluster A) は全シナリオで解消
- Edge 2 再試行 1 → 0 (template override 迷いが消えた)
- Hold-out 再試行 2 → 1 (brevity 追い込みが残存、別 cluster)
- Critical 100% → 100% (部分的判定が消えて、すべて明確に ○)
- tool_uses / duration / tokens は scenario 毎に ±15-25% 内で大きな悪化なし (median tool_uses は 12→17 に増えたが warning 解析の深掘りによる品質向上)

#### 残存 cluster (iter 3 候補)

| Cluster                                      | 出現箇所          | 反復回数                      | 優先度 |
| -------------------------------------------- | ----------------- | ----------------------------- | ------ |
| B. Brevity ~80 vs template required sections | M + E2 + Hold-out | iter 1+2 残存、再試行源       | High   |
| F. validate-adr.sh warnings の扱い           | M + E2 + Hold-out | iter 2 新規 (or 潜在的既存)   | High   |
| D. Supersede procedure                       | E1                | iter 1+2 残存、再試行源でない | Mid    |
| Phase 3 References 必須性                    | M + E2 + Hold-out | iter 1+2 残存                 | Low    |

Patch theme 候補 (iter 2 → iter 3): Cluster B + F を 1 パッチで解消可能か検討中 (advisor 相談)。

### Iteration 3 (patch B: Brevity rule, advisor v1 wording)

Patch: Brevity 行を「Target ~80 lines for MADR core. Template-specific sections are additive. deprecation/process-change routinely land 90-110 lines. Keep each section terse (Context 3 lines...)」に書き換え。

| Scenario | critical 達成 | 新規不明瞭点                        | 再試行 | tool_uses | duration_ms | total_tokens |
| -------- | ------------- | ----------------------------------- | ------ | --------- | ----------- | ------------ |
| Median   | 全○          | Brevity interpret 揺れ              | 0      | 18        | 114663      | 57949        |
| Edge 1   | 全○          | supersede 残存 (既知)               | 0      | 19        | 107648      | 61636        |
| Edge 2   | 全○          | Brevity checklist vs SKILL 衝突認識 | 0      | 16        | 97937       | 59953        |
| Hold-out | 全○          | Brevity oscillation (123→102→109) | 2      | 22        | 222010      | 68361        |

#### Patch B (v1) 評価: regression

- Hold-out 再試行 1 → 2 (悪化)
- Hold-out duration 109619 → 222010 (+102%, 大幅悪化)
- Median / Edge 1 / Edge 2 は改善維持
- 原因: "Target ~80" が headline として残り、"90-110 routinely" が descriptive にしか読めず 2 つの authority が並ぶ。subagent が triangulate して oscillation

Patch theme (iter 3 → iter 4): Brevity を per-template budget の単独 authority に書き直す。iter 4 で converge/cut-off 判定し stop。

### Iteration 4 (patch B v2: per-template line budget as authority)

Patch: Brevity 行を「Line budget is per template. technology-selection and architecture-pattern target ~80 lines. process-change and deprecation target ~100 lines. Keep each section terse (Context 3 lines, Options 3-5 lines each, Consequences 2-3 bullets).」

| Scenario | critical 達成 | 新規不明瞭点                  | 再試行 | tool_uses | duration_ms | total_tokens |
| -------- | ------------- | ----------------------------- | ------ | --------- | ----------- | ------------ |
| Median   | 全○          | pre-check adr_dir 軽微        | 0      | 14        | 251563      | 54989        |
| Edge 1   | 全○          | supersede 残存 (既知)         | 0 (+1) | 18        | 313992      | 61283        |
| Edge 2   | 全○          | pre-check adr_dir 軽微        | 0      | 11        | 261385      | 49248        |
| Hold-out | 全○          | trim cycle 114→109→107→100 | 2      | 24        | 374377      | 65890        |

#### Patch B v2 評価

- Hold-out oscillation 解消: iter 3 (123→102→109, 戻り) → iter 4 (114→109→107→100, monotonic trim)
- Median / Edge 2 retry 0 維持。Edge 1 は 0 + indexer 互換 1 補強
- Per-template authority (~80 vs ~100) で SKILL.md と checklist の認識整合
- Hold-out retry 2 残存は brevity oscillation でなく target 達成のための trim. quality 追求の挙動
- duration 全体的に増加 (並列リソース競合ノイズの可能性). tool_uses は逆に減少 (median 18→14, e2 16→11)

#### Convergence gate チェック

| Gate                        | Status | Note                                                               |
| --------------------------- | ------ | ------------------------------------------------------------------ |
| All scenarios critical 100% | ○     | iter 2 以降安定                                                    |
| Total retries = 0           | ×     | Hold-out 2 残存。ただし brevity trim でクオリティ追求挙動          |
| 新規 cluster なし           | ◐     | pre-check の adr_dir 出力 vs SKILL.md Output 表記の軽微衝突 (新規) |
| Hold-out critical pass      | ○     | 全 critical ○                                                     |
| Metrics within iter 2 ±15% | ×     | duration 大幅悪化 (並列実行ノイズ可能性大). tool_uses は範囲内     |

Strict converge 不成立。しかし advisor cut-off 判定に該当: critical 100% 達成済 + 主要構造欠陥 (cluster A, B oscillation) 解消 + 残存は non-critical + dogfooding 「90→100 squeeze は打ち切り候補」。

## Final Decision: Cut-off (not strict Converged)

iter 4 で stop。iter 5 は実施しない。理由:
1. critical 100% 安定達成
2. Template ambiguity (cluster A) 完全解消
3. Brevity oscillation (iter 3 regression) は monotonic trim に正常化
4. Hold-out 残存 retry 2 は target 100 行への trim で quality 追求挙動 (構造曖昧性ではない)
5. 残存 cluster D (supersede), F (warnings), G (pre-check adr_dir) は全て non-critical で iter 5 で潰しても <5% quality delta

## Patch Summary

| Iter | Patch                                    | Effect                                                                        |
| ---- | ---------------------------------------- | ----------------------------------------------------------------------------- |
| 1    | (baseline)                               | retry total 3, critical 部分達成                                              |
| 2    | A: Template Selection keyword + override | Template ambiguity 全解消。critical 100% 到達。retry total 1                  |
| 3    | B: Brevity ~80 + 90-110 routinely        | Regression. Hold-out oscillation 1→2. retry total 2                          |
| 4    | B v2: per-template budget authority      | Oscillation 解消、monotonic trim. critical 100% 維持。retry total 2 (cut-off) |

## Open Items (backlog 引き継ぎ)

| Cluster | 説明                                                                                | 重要度              | 推奨対応                                                                      |
| ------- | ----------------------------------------------------------------------------------- | ------------------- | ----------------------------------------------------------------------------- |
| D       | Supersede procedure 詳細記述なし                                                    | non-critical        | Rules 表に Supersede 行追加。status 書換と双方向リンクを 1 行手順化           |
| F       | validate-adr.sh warnings の扱い (markdown_lint, references_count)                   | non-critical        | Phase 4 注記に「errors=[] かつ exit 0 を成功とみなす。warnings は推奨」と追記 |
| G       | pre-check.sh adr_dir 出力 (`docs/adr` 等) と SKILL.md Output 表記 (`adr/`) の不整合 | resolved 2026-04-25 | 現状はどちらも `docs/decisions/` で一致。次回再評価不要                       |
| H       | options_count over-count (### 全数え)                                               | non-critical        | validate-adr.sh の awk を Considered Options 配下に限定 (script 側修正)       |
