<!--
Golden Master: Spec - Config Optimization

選定理由:
- 設定最適化の明確なFR構造
- パターンベースのスキップ条件
- 定量的な目標設定

特徴:
- 設定・パフォーマンスSpecの参考例
- 測定可能な受入基準
- 移行の考慮事項

参照元: ~/.claude/workspace/planning/2025-12-04-claude-code-config-optimization/

Last Reviewed: 2025-12-17
Update Reason: メンテナンスメタデータフィールド追加
Previous Version: N/A
-->

# Specification: Claude Code設定最適化

Version: 1.0.0
Based on: SOW v1.0.0
Last Updated: 2025-12-04

---

## 1. Functional Requirements

### 1.1 PRE_TASK_CHECK スキップ機能

[✓] FR-001: スキップ条件の早期評価

- Input: ユーザーメッセージ
- Process: 先頭のスキップ条件セクションを評価
- Output: スキップ該当 → 直接回答 / 非該当 → 確認フロー

[✓] FR-002: 確認応答のスキップ

- Pattern: `^[yYnN]$`, `^(yes|ok|no|cancel|はい|いいえ)$`
- Action: 確認フローをスキップし、直接回答

[✓] FR-003: 短文メッセージのスキップ

- Condition: メッセージ長 < 15文字
- Action: 確認フローをスキップ

[✓] FR-004: 読み取り専用クエリのスキップ

- Pattern: "what is X?", "show me X", "Xとは？"
- Action: 確認フローをスキップ

[→] FR-005: フォローアップのスキップ

- Pattern: starts with "also", "and", "thanks", "また", "あと"
- Action: 確認フローをスキップ

### 1.2 ファイル操作時の確認維持

[✓] FR-006: ファイル操作の検出

- Keywords: "create", "edit", "delete", "作成", "編集", "削除"
- Action: 必ず確認フローを実行

[✓] FR-007: コマンド実行の検出

- Keywords: "run", "execute", "npm", "git", "実行"
- Action: 必ず確認フローを実行

### 1.3 Edge Cases

[→] EC-001: 短文だがファイル操作を含む

- Example: "delete it" (9文字)
- Action: ファイル操作キーワードが優先 → 確認フロー実行

[→] EC-002: 曖昧な代名詞を含む

- Example: "fix it", "これを直して"
- Action: 曖昧性検出 → 確認フロー実行

---

## 2. File Specifications

### 2.1 PRE_TASK_CHECK_COMPACT.md（変更後）

**Path**: `~/.claude/rules/core/PRE_TASK_CHECK_COMPACT.md`

**構造**:

```markdown
# PRE_TASK_CHECK (Compact)

## ⚡ FIRST: Skip Check

**IMMEDIATELY SKIP this check if message is**:
- Confirmation: "y", "yes", "ok", "n", "no", "cancel", "はい", "いいえ"
- Follow-up: starts with "also", "and", "thanks", "また", "あと"
- Short: < 15 characters AND no file/command keywords
- Read-only query: "what is X?", "show me X", "Xとは？"

**NEVER SKIP if message contains**:
- File operations: "create", "edit", "delete", "作成", "編集", "削除"
- Command execution: "run", "execute", "npm", "git"
- Ambiguous pronouns: "it", "that", "this", "これ", "それ", "あれ"

If skip → respond directly. Otherwise → proceed with check.

## Core Rules

### 95% Understanding Rule
[既存内容を維持]

### When to Execute Check
[既存内容を維持]

### When to Skip
[既存内容を維持]

## Confidence Markers
[既存内容を維持]

## Quick Command Guide

| タスク | コマンド |
|--------|----------|
| 単一ファイル修正 | /fix |
| 複数ファイル実装 | /code |
| 調査のみ | /research |
| 計画立案 | /think |
| 緊急修正 | /hotfix |

## Ambiguity Detection

**以下がある場合は必ず確認**:
- 不明な代名詞: "it", "that", "これ", "それ"
- 曖昧な量: "some", "a few", "いくつか"
- 未指定の技術選択

## Output Format
[既存内容を維持]

## Flow
[既存内容を維持]

## Full Details
[@~/.claude/rules/core/PRE_TASK_CHECK_VERBOSE.md](./PRE_TASK_CHECK_VERBOSE.md)
```

### 2.2 MODEL_SELECTION_GUIDE.md（新規）

**Path**: `~/.claude/agents/MODEL_SELECTION_GUIDE.md`

````markdown
# Agent Model Selection Guide

## 選択基準

| 条件 | モデル | コスト | 速度 |
|------|--------|--------|------|
| 複数エージェント調整 | opus | High | Slow |
| 深いコンテキスト理解 | sonnet | Medium | Medium |
| パターンベースの処理 | haiku | Low | Fast |

## Decision Tree

```text
タスクが複数エージェントを調整する必要がある？
  YES → opus
  NO ↓
タスクが深いコンテキスト理解を必要とする？
  YES → sonnet
  NO ↓
タスクがパターンベースまたは定型的？
  YES → haiku
  NO → sonnet (default)
```

## 現在のAgent設定

### Reviewers (主にsonnet)

- performance-reviewer: sonnet - 複雑な最適化分析
- accessibility-reviewer: sonnet - WCAG準拠チェック
- readability-reviewer: haiku - パターンベースチェック
- type-safety-reviewer: sonnet - 型推論が必要

### Generators (主にhaiku)

- commit-generator: haiku - 定型的なメッセージ生成
- branch-generator: haiku - 命名規則に基づく生成
- test-generator: sonnet - コード理解が必要

### Orchestrators (opus)

- audit-orchestrator: opus - 複数レビュアーの調整

## コスト見積もり

1000トークンあたり:

- haiku: ~$0.00025
- sonnet: ~$0.003
- opus: ~$0.015

## 新規Agent作成時の判断フロー

1. タスクの複雑さを評価
2. コンテキスト理解の必要性を判断
3. 上記Decision Treeに従ってモデル選択
4. 既存の類似Agentを参考に調整

````

### 2.3 agents/README.md（新規）

**Path**: `~/.claude/agents/README.md`

````markdown
# Agents Directory

## 概要

Claude Codeで使用するAgentの定義ファイルを格納するディレクトリ。

## ディレクトリ構造

```text
agents/
├── README.md                    # このファイル
├── MODEL_SELECTION_GUIDE.md     # モデル選択ガイド
├── reviewers/                   # コードレビューエージェント
│   ├── _base-template.md        # レビュアー共通テンプレート
│   ├── performance.md
│   ├── accessibility.md
│   ├── readability.md
│   ├── type-safety.md
│   ├── structure.md
│   ├── design-pattern.md
│   ├── testability.md
│   ├── root-cause.md
│   ├── document.md
│   └── subagent.md
├── generators/                  # コード/コンテンツ生成
│   └── test.md
├── orchestrators/               # 調整・統合
│   └── audit-orchestrator.md
├── enhancers/                   # コード改善
│   └── progressive.md
└── git/                         # Git操作
    ├── commit-generator.md
    ├── pr-generator.md
    └── branch-generator.md

```

## Agent ファイル形式

すべてのAgentは YAML frontmatter + Markdown 形式:

```yaml
---
name: agent-name              # 必須: kebab-case
description: >                # 必須: 複数行説明
  English description.
  日本語説明。
tools: Read, Grep, Task       # 必須: 使用可能ツール
model: sonnet                 # 任意: haiku|sonnet|opus
skills:                       # 任意: 参照スキル
  - skill-name
---

# Agent Content

[Markdown content with instructions]
```

## 新規Agent作成手順

1. **モデル選択**: MODEL_SELECTION_GUIDE.md を参照
2. **テンプレート選択**: カテゴリに応じた base-template を使用
3. **YAML frontmatter 記述**: name, description, tools は必須
4. **適切なディレクトリに配置**: カテゴリに応じて
5. **動作確認**: Task tool で呼び出しテスト

## Agent Discovery

Agentは以下の方法で動的に発見される:

- **Glob**: `~/.claude/agents/**/*.md`
- **識別子**: YAML frontmatter の `name` フィールド
- **呼び出し**: `subagent_type` パラメータで指定

## 関連ドキュメント

- [MODEL_SELECTION_GUIDE.md](./MODEL_SELECTION_GUIDE.md) - モデル選択基準
- [reviewers/_base-template.md](./reviewers/_base-template.md) - レビュアーテンプレート
- [Skills README](../skills/README.md) - スキルとの連携

````

### 2.4 session-end.sh への追加

**Path**: `~/.claude/skills/scripts/session-end.sh`

**追加コード**:

```bash
# Agent logs rotation - keep last 50 directories
AGENT_LOG_DIR="$HOME/.claude/logs/agents"
if [ -d "$AGENT_LOG_DIR" ]; then
  agent_count=$(ls -1 "$AGENT_LOG_DIR" 2>/dev/null | wc -l)
  if [ "$agent_count" -gt 50 ]; then
    ls -1t "$AGENT_LOG_DIR" | tail -n +51 | while read dir; do
      mv "$AGENT_LOG_DIR/$dir" ~/.Trash/ 2>/dev/null
    done
  fi
fi

# Subagent log rotation - keep last 1MB
SUBAGENT_LOG="$HOME/.claude/logs/subagent.log"
if [ -f "$SUBAGENT_LOG" ]; then
  log_size=$(stat -f%z "$SUBAGENT_LOG" 2>/dev/null || echo 0)
  if [ "$log_size" -gt 1048576 ]; then  # 1MB
    tail -c 512000 "$SUBAGENT_LOG" > "$SUBAGENT_LOG.tmp"
    mv "$SUBAGENT_LOG.tmp" "$SUBAGENT_LOG"
  fi
fi
```

### 2.5 SYNC_CHECKLIST.md（新規）

**Path**: `~/.claude/rules/guidelines/SYNC_CHECKLIST.md`

```markdown
# Rules/Reference 同期チェックリスト

## rules/guidelines/ を更新した場合

### 必須更新

- [ ] 同ファイルの日本語版（ja/rules/guidelines/）を更新
- [ ] skills/applying-code-principles/SKILL.md の該当セクションを確認

### 確認項目

| Reference File | SKILL.md Section | 確認事項 |
|----------------|------------------|----------|
| SOLID.md | "1. SOLID Principles" | サマリーが一致 |
| DRY.md | "2. DRY" | コア概念が一致 |
| OCCAMS_RAZOR.md | "3. Occam's Razor" | 決定基準が一致 |
| MILLERS_LAW.md | "4. Miller's Law" | 数値制限が一致 |
| YAGNI.md | "5. YAGNI" | 判断基準が一致 |

### 更新手順

1. reference/ファイルを更新
2. ja/reference/を同期
3. SKILL.mdのサマリーを確認
4. 矛盾があれば調整（referenceが正典）

### DRY原則との整合性

**意図的な構造**:
- `rules/guidelines/`: 詳細な正典（単一真実源）
- `SKILL.md`: 統合サマリー（参照リンク付き）

この階層構造はDRY違反ではなく、
異なる抽象度レベルでの知識表現として設計されています。
```

---

## 3. Test Scenarios

### 3.1 Unit Tests (Manual)

```typescript
describe('PRE_TASK_CHECK Skip Logic', () => {
  it('[✓] skips for single-char confirmation "y"', () => {
    // Given: User message is "y"
    // When: PRE_TASK_CHECK evaluates
    // Then: Skip check, respond directly
  });

  it('[✓] skips for Japanese confirmation "はい"', () => {
    // Given: User message is "はい"
    // When: PRE_TASK_CHECK evaluates
    // Then: Skip check, respond directly
  });

  it('[✓] skips for short message < 15 chars', () => {
    // Given: User message is "thanks" (6 chars)
    // When: PRE_TASK_CHECK evaluates
    // Then: Skip check, respond directly
  });

  it('[✓] does NOT skip for file operation', () => {
    // Given: User message is "delete the file"
    // When: PRE_TASK_CHECK evaluates
    // Then: Execute full check flow
  });

  it('[→] does NOT skip for ambiguous pronoun', () => {
    // Given: User message is "fix it"
    // When: PRE_TASK_CHECK evaluates
    // Then: Execute full check flow
  });

  it('[→] handles edge case: short + file keyword', () => {
    // Given: User message is "delete it" (9 chars)
    // When: PRE_TASK_CHECK evaluates
    // Then: File keyword takes priority, execute check
  });
});
```

### 3.2 Integration Tests (1-week observation)

- [ ] スキップ率の計測（目標: 70%）
- [ ] ファイル操作確認漏れの検出（目標: 0件）
- [ ] ユーザー満足度の変化

---

## 4. Implementation Checklist

### Phase 1: PRE_TASK_CHECK最適化

- [ ] PRE_TASK_CHECK_COMPACT.md のバックアップ作成
- [ ] スキップ条件セクションを先頭に追加
- [ ] NEVER SKIP 条件を追加
- [ ] Quick Command Guide を追加
- [ ] Ambiguity Detection を追加
- [ ] 動作確認（各パターンでテスト）

### Phase 2: Agent標準化ドキュメント

- [ ] MODEL_SELECTION_GUIDE.md を作成
- [ ] agents/README.md を作成
- [ ] 既存Agentとの整合性確認

### Phase 3: メンテナンス改善

- [ ] session-end.sh のバックアップ作成
- [ ] ログローテーションコードを追加
- [ ] SYNC_CHECKLIST.md を作成
- [ ] 動作確認

---

## 5. Known Issues & Assumptions

### Assumptions (→)

1. [→] 70%のメッセージがスキップ条件に該当 - 運用で検証
2. [→] モデル選択ガイドで新規Agent作成が効率化 - 主観的評価

### Unknown / Need Verification (?)

1. [?] 実際のスキップ率 - 1週間運用後に計測
2. [?] ログローテーション閾値の妥当性 - 長期運用で調整

---

## 6. References

- SOW: `sow.md`（同ディレクトリ）
- 計画ファイル: `~/.claude/plans/synthetic-marinating-pillow.md`
- 現行PRE_TASK_CHECK: `~/.claude/rules/core/PRE_TASK_CHECK_COMPACT.md`
- 現行session-end.sh: `~/.claude/skills/scripts/session-end.sh`
