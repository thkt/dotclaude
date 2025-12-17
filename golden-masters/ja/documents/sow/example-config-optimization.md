<!--
Golden Master: SOW - Config Optimization

選定理由:
- 設定・パフォーマンス最適化の典型例
- 具体的な定量目標（70%削減）
- 既存設定のfile:line参照
- DRY違反の分析と意図的設計の判断

特徴:
- 設定ファイル分析タスクの参考例
- UX改善の定量的目標設定
- 誤検知（false positive）の適切な処理

参照元: ~/.claude/workspace/planning/2025-12-04-claude-code-config-optimization/

Last Reviewed: 2025-12-17
Update Reason: メンテナンスメタデータフィールド追加
Previous Version: N/A
-->

# SOW: Claude Code設定最適化

Version: 1.0.0
Status: Approved
Created: 2025-12-04

---

## Executive Summary

Opus 4.5視点でのClaude Code設定レビューに基づく最適化プロジェクト。

**主な発見**:

- [✓] PRE_TASK_CHECKの確認フローが全メッセージで発動し、UXを低下させている
- [✓] DRY違反と思われた重複は意図的な階層設計（問題なし）
- [✓] Agents構造は概ね良好だが、ドキュメント不足

**目標**: 「Y/n」確認の70%削減によるUX改善

---

## Problem Analysis

### Current State [✓]

**PRE_TASK_CHECK確認の冗長性**:

- [✓] 全メッセージでPRE_TASK_CHECK_COMPACT.mdがフック注入される（settings.json:162-172）
- [✓] 確認応答（"y", "ok"）にも毎回「Y/n」確認フローが発動
- [✓] ユーザー体験の低下：シンプルな会話でも確認待ちが発生

**Agent標準化の欠如**:

- [→] モデル選択基準が暗黙知のまま（haiku/sonnet/opus の使い分け）
- [→] 新規Agent作成時の参照ドキュメントが不足
- [✓] 17エージェント存在するが、READMEなし

**メンテナンス課題**:

- [✓] logs/agents/ に228ディレクトリ蓄積
- [→] 定期クリーンアップの仕組みが不十分

### Root Cause [→]

PRE_TASK_CHECK設計時に「スキップ条件」が明示されていなかったため、AIが毎回フルフローを実行。

---

## Assumptions & Prerequisites

### Verified Facts (✓)

- [✓] PRE_TASK_CHECK_COMPACT.md は49行、約1KB（rules/core/PRE_TASK_CHECK_COMPACT.md）
- [✓] フック注入は UserPromptSubmit イベントで実行（settings.json:162-172）
- [✓] 既存の「When to Skip」セクションは存在するが、先頭に配置されていない
- [✓] Agents は YAML frontmatter + Markdown 形式で統一

### Working Assumptions (→)

- [→] スキップ条件を先頭に配置すれば、AIが早期判断できる
- [→] 70%のメッセージがスキップ条件に該当（確認応答、短文、読み取り専用）
- [→] モデル選択ガイドがあれば新規Agent作成の効率が向上

### Unknown/Needs Verification (?)

- [?] 実際のスキップ率は運用で計測が必要
- [?] ログローテーション閾値（50件、1MB）の妥当性

---

## Solution Design

### Proposed Approach

**設計方針（ユーザー承認済み）**:

```text
フック注入（維持）→ AIがスキップ条件を確認 →
  ├─ 該当 → 直接回答（確認フロー省略）
  └─ 非該当 → 従来通りPRE_TASK_CHECK表示
```

### Alternatives Considered

1. [→] **フック注入を条件付きに変更**
   - Pro: トークン節約
   - Con: フックでメッセージ内容取得が困難
   - **却下理由**: 技術的制約

2. [✓] **スキップ条件をコンパクト版に明記（採用）**
   - Pro: 実装が容易、ロールバック可能
   - Con: トークンは消費される
   - **採用理由**: UX改善が主目的、技術的に確実

3. [→] **PRE_TASK_CHECKを完全廃止**
   - Pro: 最大の簡素化
   - Con: 安全性低下、ファイル操作確認漏れリスク
   - **却下理由**: 安全性を犠牲にできない

### Recommendation

**Option 2: スキップ条件明記** - Confidence: [✓]

---

## Test Plan

### Manual Tests (Priority: High)

- [ ] 確認応答（"y", "yes", "ok"）でスキップされるか
- [ ] 短文（< 15文字）でスキップされるか
- [ ] ファイル操作リクエストで確認フローが発動するか
- [ ] 曖昧なリクエストで確認フローが発動するか

### Verification (Priority: Medium)

- [ ] 1週間運用後のスキップ率計測
- [ ] ファイル操作の確認漏れ0件を確認

---

## Acceptance Criteria

### Phase 1: PRE_TASK_CHECK最適化

- [✓] AC-1: PRE_TASK_CHECK_COMPACT.md の先頭にスキップ条件セクションが追加されている
- [✓] AC-2: 確認応答（y/yes/ok/n/no/はい/いいえ）で確認フローがスキップされる
- [✓] AC-3: 15文字未満のメッセージで確認フローがスキップされる
- [✓] AC-4: ファイル操作リクエストでは従来通り確認フローが発動する
- [→] AC-5: スキップ率70%達成（1週間運用後計測）

### Phase 2: Agent標準化ドキュメント

- [✓] AC-6: MODEL_SELECTION_GUIDE.md が作成されている
- [✓] AC-7: agents/README.md が作成されている
- [→] AC-8: 新規Agent作成時の参照先が明確になっている

### Phase 3: メンテナンス改善

- [✓] AC-9: session-end.sh にログローテーション処理が追加されている
- [✓] AC-10: SYNC_CHECKLIST.md が作成されている
- [→] AC-11: logs/が肥大化しない（50件以下維持）

---

## Implementation Plan

### Phase 1: PRE_TASK_CHECK最適化 [優先度: 高]

**工数**: 1-2時間

1. PRE_TASK_CHECK_COMPACT.md にスキップ条件セクション追加
2. Quick Command Guide 追加
3. Ambiguity Detection セクション追加
4. 動作確認

### Phase 2: Agent標準化ドキュメント [優先度: 中]

**工数**: 2-3時間

1. MODEL_SELECTION_GUIDE.md 作成
2. agents/README.md 作成
3. 既存Agentとの整合性確認

### Phase 3: メンテナンス改善 [優先度: 低]

**工数**: 1時間

1. session-end.sh にログローテーション追加
2. SYNC_CHECKLIST.md 作成

---

## Success Metrics

- [✓] Phase 1完了: スキップ条件が機能している
- [→] 1週間後: スキップ率70%達成
- [→] 1ヶ月後: ファイル操作確認漏れ0件

---

## Risks & Mitigations

### High Confidence Risks (✓)

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| スキップ過多 | 中 | 低 | 保守的なスキップ条件、ファイル操作は必ず確認 |

### Potential Risks (→)

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| スキップ不足 | 低 | 中 | パターン追加で対応可能 |
| AIの判断ミス | 中 | 低 | Decision Tree の明確化 |

### Rollback Strategy

```bash
# Phase 1のロールバック
git checkout HEAD~1 -- ~/.claude/rules/core/PRE_TASK_CHECK_COMPACT.md
```

---

## Verification Checklist

実装前:

- [x] すべての [?] 項目が調査済み
- [x] 仮定 [→] がユーザーと確認済み
- [x] 事実 [✓] にエビデンスあり

実装後:

- [ ] AC-1〜AC-11 をすべて確認
- [ ] 1週間運用後にスキップ率を計測

---

## Related Documents

- 計画ファイル: `~/.claude/plans/synthetic-marinating-pillow.md`
- Spec: `spec.md`（同ディレクトリ）
