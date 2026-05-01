# Swarm リファレンス

実行中に SKILL.md から参照される詳細とテンプレート。

## Context Contracts

各ハンドオフは定義された構造を持つ。Peer DM がトランスポートで、これらの contract が送信内容を規定する。

### Spawn Context (Leader → 全エージェント)

すべての spawn プロンプトに以下を含める。

- CLAUDE.md ルール (または主要な制約のサマリ)
- プロジェクトの規約 (技術スタック、命名、パターン)
- SOW/spec の内容 (利用可能な場合)

### Architect Output (Architect → Leader)

```markdown
### Contracts

| Name                | Definition                   | Used By    |
| ------------------- | ---------------------------- | ---------- |
| interface/type name | TypeScript interface or type | file paths |

### Shared Changes

| File      | Change                | Apply           |
| --------- | --------------------- | --------------- |
| file path | description of change | before parallel |

### Parallel Units

| Unit ID | Files      | Depends On                                             |
| ------- | ---------- | ------------------------------------------------------ |
| 1       | file paths | (none), GOAL keep empty (independence-first)           |
| 2       | file paths | (none), populate only when unavoidable, with rationale |

Build sequence: unit_id order if dependencies exist
```

### Implementer Started (Implementer → Leader)

```markdown
| Field   | Value      |
| ------- | ---------- |
| unit_id | 1          |
| status  | started    |
| files   | file count |
```

### Implementer Assignment (Leader → Implementer)

```markdown
| Field       | Value                                 |
| ----------- | ------------------------------------- |
| unit_id     | 1                                     |
| contracts   | relevant contracts only               |
| files       | assigned file paths                   |
| tests       | assigned test file paths              |
| constraints | project-specific rules from CLAUDE.md |
```

### Implementer Completion (Implementer → Leader)

```markdown
## Status

| Field   | Value              |
| ------- | ------------------ |
| unit_id | 1                  |
| status  | complete / blocked |

### Files Modified

| Path      | Action             |
| --------- | ------------------ |
| file path | created / modified |

### Tests

| Metric | Value |
| ------ | ----- |
| total  | count |
| passed | count |
| failed | count |

### Issues

- description (severity: blocker / warning)
```

ステータスと issues に応じた Leader の対応。

| Status   | Issues     | Leader アクション                                    |
| -------- | ---------- | ---------------------------------------------------- |
| complete | none       | マージへ進む                                         |
| complete | warning(s) | warning を Architect に転送して評価依頼              |
| blocked  | blocker(s) | 評価: コンテキスト不足 → 情報を補って再ディスパッチ |
|          |            | 評価: 複雑すぎ → モデル昇格またはタスク分割         |
|          |            | 評価: 計画が誤り → ユーザーへエスカレート           |

## 進捗追跡

Leader は進捗テーブルを保持し、主要イベントでユーザーに報告する。

### 表示形式

```markdown
## Swarm Progress

| Unit | Files | Implementer | Status      | Duration |
| ---- | ----- | ----------- | ----------- | -------- |
| 1    | 3     | impl-1      | complete    | 2m 30s   |
| 2    | 2     | impl-2      | in_progress | 1m 45s   |
| 3    | 4     | impl-3      | in_progress | 1m 45s   |

Shared changes: applied Integration: pending (2/3 units complete)
```

### トリガーイベント

| イベント                  | アクション                              |
| ------------------------- | --------------------------------------- |
| Phase 4 開始              | 初期テーブルを表示 (全 pending)         |
| Implementer の started DM | 該当行のステータスを in_progress に更新 |
| Implementer の completion | 行を更新、進捗を表示                    |
| 全 Implementer 完了       | タイムラインサマリを表示                |
| Phase 6a マージ進捗       | ユニットごとのマージ状況を表示          |
| Phase 6b QG 結果          | pass/fail を詳細とともに表示            |

## Abort / Rollback

| シナリオ           | リカバリ                                                                      |
| ------------------ | ----------------------------------------------------------------------------- |
| Phase 1 中の中断   | Architect + QA をシャットダウン、TeamDelete                                   |
| Phase 3/4 中の中断 | test-gen + QA をシャットダウン、TeamDelete                                    |
| Phase 5 中の中断   | 全 Implementer + QA をシャットダウン、TeamDelete                              |
| Phase 6 中の中断   | マージ前に main にタグを付け、必要ならマージ済みコミットを revert、TeamDelete |
| 部分実装           | Implementer の worktree に変更が残る、保持/破棄はユーザーが判断               |
