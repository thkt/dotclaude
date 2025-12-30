<!--
Golden Master: SOW - Workflow Improvement

選定理由:
- sow-spec-reviewer スコア: 95/100
- Phase分割による段階的改善アプローチ
- ✓/→/? マーカーの一貫した使用
- 定量的な現状分析（コマンド行数、コンテキストサイズ）
- 具体的なAcceptance Criteria（Day単位の計画）

特徴:
- 4フェーズに分けた実装計画
- 既存ワークフローとの互換性考慮
- リスクの信頼度別分類

参照元: ~/.claude/workspace/planning/2025-12-16-spec-driven-workflow-improvement/

Last Reviewed: 2025-12-17
Update Reason: メンテナンスメタデータフィールド追加
Previous Version: N/A
-->

# SOW: Spec駆動開発プラクティスに基づくワークフロー改善

Version: 1.0.0
Status: Draft
Created: 2025-12-16

---

## Executive Summary

[→] Spec駆動開発プラクティスを現在のClaude Codeワークフローに適用し、Context Confusion対策とプロンプト品質の向上を図る。段階的なアプローチで、既存ワークフローとの互換性を維持しながら改善を実施する。

**主要な改善領域**:

1. コンテキスト最小化（S/N比向上）
2. ゴールデンマスター手法の導入（品質定量化）
3. コマンドの単一責任化（保守性向上）
4. 指示の簡素化（技術的負債削減）

---

## Problem Analysis

### Current State [✓]

| 指標 | 現状値 | 問題 |
| --- | --- | --- |
| コマンド総数 | 28ファイル | 管理負荷 |
| 最大コマンド行数 | 809行（/think） | 複雑すぎる |
| /code参照コンテキスト | 2,827行 | S/N比低下 |
| 単一責任違反 | 3コマンド | 保守性低下 |

Evidence: `wc -l ~/.claude/commands/*.md`、リサーチ結果

### Verified Issues [✓]

- [✓] /code が2,827行のコンテキストを参照 - Evidence: wc -l計測
- [✓] /think が2成果物（sow.md + spec.md）を同時生成 - Evidence: think.md:330-340
- [✓] 500行超のコマンドが4つ存在 - Evidence: wc -l結果

### Inferred Problems [→]

- [→] コンテキスト過多がLLMの出力品質に影響
- [→] 複雑なプロンプトが予測困難な動作を引き起こす
- [→] 技術的負債として保守コストが増加

### Suspected Issues [?]

- [?] 実際のLLM処理でコンテキストサイズが性能に影響する閾値
- [?] チーム採用時の学習コスト
- [?] ツール非依存化のROI

---

## Assumptions & Prerequisites

### Verified Facts (✓)

- [✓] 現在のコマンド構成（28ファイル）- Evidence: find結果
- [✓] /code はモジュール分割済み（ADR 0001）- Evidence: references/commands/code/
- [✓] 成果物フローはファイルベース - Evidence: workspace/planning/

### Working Assumptions (→)

- [→] 記事の7プラクティスは現環境に適用可能
- [→] 段階的な改善で既存ワークフローを壊さない
- [→] ゴールデンマスター手法で品質を定量化できる

### Unknown/Needs Verification (?)

- [?] コンテキスト削減による実際の効果測定方法
- [?] 最適なコマンド行数の目安（50行？100行？）
- [?] テンプレート外部化のベストプラクティス

---

## Solution Design

### Proposed Approach [→]

**Phase 1: 即効性の高い改善（1-2日）**

- ゴールデンマスター導入
- コンテキスト最小化の設計

**Phase 2: 構造的改善（3-5日）**

- /think 分割（/sow + /spec）
- 巨大コマンドの簡素化

**Phase 3: 長期的改善（検討段階）**

- ツール非依存化の段階的移行

### Alternatives Considered

| オプション | Pros | Cons | 評価 |
| --- | --- | --- | --- |
| [→] A: 段階的改善 | 低リスク、互換性維持 | 時間がかかる | **採用** |
| [→] B: 一括リファクタリング | 一貫性確保 | 高リスク、ダウンタイム | 不採用 |
| [→] C: 現状維持 | 工数ゼロ | 問題継続 | 不採用 |

### Recommendation

**オプションA: 段階的改善** - Confidence: [→]

Rationale:

- 既存ワークフローへの影響を最小化
- 各フェーズで効果を検証可能
- ロールバックが容易

---

## Test Plan

### Unit Tests (Priority: High)

- [ ] ゴールデンマスターとの出力比較テスト
- [ ] コンテキスト削減後のコマンド動作テスト
- [ ] /sow と /spec 分割後の個別動作テスト

### Integration Tests (Priority: Medium)

- [ ] /research → /sow → /spec → /code フロー
- [ ] コンテキストファイルの自動読み込み
- [ ] sow-spec-reviewer との連携

### E2E Tests (Priority: Low)

- [ ] /full-cycle での完全ワークフロー
- [ ] 新規プロジェクトでの初期セットアップ

---

## Acceptance Criteria

### Phase 1: ゴールデンマスター導入

- [ ] [✓] golden-masters/ ディレクトリ作成
- [ ] [✓] SOW/Spec の理想例を最低3つ蓄積
- [ ] [→] プロンプト品質の比較基準を確立

### Phase 2: コンテキスト最小化

- [ ] [→] /code の参照コンテキストを1,500行以下に削減
- [ ] [→] 必須原則と参照原則の分離ドキュメント作成
- [ ] [?] S/N比向上の効果測定

### Phase 3: コマンド分割

- [ ] [→] /think → /sow + /spec に分割
- [ ] [→] 各コマンドが単一成果物を生成
- [ ] [✓] 既存ワークフローとの互換性維持

### Phase 4: 指示の簡素化

- [ ] [→] 500行超コマンドを200行以下に
- [ ] [→] テンプレートの外部ファイル化
- [ ] [?] 可読性・保守性の向上確認

---

## Implementation Plan

### Phase 1: ゴールデンマスター導入（Day 1）

```markdown
1. golden-masters/ ディレクトリ作成
2. 既存の優れたSOW/Specを選定
3. 品質基準ドキュメント作成
```

### Phase 2: コンテキスト最小化設計（Day 2）

```markdown
1. 必須原則の特定（TDD, Occam's Razor）
2. 参照原則の分離（SOLID, DRY等）
3. タスクタイプ別コンテキスト選択の設計
```

### Phase 3: /think 分割（Day 3-4）

```markdown
1. /sow コマンド作成（sow.md生成のみ）
2. /spec コマンド作成（spec.md生成のみ）
3. /think を薄いオーケストレーターに
4. 既存参照の更新
```

### Phase 4: 指示の簡素化（Day 5+）

```markdown
1. 核心的な指示の抽出
2. templates/ ディレクトリ作成
3. 巨大コマンドのリファクタリング
```

---

## Success Metrics

- [✓] golden-masters/ に3+の理想例 - Measurable: ファイル数
- [→] /code参照コンテキスト 50%削減 - Measurable: wc -l
- [→] 500行超コマンド数 0 - Measurable: wc -l
- [?] プロンプト品質向上 - Measurable: レビュースコア比較

---

## Risks & Mitigations

### High Confidence Risks (✓)

| リスク | 影響 | 軽減策 |
| --- | --- | --- |
| [✓] 既存ワークフロー破損 | 高 | 段階的移行、互換性レイヤー |
| [✓] コンテキスト削減で機能低下 | 中 | 必須原則の慎重な選定 |

### Potential Risks (→)

| リスク | 影響 | 軽減策 |
| --- | --- | --- |
| [→] 改善効果が測定困難 | 中 | ゴールデンマスター比較 |
| [→] 学習コスト増加 | 低 | ドキュメント整備 |

### Unknown Risks (?)

| リスク | モニタリング | 準備 |
| --- | --- | --- |
| [?] LLMバージョン依存 | 新バージョンでテスト | ロールバック手順 |

---

## Verification Checklist

Before starting implementation, verify:

- [x] リサーチ結果の確認
- [ ] 既存ワークフローのバックアップ
- [ ] 各フェーズの成功基準の合意
- [ ] ロールバック手順の確認

---

## References

- リサーチ結果: ~/.claude/workspace/research/2025-12-16-spec-driven-workflow-improvement.md
- 関連ADR: ADR 0001（/code モジュール分割）
