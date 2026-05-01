---
status: "accepted"
date: 2026-04-20
decision-makers: thkt
---

# Adopt snapshot as canonical source with rendered Markdown output for audit reports

## Context and Problem Statement

audit 出力の成果物は `snapshot.yaml` と `output.md` の 2 ファイル。ADR 0046 で両者を `skills/audit/{templates,references}/` に移動して位置は整理したが、形式・canonical source・テンプレ仕様の決定は残っている。実運用棚卸しで以下が判明:

- snapshot の schema が時期でブレる (2026-04-05 は summary 中心、2026-04-15 は findings 配列完備)
- テンプレ `snapshot.yaml` は実運用のどちらとも一致しない (aspirational)
- `output.md` の filter 付きプレースホルダ (`{items[fix_type=auto].id}`) の展開規則が未定義
- runtime が template を enforce しないため LLM 任意で揺らぐ
- canonical source が暗黙で、delta 計算 (毎回走る machine touchpoint) の信頼性に影響

## Decision Drivers

- アウトカム起点: 今すぐ読む (human) + 数週後引く (machine/human) + delta 計算 (machine) + 次回 audit input (machine)
- Delta 計算は audit 毎に走る primary machine touchpoint - machine reliability は load-bearing
- ADR 0044 精神: stateful 複雑さは empirical 証拠なしに追加しない
- SSoT 明示で同期ズレを構造的に防止

## Considered Options

### A. Markdown 統合 (α案)

`snapshot.yaml` と `output.md` を 1 つの Markdown ファイル (frontmatter + body) に統合。

- Good: SSoT が 1 ファイルで明示
- Good: human が直接読める
- Good: ファイル数半分
- Bad: Markdown table の parse が YAML より脆い (escaped pipes, multiline cells, 列ズレ)
- Bad: delta 計算の primary touchpoint の reliability を妥協
- Bad: 深いネスト (five_whys 等) の表現が弱い

### B. YAML 維持 + output を render (β案、採択)

`snapshot.yaml` = canonical、`output.md` = snapshot から render された view。integrator が snapshot を fill、Leader が snapshot を読んで Markdown 組み立て。

- Good: machine reliability 維持 (delta 計算は YAML parse)
- Good: human experience は α と同等 (render された MD を読む)
- Good: SSoT が snapshot として明示、output は view
- Bad: render 責務 (integrator の出力 → Leader の組み立て) を明示する必要
- Bad: 情報重複は構造的には残る (snapshot と render 済み output)

### C. 現状維持 + スリム化 (γ案)

テンプレ内の冗長記述だけ整理、形式や canonical 決定は保留。

- Good: 最小変更
- Bad: 時期ブレ問題が継続
- Bad: canonical source の曖昧さ残存

## Decision Outcome

採択 Option B (案 β)。全アウトカム領域 (human/machine/delta) で Option A 同等以上、machine reliability を妥協しない。Option C は根本問題 (canonical 不明、時期ブレ) を解消しない。

### Positive Consequences

- snapshot.yaml が canonical source として明示される
- delta 計算が YAML parse の堅牢性を維持
- output は snapshot からの view として責務が明確化 (render ロジック)
- 実運用の 2026-04-15 式を標準化し、時期ブレを解消

### Negative Consequences

- 情報が snapshot と render 済み output の両方に存在 (構造的な重複)
- render 責務の明示が新たに必要 (integrator 出力 schema の厳格化)
- LLM が snapshot を経由せず output だけ書く抜け道は runtime enforce まで残る

## Implementation Scope

### In scope (今セッション)

1. `skills/audit/templates/snapshot.yaml` 書き換え (EN/JA)
   - 2026-04-15 式を標準化: findings 配列トップレベル、trust_score、delta セクション、pipeline_health boolean 分解
   - 削除: meta ラッパ、validation.{challenged/confirmed/disputed/downgraded/needs_context}、root_causes[] 独立定義、priorities[]、suggestions[]
   - canonical 明示: 「このファイルが audit の真実。output は view」

2. `skills/audit/templates/output.md` 書き換え (EN/JA)
   - filter 付きプレースホルダ (`{items[fix_type=auto].id}`) 削除 → 素のテーブル展開に
   - 実運用反映: Confirmed Findings テーブル追加、Root Causes に Effort 列、Actions 3 段階、FP率表示、Needs Review 0件省略ルール明記
   - render 元明示: 「snapshot.yaml の X フィールドを参照してこう render」

3. `agents/teams/team-integration.md` (EN/JA) 更新
   - snapshot を canonical として出力する責務を明示

### Out of scope (別 ADR / 別セッション)

- runtime 側で template schema を厳格 enforce する仕組 (validator 実装)
- 案 α への将来移行
- trust_score の算出ロジック明文化 (ADR 0035 の拡張で別途)

## Reassessment Triggers

- LLM が snapshot と output を不整合に書く事例が多発 → runtime enforce 強化を検討
- Markdown parse の要件が出てきた (例: output から自動集計) → Option A 再考
- 2 時期ブレが再発 (2026-04-15 式の次に別 schema が出現) → template enforce の仕組化

## Related ADRs

- [ADR 0035: Audit/verify convergence signal and reconciliation ownership](0035-audit-verify-convergence-signal-and-reconciliation-ownership.md)
- [ADR 0042: Colocate Skill-Specific Scripts Within Skill Directory](0042-colocate-skill-specific-scripts-within-skill.md)
- [ADR 0043: Normalize findings in audit multi-run aggregation](0043-normalize-findings-in-audit-multi-run-aggregation.md)
- [ADR 0044: Reject snapshot-aware audit pipeline](0044-reject-snapshot-aware-audit-pipeline.md) - 複雑さ追加回避の精神と整合
- [ADR 0046: Colocate audit assets under skills/audit with references and templates split](0046-colocate-audit-templates-in-skill-references.md) - 位置整理の前提

---

_Created: 2026-04-20_
_Author: thkt_
_ADR Number: 0047_
