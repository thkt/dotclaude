---
description:
  マルチエージェントswarmによる大規模並列実装。Architect + QA +
  Implementer(s)がpeer DMで協業。ユーザーが大規模実装, 並列実装, swarm,
  チーム実装に言及した場合に使用。
allowed-tools:
  Skill, Bash(npm run), Bash(npm run:*), Bash(yarn run), Bash(yarn run:*),
  Bash(yarn:*), Bash(pnpm run), Bash(pnpm run:*), Bash(pnpm:*), Bash(bun run),
  Bash(bun run:*), Bash(bun:*), Bash(make:*), Bash(git status:*), Bash(git
  log:*), Bash(git diff:*), Edit, MultiEdit, Write, Read, Glob, Grep, LS, Task,
  TaskCreate, TaskList, TaskUpdate, TaskGet, SendMessage, TeamCreate,
  TeamDelete, AskUserQuestion
model: opus
argument-hint: "[実装内容]"
---

# /swarm - 大規模並列実装

マルチエージェントswarmによる大規模実装。5ファイル未満のタスクには /code を使用。

## 使用条件

以下のいずれかの条件に該当する場合は /swarm を使用。それ以外は /code。

| 条件            | /swarm |
| --------------- | ------ |
| ファイル数 >= 5 | Yes    |
| マルチドメイン  | Yes    |
| 設計判断が多数  | Yes    |

## リーダー原則

リーダーは実質的な作業を行わない:

- コードを読んで理解しない
- 契約やアーキテクチャを設計しない
- デバッグや修正をしない
- 技術的な質問に回答しない

リーダーが行うのは:

- ユーザーとのインターフェース
- QGコマンドの機械的実行
- エージェントへの結果転送
- チームライフサイクルの管理

全ての実質的な作業はArchitect、QA、Implementer(s)間のpeer DMで行われる。

## 入力

実装の説明: `$1`（必須、空→プロンプト表示）

## SOWコンテキスト

[@../../skills/lib/sow-resolution.md]

## チームアーキテクチャ

| エージェント   | subagent_type     | 責務                           | Bash | SendMessage | Model  |
| -------------- | ----------------- | ------------------------------ | ---- | ----------- | ------ |
| Leader         | (self)            | ユーザーIF、QG、ライフサイクル | Yes  | broadcast   | opus   |
| Architect      | feature-architect | コードベース分析、契約         | No   | peer DM     | opus   |
| QA             | qa-reviewer       | 品質観察（非ブロッキング）     | No   | peer DM     | sonnet |
| Implementer(s) | unit-implementer  | RGRC実装                       | Yes  | peer DM     | opus   |

### モデル制約

全チームエージェントはOpusまたはSonnetを使用すること。Haikuは以下が不安定:

- 初回で複雑な多段指示に従うこと
- shutdownプロトコル（`shutdown_response`）の処理

## コンテキスト契約

各ハンドオフには定義された構造がある。peer
DMが転送手段であり、これらの契約は何を送るかを定義する。

### スポーンコンテキスト (Leader → 全エージェント)

全スポーンプロンプトに必須:

- CLAUDE.mdルール（または主要制約のサマリー）
- プロジェクト慣例（技術スタック、命名、パターン）
- SOW/spec内容（存在する場合）

### Architectアウトプット (Architect → Leader)

```yaml
contracts:
  - name: "<インターフェース/型名>"
    definition: "<TypeScriptインターフェースまたは型>"
    used_by: ["<ファイルパス>"]
parallel_units:
  - unit_id: 1
    files: ["<ファイルパス>"]
    depends_on: [] # 空 = 独立
  - unit_id: 2
    files: ["<ファイルパス>"]
    depends_on: []
build_sequence: ["依存がある場合のunit_id順序"]
```

### Implementerアサインメント (Leader → Implementer)

```yaml
unit_id: 1
contracts: ["<関連する契約のみ>"]
files: ["<割り当てファイルパス>"]
tests: ["<割り当てテストファイルパス>"]
constraints: ["<CLAUDE.mdからのプロジェクト固有ルール>"]
```

### Implementer完了報告 (Implementer → Leader)

```yaml
unit_id: 1
status: complete | blocked
files_modified: ["<パス>"]
tests: { total: N, passed: N, failed: N }
issues: [{ description: "<問題>", severity: blocker | warning }]
```

## 実行

### Phase 0: SOW検出

1. SOW/specの自動検出
2. SOWなし → `$1` が唯一の指示

### Phase 1: チームセットアップ + アーキテクチャ

1. `TeamCreate` で名前 `swarm-{timestamp}`
2. Architect (feature-architect) をスポーン:
   - スポーンコンテキスト（コンテキスト契約を参照）
   - `$1` 実装の説明
   - 指示: コードベース探索（yomu優先、grep/globフォールバック） → 契約設計 →ファイルグルーピング
   - 期待出力: Architectアウトプット契約（DM経由のYAML）
3. QA (qa-reviewer) をスポーン:
   - 指示: Architectの設計を観察、peer DMでコメント
   - チーム設定を読んでチームメイトを把握
4. ArchitectのcontractDMを待機

### Phase 2: テスト生成

1. Architectアウトプット契約の最終確定後（Phase 1 + QAレビュー）
2. test-generatorをstandalone
   backgroundエージェントとしてスポーン (`subagent_type: test-generator`,
   `run_in_background: true`)
3. Architectの契約をtest-genプロンプトに含める
4. `TaskOutput` でテスト結果を受信

### Phase 3: ファイルアサインメント

1. Architectアウトプット契約の最終版を受信（QAレビューラウンド確定後）
2. `TaskOutput` でtest-gen結果を受信
3. Architectの `parallel_units`
   に従いImplementer(s)をスポーン（機械的に — 分析なし）:
   - 並列ユニットごとに1 Implementer（worktree隔離）
   - 単一ユニット → 単一Implementer
   - `mode: "dontAsk"`（worktree隔離により自律Bashが安全）
   - プロンプト: Implementerアサインメント契約（コンテキスト契約を参照）
   - 指示: RGRCサイクル、質問はArchitectにDM
4. ファイルアサインメントをQAに転送（観察用）

### Phase 4: RGRC実装

1. Implementer(s)が割り当てファイルで作業
2. peer DMフロー:
   - Implementer ↔ Architect: 契約の質問、設計の明確化
   - QA → Implementer: エッジケースの観察
   - QA → Architect: 契約品質の観察
   - QA → Leader: 検証コマンドのリクエスト
3. LeaderがQAの検証リクエストを機械的に処理:
   - コマンドリクエスト受信 → 実行 → 結果をQAに返却
4. 全Implementerの完了を待機（ステータスDM）

### Phase 5: 品質ゲート

1. LeaderがQGを実行（tests, lint, types, coverage）
2. 失敗時:
   - 失敗ファイルから担当エージェントを特定
   - 失敗詳細をそのエージェントにDMで転送
   - エージェントが修正して報告
3. 修正後にQGを再実行
4. 最大3回 → ユーザーにエスカレーション

### Phase 6: サマリー

1. 全エージェントから結果を収集
2. サマリーレポート生成（変更ファイル、テスト、問題）
3. 全エージェントをシャットダウン（`shutdown_request`）
4. `TeamDelete` でクリーンアップ
5. ユーザーにサマリーを提示

## エラーハンドリング

| シナリオ                | アクション                                                     |
| ----------------------- | -------------------------------------------------------------- |
| ユーザーキャンセル      | 全エージェントに `shutdown_request`、TeamDelete                |
| 契約が根本的に誤り      | Implementerをシャットダウン → Architect再設計                  |
| Implementerタイムアウト | タイムアウトしたImplementerをシャットダウン、他は継続          |
| QG3回失敗               | 詳細を添えてユーザーにエスカレーション                         |
| Agent Bash権限ブロック  | worktree隔離済みImplementerに `mode: "dontAsk"` を使用         |
| test-genタイムアウト    | Leaderがテストを直接生成                                       |
| test-genがテスト0件生成 | specの存在を確認、ユーザーに質問                               |
| シャットダウン応答なし  | 明示的なツールパラメータでリトライ → team dirを `~/.Trash/` に |

## 中断 / ロールバック

| シナリオ          | 復旧                                                         |
| ----------------- | ------------------------------------------------------------ |
| Phase 1途中で中断 | Architect + QAをシャットダウン、TeamDelete                   |
| Phase 4途中で中断 | 全Implementer + QAをシャットダウン、TeamDelete               |
| 部分的な実装      | Implementerのworktreeに変更が残る、ユーザーが保持/破棄を決定 |
