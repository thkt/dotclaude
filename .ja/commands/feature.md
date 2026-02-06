---
description: 探索・アーキテクチャ設計・TDD・品質ゲートを含む包括的な機能開発
allowed-tools: SlashCommand, Read, Write, Glob, Grep, LS, Task, TaskCreate, TaskList, TaskUpdate, AskUserQuestion, Teammate, SendMessage
model: opus
argument-hint: "[機能の説明]"
---

# /feature - 機能開発オーケストレーター

## ローカライゼーション

`~/.claude/settings.json` を読み取り、`language` フィールドを確認。設定されている場合、ユーザー向けテキストをその言語に翻訳。内部処理は英語のまま。

## 入力

- 機能の説明: `$1`（任意）
- 空の場合 → AskUserQuestion でプロンプト（プロンプト: Feature Type 参照）

## 実行フロー

| Phase | 名前           | アクション                                  | ユーザーチェックポイント |
| ----- | -------------- | ------------------------------------------- | ------------------------ |
| 1     | Discovery      | コンテキストスキャン → PRE_TASK_CHECK       | [?] or [→] の解決        |
| 2-4   | Team Explore   | Explorer チーム + Architect → 確認 → /think | 確認事項 + アプローチ    |
| 5     | Implementation | /code (TDD/RGRC)                            | 開始前の承認             |
| 6     | Quality        | /audit → /test → /polish                    | 課題のトリアージ         |
| 7     | Validation     | /validate → サマリー                        | 完了                     |

## Phase 1: Discovery

### ステップ

1. クイックコンテキストスキャン（プロンプト前にプロジェクトタイプを検出）
   - CLAUDE.md, package.json, Cargo.toml, pyproject.toml 等を確認
   - Context Patterns とマッチング
2. `$ARGUMENTS` が空の場合 → コンテキストに応じた選択肢でプロンプト
3. Understanding Check を実行（下記参照）
4. [→] または [?] がある場合 → AskUserQuestion で解決
5. TaskCreate で todo を作成（Phase 2-4, 5, 6, 7）

### Understanding Check

| マーカー | 意味   | 必要なアクション |
| -------- | ------ | ---------------- |
| [✓]      | 確認済 | なし - 続行      |
| [→]      | 推定   | 続行前に確認     |
| [?]      | 不明   | 続行前に調査     |

ルール: 全項目が [✓] でなければ続行不可。

| 項目     | チェック基準                        |
| -------- | ----------------------------------- |
| 目的     | なぜ必要か + ユーザーの根本的な意図 |
| スコープ | 対象ファイル/関数の特定             |
| 制約     | 技術要件 + 制限 + 依存関係          |
| 完了     | 完了基準 + 検証方法                 |
| 文脈     | 既存コードパターンの理解            |
| 影響範囲 | 影響する領域 + 潜在的リスク         |
| 前提条件 | 技術スタック/規約の確認             |

表示形式:

```text
🧠 Understanding: [███████░░░] 71% (5/7 verified)

┌─ Checklist ────────────────────────────────────
│ [✓] 目的: {説明}
│ [→] スコープ: {説明} ← 確認
│ [?] 制約: {説明} ← 調査
│ ...
└────────────────────────────────────────────────

⚡ Status: 🟢 Ready / 🟡 Needs confirmation / 🔴 Blocked
```

### タスク分解

いずれかの閾値を超えた場合に分割:

| 条件       | 閾値 |
| ---------- | ---- |
| ファイル数 | ≥5   |
| 機能数     | ≥3   |
| レイヤー数 | ≥3   |
| 行数       | ≥200 |

### Context Patterns

| パターン           | 検出方法                                        | 選択肢                                           |
| ------------------ | ----------------------------------------------- | ------------------------------------------------ |
| Claude Code config | `~/.claude/` or `.claude/` with commands/hooks/ | Add command, Add skill, Add hook, Add agent      |
| React/Next.js      | package.json に `react`, `next`                 | Add component, Add page, Add API route, Add hook |
| API server         | Express, Fastify, Hono, or `src/routes/`        | Add endpoint, Add middleware, Add service        |
| CLI tool           | package.json の bin or `src/cli/`               | Add command, Add option, Add subcommand          |
| Library            | package.json の main/exports                    | Add function, Add class, Add type                |
| Fallback           | 一致なし                                        | New feature, Feature extension, Refactoring      |

## Phase 2-4: チーム探索 & アーキテクチャ

3人の Explorer と 1人の Architect からなる協調チームを生成し、並列探索とプログレッシブなアーキテクチャ設計を実施。

### チーム構成

```text
/feature command (LEADER)
├── explorer-data    (feature-explorer, Data layer)
├── explorer-api     (feature-explorer, UI/API)
├── explorer-core    (feature-explorer, Core logic)
└── architect        (feature-architect, progressive mode)
```

### ワークフロー

| Step | アクター  | アクション                                                             |
| ---- | --------- | ---------------------------------------------------------------------- |
| 1    | Leader    | `Teammate.spawnTeam("feature-{timestamp}")`                            |
| 2    | Leader    | TaskCreate x 4 (explorer-data, explorer-api, explorer-core, architect) |
| 3    | Leader    | Task で `team_name` 指定して4つの Teammate を生成                      |
| 4    | Explorers | 担当フォーカスエリアを調査、結果を `architect` に DM                   |
| 5    | Architect | Explorer の発見を逐次処理                                              |
| 6    | Leader    | 全 Explorer の完了を待機                                               |
| 7    | Leader    | AskUserQuestion で確認事項を質問（エッジケース、エラー処理等）         |
| 8    | Leader    | SendMessage で確認結果を `architect` に送信                            |
| 9    | Architect | 最終アーキテクチャ設計を作成                                           |
| 10   | Leader    | SendMessage `shutdown_request` を全 Teammate に送信                    |

### フォーカス割り当て

| Teammate      | subagent_type    | フォーカスエリア | 優先ディレクトリ                   |
| ------------- | ---------------- | ---------------- | ---------------------------------- |
| explorer-data | feature-explorer | Data layer       | repos/, models/, schemas/, db/     |
| explorer-api  | feature-explorer | UI/API           | components/, api/, routes/, pages/ |
| explorer-core | feature-explorer | Core logic       | services/, utils/, lib/, core/     |

エージェント: [feature-explorer.md](../agents/explorers/feature-explorer.md)

### Architect の指示

`architect` をプログレッシブモード指示付きで Task プロンプトから生成:

1. パターン分析を即座に開始（Explorer を待たない）
2. Explorer の発見を DM 受信時に逐次取り込み
3. Leader の確認事項 DM 受信後 → 最終設計を作成
4. 3つのアプローチを評価: Minimal Changes, Clean Architecture, Pragmatic Balance

エージェント: [feature-architect.md](../agents/architects/feature-architect.md)

### チーム後処理

1. 比較表と推奨案を提示
2. 好みを質問（プロンプト: Design Choice 参照）
3. 技術的判断が必要な場合 → ADR について質問
4. /think を実行 → 出力: SOW + Spec

ユーザーが「お任せで」と言った場合 → 推奨案を提示 → プロンプト: Delegation Confirm を使用

## Phase 5: 実装

1. 承認を求める（プロンプト: Start Implementation 参照）
2. 承認を得たら → /code を実行

## Phase 6: 品質レビュー

1. /audit → /test → /polish を実行
2. 発見事項を提示、トリアージを質問（プロンプト: Issue Triage 参照）
3. 選択された課題に対応

## Phase 7: 検証

1. /validate を実行
2. IDR は git commit hook で自動生成
3. サマリーを提示

## プロンプト

### Feature Type

検出された Context Pattern から選択肢を生成。

#### Claude Code Config

```yaml
question: "何を追加しますか？"
header: "Feature Type"
multiSelect: false
options:
  - label: "Add command"
  - label: "Add skill"
  - label: "Add hook"
  - label: "Add agent"
```

#### Fallback

```yaml
question: "どのタイプの機能ですか？"
header: "Feature Type"
multiSelect: false
options:
  - label: "New Feature"
  - label: "Feature Extension"
  - label: "Refactoring"
```

### Design Choice

```yaml
question: "どのアーキテクチャアプローチにしますか？"
header: "Design"
multiSelect: false
options:
  - label: "Pragmatic Balance (推奨)"
  - label: "Minimal Changes"
  - label: "Clean Architecture"
  - label: "Review Details"
```

### ADR Creation

```yaml
question: "ADR として記録しますか？"
header: "ADR"
multiSelect: false
options:
  - label: "Create ADR"
  - label: "Skip"
```

### Start Implementation

```yaml
question: "実装を開始しますか？"
header: "Implement"
multiSelect: false
options:
  - label: "Start"
  - label: "Revise Design"
  - label: "Have Questions"
```

### Issue Triage

```yaml
question: "課題をどう扱いますか？"
header: "Triage"
multiSelect: false
options:
  - label: "Fix All"
  - label: "Fix Critical Only"
  - label: "Proceed As-Is"
  - label: "Review Individually"
```

### Delegation Confirm

```yaml
question: "推奨: [recommendation]。続行しますか？"
header: "Confirm"
multiSelect: false
options:
  - label: "Yes, proceed"
  - label: "No, explain options"
```

## 検証

| チェック                            | 必須 |
| ----------------------------------- | ---- |
| 4つの Teammate でチーム生成した？   | Yes  |
| アーキテクチャ設計が作成された？    | Yes  |
| ユーザーが実装を承認した？          | Yes  |
| /code が正常に完了した？            | Yes  |
| /audit が合格した（重大課題なし）？ | Yes  |
| /validate が成功した？              | Yes  |

## エラーハンドリング

| 条件               | アクション                                    |
| ------------------ | --------------------------------------------- |
| チーム作成失敗     | エラーをログ、部分的な結果を報告              |
| Teammate 生成失敗  | 残りの Teammate で続行                        |
| Teammate 無応答    | shutdown_request → 利用可能なデータで続行     |
| DM 配信失敗        | 1回リトライ、その後 Leader が直接データを渡す |
| /code 失敗         | エラーを提示、ガイダンスを求める              |
| /audit で重大課題  | 解決されるまで Phase 7 をブロック             |
| ユーザーキャンセル | 現在の Phase + Step を SOW メタデータに保存   |

## レジューム

### SOW 検出

1. `$HOME/.claude/workspace/.current-sow` で追跡中の SOW パスを確認
2. 未発見の場合 → Glob で `$HOME/.claude/workspace/planning/*/sow.md` を検索
3. 複数 SOW がある場合 → AskUserQuestion でユーザーに選択を促す
4. SOW メタデータを読み取りレジュームポイントを決定

### レジュームアクション

| SOW ステータス | アクション                     |
| -------------- | ------------------------------ |
| Phase N 進行中 | 最後に完了したステップから続行 |
| Phase N 完了   | Phase N+1 から開始             |
| SOW 未発見     | Phase 1 から新規開始           |

### 状態追跡

レジューム用 SOW メタデータフィールド:

```yaml
status:
  current_phase: 4
  current_step: 2
  completed_phases: [1, 2, 3]
  exploration_summary: "..."
  clarification_answers: { ... }
  selected_architecture: "pragmatic"
```
