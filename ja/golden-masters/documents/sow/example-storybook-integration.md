<!--
Golden Master: SOW - Storybook Integration

選定理由:
- フロントエンド機能の典型的なSOW
- Component API仕様を含む
- ユーザー確認済みファクト（Storybook使用中）の記載
- Pain Pointsの明確な分析

特徴:
- UI/コンポーネント系タスクの参考例
- spec.mdへのComponent APIセクション追加
- CSF3形式のStories生成

参照元: ~/.claude/workspace/planning/2025-12-14-storybook-integration/

Last Reviewed: 2025-12-17
Update Reason: メンテナンスメタデータフィールド追加
Previous Version: N/A
-->

# SOW: Storybook 連携機能

Version: 1.1.0
Status: Draft (Revised)
Created: 2025-12-14
Updated: 2025-12-14

## Executive Summary

[✓] Claude Code ワークフローに Storybook 連携機能を追加し、spec.md から Stories スケルトンを自動生成できるようにする。チーム開発でのフロントエンドコンポーネント共有を効率化する。

## Problem Analysis

### Current State [✓]

- [✓] `/think` で spec.md を生成するが、コンポーネント API の詳細定義がない
- [✓] `/code` で実装後、Stories は手動で作成している
- [✓] spec.md と Stories の間に同期の仕組みがない
- [✓] Storybook は既に使用中（ユーザー確認済み）

### Pain Points [→]

- [→] コンポーネント仕様と Stories の二重管理
- [→] Props の変更時に Stories の更新漏れが発生しやすい
- [→] チームメンバー間でコンポーネント仕様の共有が属人的

## Assumptions & Prerequisites

### Verified Facts (✓)

- [✓] Storybook 使用中 - ユーザー確認
- [✓] Stories 自動生成を希望 - ユーザー確認
- [✓] 汎用的に使いたい（特定プロジェクトではない）- ユーザー確認
- [✓] チーム開発でフロントエンド中心 - ユーザー確認

### Working Assumptions (→)

- [→] Storybook 7+ を使用している（CSF3 形式）
- [→] TypeScript + React が主な技術スタック
- [→] autodocs を活用したい

### Unknown/Needs Verification (?)

- [?] 具体的な Storybook バージョン
- [?] 既存の Stories のファイル構成パターン
- [?] デザインシステムの有無

## Solution Design

### Proposed Approach [→]

3層構造での実装：

1. **storybook-integration スキル新規作成**
   - コンポーネント API 仕様のテンプレート
   - Stories 生成のベストプラクティス
   - CSF3 形式のパターン集

2. **/think 拡張**: spec.md に Component API セクション追加
   - Props 定義（TypeScript interface）
   - バリエーション（variants, sizes, states）
   - 使用例（コード snippet）

3. **/code 拡張**: Stories スケルトン生成
   - spec.md の Component API から自動生成
   - Default, Variants, States の Story
   - autodocs 対応

### Alternatives Considered

| Option | Pros | Cons | 判定 |
|--------|------|------|------|
| A. スキル単体 | シンプル、低コスト | 自動化なし | △ |
| B. /think + /code 拡張 | 完全自動化 | 変更範囲大 | ◎ |
| C. 専用コマンド /storybook | 独立性高い | 既存ワークフローと分離 | △ |

### Recommendation

**Option B** を採用 - Confidence: [→]

理由：

- 既存ワークフロー（/think → /code）に自然に統合
- spec.md が仕様の Single Source of Truth になる
- 追加の学習コストが低い

## Test Plan

### Unit Tests (Priority: High)

- [ ] Function: `generateComponentAPISection()` - Props から API セクション生成
- [ ] Function: `generateStoryTemplate()` - CSF3 形式の Story 生成
- [ ] Function: `parseComponentSpec()` - spec.md からコンポーネント仕様抽出

### Integration Tests (Priority: Medium)

- [ ] /think 実行時に Component API セクションが生成される
- [ ] /code 実行時に *.stories.tsx が生成される
- [ ] 生成された Stories が Storybook でレンダリング可能

### E2E Tests (Priority: Low)

- [ ] 完全なワークフロー: /think → /code → Stories 表示

## Acceptance Criteria

- [ ] [✓] storybook-integration スキルが ~/.claude/skills/ に作成される
- [ ] [✓] /think 実行時に spec.md に Component API セクションが含まれる
- [ ] [→] /code 実行時にコンポーネント実装と共に *.stories.tsx が生成される
- [ ] [→] 生成された Stories が CSF3 形式で autodocs 対応している
- [ ] [→] Props の型定義が Stories の argTypes に反映される
- [ ] [→] 既存 Stories との整合性が保たれる（EC-002 統合戦略による: O/S/M/D 選択肢）

## Implementation Plan

### Phase 1: スキル作成 [1日目]

1. `~/.claude/skills/storybook-integration/SKILL.md` 作成
2. `references/csf3-patterns.md` 作成
3. `references/component-api-template.md` 作成

### Phase 2: /think 拡張 [2日目]

**変更対象**: `~/.claude/commands/think.md`

1. spec.md テンプレートに Component API セクション追加
   - 追加位置: `## Specification Document (spec.md) Structure` 内
2. フロントエンド判定ロジック追加
   - `shouldGenerateComponentAPI()` 関数による自動判定
3. 既存のUI仕様セクション(4章)との統合

### Phase 3: /code 拡張 [3日目]

**変更対象**: `~/.claude/commands/code.md`

1. spec.md からコンポーネント仕様を読み取るロジック追加
   - `parseComponentSpec()` 関数
2. Stories スケルトン生成ロジック追加
   - `generateStoryTemplate()` 関数
   - 追加位置: `## Specification Context (Auto-Detection)` の後
3. 既存ファイル検出・統合戦略（EC-002）
   - O/S/M/D 選択肢の実装

### Phase 4: 検証 [4日目]

1. 実際のプロジェクトでテスト
2. ドキュメント更新

## Success Metrics

- [✓] Stories 作成時間: 手動 15分 → 自動 2分
- [→] spec.md ↔ Stories の乖離: 0件
- [→] チームでのコンポーネント仕様共有の満足度向上

## Risks & Mitigations

### High Confidence Risks (✓)

- **Risk**: 既存の /think, /code への変更が他の機能に影響
  - Mitigation: フロントエンド判定ロジックを追加し、バックエンド実装時は無効化

### Potential Risks (→)

- **Risk**: Storybook バージョン違いによる非互換
  - Mitigation: CSF3 (Storybook 7+) を前提とし、古いバージョンは手動対応

### Unknown Risks (?)

- **Risk**: 複雑なコンポーネントでの生成品質
  - Mitigation: スケルトン生成に留め、詳細は手動カスタマイズ

## Verification Checklist

Before starting implementation, verify:

- [ ] All [?] items have been investigated
- [ ] Assumptions [→] have been validated
- [ ] Facts [✓] have current evidence
