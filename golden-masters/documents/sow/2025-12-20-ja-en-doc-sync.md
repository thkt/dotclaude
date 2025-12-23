# SOW: 日英ドキュメント完全同期プロジェクト

Version: 1.0.0
Status: Draft
Created: 2025-12-20

---

## Executive Summary

[→] 英語版ドキュメント（~/.claude/）と日本語版ドキュメント（~/.claude/ja/）の同期率を現在の80%から100%に向上させる。優先度に基づいた段階的アプローチにより、リスクを最小化しながら完全同期を実現する。

**主要改善領域**:

0. 最適化新規ファイル翻訳（2ファイル）- Rules最適化で新規作成
1. Core Rules同期（2ファイル欠落）- 最優先
2. Guidesシリーズ翻訳（6ファイル欠落）- ワークフロー理解向上
3. Commands/code モジュール翻訳（6ファイル欠落）- 実装詳細補完
4. 差分ファイル同期（6ファイル、最適化後）- 内容整合性確保

---

## Problem Analysis

### Current State [✓]

| カテゴリ | 英語版 | 日本語版 | 同期率 | 状態 |
|---------|------|--------|------|------|
| Rules | 22 | 20 | 91% | 🟢 良好 |
| Skills | 15 | 16 | 94% | 🟢 優秀 |
| Commands | 34 | 26 | 76% | 🟡 改善余地 |
| Docs | ~15 | ~7 | 47% | 🔴 要対応 |
| **全体** | ~86 | ~69 | **80%** | 🟡 改善必要 |

Evidence:

- File count: `find ~/.claude -name "*.md" | wc -l`
- Sync analysis: `/research` 実行結果
- Detailed report: `workspace/research/2025-12-20-ja-en-doc-sync.md`

### Verified Issues [✓]

- [✓] Rules最適化により新規ファイル2個作成 - Evidence: PRINCIPLE_RELATIONSHIPS.md, PRE_TASK_CHECK_VERBOSE.md作成（2025-12-21）
- [✓] Core Rules 2ファイル欠落 - Evidence: rules/core/ESSENTIAL_PRINCIPLES.md, PRE_TASK_CHECK_COMPACT.md不在
- [✓] Guides 6ファイル全欠落 - Evidence: docs/guides/part1-6全て日本語版なし
- [✓] Commands/code 6ファイル全欠落 - Evidence: commands/code/配下全て日本語版なし
- [✓] 差分ファイル6個（最適化後更新）- Evidence: PROGRESSIVE_ENHANCEMENT.md 89行 vs 51行 = -38行（改善）

### Inferred Problems [→]

- [→] Core Rulesの欠落によりクイックリファレンスが機能不全
- [→] Guidesの欠落によりワークフロー学習コスト増加
- [→] Commands/codeの欠落により実装詳細が不明瞭
- [→] 差分により英日間で情報の不整合

### Suspected Issues [?]

- [?] 最適化による差分変化の具体的内容（-38行、-32行等）
- [?] LEAKY_ABSTRACTION.md大幅削減（244→154行）の理由と翻訳方針
- [?] 日本語版専用ファイル（4個）の英語版作成要否
- [?] 完全同期後の継続的同期メンテナンス方法

---

## Assumptions & Prerequisites

### Verified Facts (✓)

- [✓] 英語版構造: ~/.claude/{rules,docs,commands,skills}/ - Evidence: ls -la結果
- [✓] 日本語版構造: ~/.claude/ja/（ミラー） - Evidence: ls -la結果
- [✓] DOCUMENTATION_RULES.md存在 - Evidence: docs/DOCUMENTATION_RULES.md
- [✓] Git管理下（バックアップ不要） - Evidence: git status実行可能
- [✓] 同期ツール: Bash, Read, Write, Edit available

### Working Assumptions (→)

- [→] 欠落ファイルは翻訳未実施（意図的削除ではない）
- [→] 行数差分は翻訳時の自然な省略
- [→] 技術用語の一貫性維持が翻訳品質の鍵
- [→] 段階的実行により既存ワークフローへの影響最小化

### Unknown/Needs Verification (?)

- [?] ユーザーの希望スコープ（Option A/B/Cのどれか）
- [?] PROGRESSIVE_ENHANCEMENT.md -46行差分の具体的理由
- [?] 日本語専用ファイルの扱い（例外リスト追加 or 英語版作成）
- [?] 同期後の継続的メンテナンス体制

---

## Solution Design

### Proposed Approach [→]

**Option A: 段階的同期（推奨）⭐**

**Phase 0: 最適化新規ファイル（30分）** ← NEW!

- PRINCIPLE_RELATIONSHIPS.md翻訳
- PRE_TASK_CHECK_VERBOSE.md翻訳

**Phase 1: Core Rules（30分）**

- 最優先2ファイルの翻訳
- 即座に効果が出る

**Phase 2: Guides（3-4時間）**

- ワークフロー理解向上
- 学習コスト削減

**Phase 3: Commands/code（1-2時間）**

- 実装詳細の補完
- モジュール構造の完全理解

**Phase 4: 差分同期（1-2時間）** ← 時間延長

- 最適化後の差分状態に同期
- LEAKY_ABSTRACTION.md大幅削減対応

**Phase 5: その他（2-3時間）**

- hookify, issue.md等の残り
- 完全同期達成

**Total**: 9-13時間（Phase 0追加、Phase 4延長）

### Alternatives Considered

| Option | Pros | Cons | 評価 |
|--------|------|------|------|
| [→] A: 段階的同期 | 低リスク、効果確認可能、ロールバック容易 | 時間かかる | **採用** |
| [→] B: 一括同期 | 管理シンプル、一貫性確保 | 同じ工数、優先度無視 | 次善策 |
| [→] C: 最小限同期 | 超高速（30分）、即効性 | 80%→91%止まり | 検証用 |
| [→] D: 現状維持 | ゼロ工数 | 問題継続、学習コスト維持 | 却下 |

### Recommendation

**Option A: 段階的同期** - Confidence: [→]

Rationale:

- 各Phase完了時に効果測定可能
- 問題発生時の影響範囲限定
- ユーザーフィードバック反映可能
- 既存ワークフロー影響最小
- 優先度順に価値提供

---

## Test Plan

### Unit Tests (Priority: High)

- [ ] [✓] 翻訳後ファイルのMarkdown構文検証
- [ ] [✓] 相対リンクの正常動作確認（ja/配下のパス調整）
- [ ] [→] セクション構造の英日一致確認
- [ ] [→] 技術用語の一貫性チェック

### Integration Tests (Priority: Medium)

- [ ] [→] クロスリファレンスリンクの全件検証
- [ ] [→] DOCUMENTATION_RULES.mdチェックリスト実行
- [ ] [?] Golden Masterとの品質比較（構造一致度）

### E2E Tests (Priority: Low)

- [ ] [?] 完全同期後の`/context`コマンド実行
- [ ] [?] 日本語環境でのワークフロー全体動作確認

---

## Acceptance Criteria

### Phase 1: Core Rules（30分）

- [ ] [✓] ESSENTIAL_PRINCIPLES.md翻訳完了
- [ ] [✓] PRE_TASK_CHECK_COMPACT.md翻訳完了
- [ ] [✓] 相対リンク動作確認
- [ ] [✓] Git commit & push完了

### Phase 2: Guides（3-4時間）

- [ ] [→] part1-three-layer-architecture.md翻訳完了
- [ ] [→] part2-research-investigation.md翻訳完了
- [ ] [→] part3-think-sow-spec.md翻訳完了
- [ ] [→] part4-code-implementation.md翻訳完了
- [ ] [→] part5-review-quality.md翻訳完了
- [ ] [→] part6-pre-task-check.md翻訳完了
- [ ] [→] 全6ファイルの構造一致確認

### Phase 3: Commands/code（1-2時間）

- [ ] [→] completion.md翻訳完了
- [ ] [→] quality-gates.md翻訳完了
- [ ] [→] rgrc-cycle.md翻訳完了
- [ ] [→] spec-context.md翻訳完了
- [ ] [→] storybook.md翻訳完了
- [ ] [→] test-preparation.md翻訳完了
- [ ] [→] ADR 0001参照の整合性確認

### Phase 4: 差分同期（1時間）

- [ ] [→] PROGRESSIVE_ENHANCEMENT.md差分解消
- [ ] [→] AI_OPERATION_PRINCIPLES.md差分解消
- [ ] [→] OCCAMS_RAZOR.md差分解消
- [ ] [→] その他3ファイル差分解消
- [ ] [?] 差分理由のドキュメント化

### Phase 5: その他（2-3時間）

- [ ] [→] hookify.md + 2サブファイル翻訳完了
- [ ] [→] issue.md翻訳完了
- [ ] [→] docs/agents/_base-template.md翻訳完了
- [ ] [→] docs/adr/0001翻訳完了
- [ ] [→] docs/designs/2ファイル翻訳完了
- [ ] [→] CONTEXT_CLASSIFICATION.md翻訳完了
- [ ] [✓] 同期率100%達成確認

---

## Implementation Plan

### Phase 0: 最適化新規ファイル（Day 0 - 30分）

```markdown
1. PRINCIPLE_RELATIONSHIPS.md読み込み
2. 日本語版作成: ja/rules/PRINCIPLE_RELATIONSHIPS.md
3. マトリックス表の翻訳
4. PRE_TASK_CHECK_VERBOSE.md読み込み
5. 日本語版作成: ja/rules/core/PRE_TASK_CHECK_VERBOSE.md
6. 構造一致確認
7. Git commit: "docs: Rules最適化新規ファイル日本語版追加 (PRINCIPLE_RELATIONSHIPS, PRE_TASK_CHECK_VERBOSE)"
```

### Phase 1: Core Rules（Day 1 - 30分）

```markdown
1. ESSENTIAL_PRINCIPLES.md読み込み
2. 日本語版作成: ja/rules/core/ESSENTIAL_PRINCIPLES.md
3. 相対リンク調整（1階層深いパス対応）
4. PRE_TASK_CHECK_COMPACT.md読み込み
5. 日本語版作成: ja/rules/core/PRE_TASK_CHECK_COMPACT.md
6. 構造一致確認
7. Git commit: "docs: Core Rules日本語版追加 (ESSENTIAL_PRINCIPLES, PRE_TASK_CHECK_COMPACT)"
```

### Phase 2: Guides（Day 2-3 - 3-4時間）

```markdown
1. part1-three-layer-architecture.md翻訳
2. part2-research-investigation.md翻訳
3. part3-think-sow-spec.md翻訳
4. part4-code-implementation.md翻訳
5. part5-review-quality.md翻訳
6. part6-pre-task-check.md翻訳
7. 全6ファイルのクロスリファレンス検証
8. Git commit: "docs: Guidesシリーズ日本語版追加 (part1-6)"
```

### Phase 3: Commands/code（Day 4 - 1-2時間）

```markdown
1. commands/code/配下6ファイル読み込み
2. 日本語版作成: ja/commands/code/配下
3. ADR 0001参照の整合性確認
4. Git commit: "docs: Commands/code モジュール日本語版追加"
```

### Phase 4: 差分同期（Day 4 - 1-2時間）

```markdown
1. 最適化後の差分ファイル6個の英日比較
   - PROGRESSIVE_ENHANCEMENT.md: 89行 vs 51行 = -38行
   - AI_OPERATION_PRINCIPLES.md: 86行 vs 54行 = -32行
   - OCCAMS_RAZOR.md: 250行 vs 237行 = -13行
   - READABLE_CODE.md: 247行 vs 246行 = -1行
   - LEAKY_ABSTRACTION.md: 154行 vs 235行 = +81行（逆転）
   - TIDYINGS.md: 47行 vs 34行 = -13行
2. LEAKY_ABSTRACTION.md大幅削減（244→154行）の内容確認
3. YAML frontmatterの翻訳対応
4. 差分理由のドキュメント化
5. 日本語版への反映（追加 or 意図的削除の確認）
6. Git commit: "docs: Rules差分同期（最適化後、PROGRESSIVE_ENHANCEMENT他6ファイル）"
```

### Phase 5: その他（Day 5 - 2-3時間）

```markdown
1. hookify関連3ファイル翻訳
2. issue.md翻訳
3. docs/agents/_base-template.md翻訳
4. docs/adr/0001翻訳
5. docs/designs/2ファイル翻訳
6. CONTEXT_CLASSIFICATION.md翻訳
7. 同期率100%確認: find比較
8. Git commit: "docs: 残り欠落ファイル日本語版追加（完全同期達成）"
```

---

## Success Metrics

- [✓] Core Rules 2ファイル翻訳完了 - Measurable: file count
- [→] Guides 6ファイル翻訳完了 - Measurable: file count
- [→] Commands/code 6ファイル翻訳完了 - Measurable: file count
- [→] 差分ファイル6個同期完了 - Measurable: diff行数ゼロ
- [✓] 同期率100%達成 - Measurable: `find | wc -l` 比較
- [?] 翻訳品質スコア ≥ 90/100 - Measurable: レビュースコア

---

## Risks & Mitigations

### High Confidence Risks (✓)

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| [✓] リンク切れ | Medium | High | 相対パス自動調整、全件検証 |
| [✓] 構造不一致 | High | Medium | DOCUMENTATION_RULES.mdチェックリスト厳守 |
| [✓] Git競合 | Low | Low | Phase毎に個別commit |

### Potential Risks (→)

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| [→] 翻訳品質低下 | High | Medium | 技術用語一貫性チェック、レビュー |
| [→] 工数超過 | Low | Medium | Phase毎に進捗確認、必要に応じてスコープ調整 |
| [→] 差分内容の誤解釈 | Medium | Low | 原作者確認、コミット履歴調査 |

### Unknown Risks (?)

| Risk | Monitoring | Preparation |
|------|------------|-------------|
| [?] 継続同期の破綻 | 定期的なdiff確認 | 自動チェックスクリプト作成 |
| [?] 言語固有の表現問題 | ユーザーフィードバック | 表現ガイドライン作成 |

---

## Verification Checklist

### 開始前確認

- [x] Research完了（2025-12-20-ja-en-doc-sync.md存在）
- [x] Contextファイル作成済み
- [x] Git作業ブランチ（main使用、必要に応じてブランチ作成）
- [ ] ユーザーのOption選択確認（A/B/Cどれか）
- [ ] 工数確保確認（8-11時間）

### Phase毎確認

- [ ] 翻訳後のMarkdown syntax valid
- [ ] 相対リンク動作確認
- [ ] セクション構造の英日一致
- [ ] 技術用語の一貫性
- [ ] Git commit message明確（日本語）

### 完了確認

- [ ] DOCUMENTATION_RULES.mdチェックリスト全通過
- [ ] 同期率100%達成
- [ ] クロスリファレンス全件動作確認
- [ ] Git push完了
- [ ] `/context`コマンドでToken使用量確認

---

## References

### Research Documents

- Detailed Report: `/Users/thkt/.claude/workspace/research/2025-12-20-ja-en-doc-sync.md`
- Context File: `/Users/thkt/.claude/workspace/research/2025-12-20-ja-en-doc-sync-context.md`

### Related Documentation

- DOCUMENTATION_RULES.md: `/Users/thkt/.claude/docs/DOCUMENTATION_RULES.md`
- Git status: `CLAUDE.md` modified

### Golden Masters

- SOW structure: `~/.claude/golden-masters/documents/sow/example-workflow-improvement.md`
- Spec structure: `~/.claude/golden-masters/documents/spec/example-workflow-improvement.md`

---

## Appendix: File Lists

### 欠落ファイル詳細

**Core Rules (2 files):**

- /Users/thkt/.claude/rules/core/ESSENTIAL_PRINCIPLES.md (72行)
- /Users/thkt/.claude/rules/core/PRE_TASK_CHECK_COMPACT.md (49行)

**Guides (6 files):**

- /Users/thkt/.claude/docs/guides/part1-three-layer-architecture.md
- /Users/thkt/.claude/docs/guides/part2-research-investigation.md
- /Users/thkt/.claude/docs/guides/part3-think-sow-spec.md
- /Users/thkt/.claude/docs/guides/part4-code-implementation.md
- /Users/thkt/.claude/docs/guides/part5-review-quality.md
- /Users/thkt/.claude/docs/guides/part6-pre-task-check.md

**Commands/code (6 files):**

- /Users/thkt/.claude/commands/code/completion.md
- /Users/thkt/.claude/commands/code/quality-gates.md
- /Users/thkt/.claude/commands/code/rgrc-cycle.md
- /Users/thkt/.claude/commands/code/spec-context.md
- /Users/thkt/.claude/commands/code/storybook.md
- /Users/thkt/.claude/commands/code/test-preparation.md

**差分ファイル (6 files - 最適化後更新):**

1. rules/development/PROGRESSIVE_ENHANCEMENT.md: -38行（改善: 元-46行）
2. rules/core/AI_OPERATION_PRINCIPLES.md: -32行（拡大: 元-30行）
3. rules/reference/OCCAMS_RAZOR.md: -13行（改善: 元-23行）
4. rules/development/READABLE_CODE.md: -1行（大幅改善: 元-9行）
5. rules/development/LEAKY_ABSTRACTION.md: +81行（逆転: 元-9行、EN 244→154行）
6. rules/development/TIDYINGS.md: -13行（拡大: 元-9行）

**その他 (10 files):**

- commands/hookify.md + hookify/configure.md + hookify/list.md
- commands/issue.md
- docs/agents/reviewers/_base-template.md
- docs/adr/0001-code-command-responsibility-separation.md
- docs/designs/output-verification.md
- docs/designs/hookify-automation.md
- docs/CONTEXT_CLASSIFICATION.md

**最適化新規ファイル (2 files):**

- /Users/thkt/.claude/rules/PRINCIPLE_RELATIONSHIPS.md
- /Users/thkt/.claude/rules/core/PRE_TASK_CHECK_VERBOSE.md

**Total**: 32ファイル（最適化により+2）
