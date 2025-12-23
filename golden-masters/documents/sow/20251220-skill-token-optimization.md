# SOW: スキルファイルのトークン効率最適化

Version: 1.0.0
Status: Draft
Created: 2025-12-20

---

## Executive Summary

[→] スキルファイル（~/.claude/skills/）のトークン効率を最適化し、APIコストとレイテンシを削減する。Claudeが既に知っている基礎知識の削除、二重ロード問題の解消、販促文的内容の削除を行う。

**Key improvement areas**:

1. 二重ロード問題の解消（CLAUDE.md + system-reminder）
2. Claudeの既存知識との重複削除（SOLID、DRY、CSS基本等）
3. 販促文・冗長セクションの削除
4. スキルファイル構造の標準化

---

## Problem Analysis

### Current State [✓]

| Metric | Current Value | Issue |
|--------|---------------|-------|
| Total skill lines | 4,116行 | トークン浪費 |
| 最大スキル | creating-adrs (514行) | 過度に詳細 |
| 二重ロード | applying-code-principles | CLAUDE.md + system-reminder両方 |
| 基礎知識説明 | 全スキル | Claudeが既知の内容 |

Evidence: `wc -l ~/.claude/skills/*/SKILL.md`

### Verified Issues [✓]

- [✓] applying-code-principlesがCLAUDE.mdに埋め込み済み - Evidence: CLAUDE.md確認
- [✓] SOLID.md, DRY.md等がsystem-reminderで注入 - Evidence: system-reminder確認
- [✓] CSS Grid/Flexbox基本構文がenhancing-progressivelyに含まれる - Evidence: SKILL.md確認
- [✓] React Hooks基本説明がapplying-frontend-patternsに含まれる - Evidence: SKILL.md確認

### Inferred Problems [→]

- [→] 二重ロードにより同一情報が2-3回読み込まれている
- [→] 基礎知識の説明がClaudeの応答品質に寄与していない
- [→] 販促文（Expected Improvements等）がAI動作に影響しない

### Suspected Issues [?]

- [?] 最適なスキルファイルサイズの閾値（50行？100行？）
- [?] 削減後のスキル発動精度への影響
- [?] 参照リンクのみにした場合の遅延ロード効果

---

## Assumptions & Prerequisites

### Verified Facts (✓)

- [✓] 5つの主要スキルが合計2,041行 - Evidence: wc -l測定
- [✓] applying-code-principlesが最も問題（二重ロード） - Evidence: CLAUDE.md確認
- [✓] Claudeの学習データにSOLID、DRY、TDD、CSS基本が含まれる - Evidence: AI一般知識

### Working Assumptions (→)

- [→] 基礎知識の説明を削除してもClaudeは正しく動作する
- [→] プロジェクト固有のルール/判断基準のみ残せば十分
- [→] 参照パスを残せば必要時に詳細を読み込める

### Unknown/Needs Verification (?)

- [?] 削減率の最適値（70%？90%？）
- [?] キーワードトリガーの最小記述量
- [?] ユーザー体験への影響（スキル発動頻度）

---

## Solution Design

### Proposed Approach [→]

**スリム化テンプレート**:

```markdown
---
name: skill-name
description: 1行の目的
allowed-tools: [tools]
---

# Purpose
[1-2行]

## Project-Specific Rules
[Claudeが知らない、このプロジェクト固有の判断基準のみ]

## References
[@path/to/detail.md] - 詳細が必要な場合
```

**Phase 1: 二重ロード解消 (即時)**

- CLAUDE.mdからapplying-code-principles埋め込みを削除
- 参照リンクのみ残す

**Phase 2: 5大スキル最適化 (Day 1-2)**

- applying-code-principles: ~95%削減
- creating-adrs: ~60%削減
- enhancing-progressively: ~70%削減
- applying-frontend-patterns: ~50%削減
- generating-tdd-tests: ~40%削減

### Alternatives Considered

| Option | Pros | Cons | Evaluation |
|--------|------|------|------------|
| [→] A: 段階的最適化 | 影響確認可能、ロールバック容易 | 時間がかかる | **採用** |
| [→] B: 一括削減 | 一度で完了 | 問題発生時の切り分け困難 | 却下 |
| [→] C: スキル機能廃止 | 根本解決 | 価値ある機能の喪失 | 却下 |

### Recommendation

**Option A: 段階的最適化** - Confidence: [→]

---

## Test Plan

### Unit Tests (Priority: High)

- [ ] 最適化後スキルのキーワード発動テスト
- [ ] CLAUDE.md変更後の基本動作確認
- [ ] 参照リンクからの詳細ロード確認

### Integration Tests (Priority: Medium)

- [ ] /code実行時のスキル連携
- [ ] /audit実行時のエージェント動作

---

## Acceptance Criteria

### Phase 1: 二重ロード解消

- [ ] [✓] CLAUDE.mdからapplying-code-principles埋め込み削除
- [ ] [✓] 参照リンクへの置換完了

### Phase 2: 5大スキル最適化

- [ ] [→] applying-code-principles: 430行 → ~50行 (88%削減)
- [ ] [→] creating-adrs: 514行 → ~200行 (61%削減)
- [ ] [→] enhancing-progressively: 410行 → ~120行 (71%削減)
- [ ] [→] applying-frontend-patterns: 362行 → ~180行 (50%削減)
- [ ] [→] generating-tdd-tests: 325行 → ~195行 (40%削減)

### Phase 3: 全体効果

- [ ] [→] 合計行数: 4,116行 → ~1,500行 (64%削減)

---

## Implementation Plan

### Phase 1: 二重ロード解消 (即時)

1. CLAUDE.mdのapplying-code-principlesセクション特定
2. 参照リンクに置換
3. 動作確認

### Phase 2: applying-code-principles最適化 (Day 1)

1. SOLID/DRY/YAGNI等の基礎説明を削除
2. コード例を削除（Claudeは既知）
3. プロジェクト固有の「優先順位」のみ残す
4. 参照パスを残す

### Phase 3: 残り4スキル最適化 (Day 1-2)

1. creating-adrs: bashスクリプト例、販促文削除
2. enhancing-progressively: CSS基本構文削除
3. applying-frontend-patterns: React Hooks基本削除
4. generating-tdd-tests: 一般的テスト技法説明削除

---

## Success Metrics

- [✓] 二重ロード解消 - Measurable: CLAUDE.md diff
- [→] 合計行数64%削減 (4,116 → ~1,500) - Measurable: wc -l
- [→] 主要スキル平均62%削減 - Measurable: wc -l per file

---

## Risks & Mitigations

### High Confidence Risks (✓)

| Risk | Impact | Mitigation |
|------|--------|------------|
| [✓] スキル発動精度低下 | Medium | キーワードリストは維持 |
| [✓] プロジェクト固有ルールの喪失 | High | 判断基準セクションは必ず残す |

---

## Verification Checklist

- [x] 現状のスキルファイル分析完了
- [x] 二重ロード問題の特定
- [ ] 既存スキルのバックアップ
- [ ] 各フェーズの成功基準合意

---

## References

- 分析結果: 本会話での調査
- スキルディレクトリ: ~/.claude/skills/
