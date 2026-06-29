# SOW テンプレート

/think が SOW / Spec 生成フェーズで生成する SOW のテンプレート。

## テンプレート

`{...}` は設計コンテキストで置き換え、`Session` に `${CLAUDE_SESSION_ID}` を埋める。任意と記したセクションは、書く内容がなければ見出しごと省略する。

```markdown
# SOW: {Feature Name}

Session: {session-id}

## Status

draft <!-- draft | in-progress | completed -->

## Why

| Field         | Value                        |
| ------------- | ---------------------------- |
| For           | {誰がこれを必要とするか}     |
| Problem       | {根拠ある痛み}               |
| Outcome       | {成功の姿: 機能ではなく結果} |
| Urgency       | {なぜ今、あとではないのか}   |
| Inaction cost | {これをやらないコスト}       |

## Overview

| Field     | Value                    |
| --------- | ------------------------ |
| Target    | {対象ファイル / 領域}    |
| Approach  | {アプローチサマリ}       |
| Reference | {関連ドキュメント / ADR} |

## Background

{現在のシステム状態、技術コンテキスト、先行例。今日存在しているもの。}

## Scope

### In Scope

<!-- 変更が反映された具体的なシグナル (新しいエンドポイントが 200 を返す、UI 要素が存在する、メトリクスのしきい値達成など)。 -->

| Target | Change     | Observable outcome       | Files  |
| ------ | ---------- | ------------------------ | ------ |
| {対象} | {変更内容} | {変更後に観察できるもの} | {件数} |

### Out of Scope

<!-- Why Outcome に寄与しないが想定されうるものを列挙する。各エントリは Why フィールド (Problem, Outcome, Urgency) または明示的な制約に紐づくこと。 -->

| Exclusion  | Why not (Why field / Constraint) |
| ---------- | -------------------------------- |
| {除外対象} | {理由}                           |

### Boundaries

<!-- 任意。存在する場合は最低 1 つの Never 行が必須。Enforced by にはメカニズムを名指しする。 -->

| Tier      | Item                                 | Enforced by                        |
| --------- | ------------------------------------ | ---------------------------------- |
| Always    | {エージェントが常に行うべき振る舞い} | {hook / spec only / manual review} |
| Ask first | {実行前に確認を要するアクション}     | {hook / spec only / manual review} |
| Never     | Never commit secrets                 | shields hook                       |

## Acceptance Criteria

<!-- 各 AC は Why Outcome に紐づくこと。Outcome に資さない AC はスコープクリープ。 -->

### AC-1: {タイトル}

<!-- テストが実行できる具体的なチェック。下流の Spec FR が曖昧さなくテストを生成できるようにする。 -->

| #   | Criterion        | Observable signal                          |
| --- | ---------------- | ------------------------------------------ |
| 1   | {検証可能な基準} | {観察方法: HTTP 200, 状態 X, メトリクス Y} |
| 2   | {検証可能な基準} | {観察方法}                                 |

## Implementation Plan

<!-- canonical: rules/core/PREFLIGHT.md (decomposition thresholds) -->
<!-- 1 AC = 1 Phase. Files ≥5 で Phase を Unit に分割。 -->

### Phase 1 (AC-N): {タイトル}

Completion signal: {Phase 完了を示す観察可能なシグナル。AC の Observable signal と同じ}

| Step | Action     | Files |
| ---- | ---------- | ----- |
| 1    | {ステップ} | N     |

Files: {この Phase のユニークファイル総数}

## Test Plan

<!-- 何をどう確認するかを具体的に記述する (実行コマンド、期待される観察結果)。「正しく動く」のような曖昧な表現は不可。 -->

| Test | AC   | Target | Verification     |
| ---- | ---- | ------ | ---------------- |
| T-1  | AC-N | {対象} | {何を検証するか} |

## Risks

<!-- アウトカム達成のリスクのみ。実装リスク (ビルドエラー、依存問題) は /fix や PR レビューに属し、ここには書かない。 -->
<!-- Probability は現行計画でリスクが顕在化する可能性。Impact HIGH で Mitigation が空はブロッカー。 -->

| Risk     | Outcome at risk                 | Impact       | Probability  | Mitigation |
| -------- | ------------------------------- | ------------ | ------------ | ---------- |
| {リスク} | {影響を受ける Why Outcome / AC} | HIGH/MED/LOW | HIGH/MED/LOW | {緩和策}   |
```
