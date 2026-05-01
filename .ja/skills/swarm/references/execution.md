# 実行 Phase

/swarm の Phase 別実行詳細。SKILL.md が Phase ごとにこれを参照する。

## Phase 0: SOW 検出

1. SOW/spec の自動検出
2. SOW なし → `$ARGUMENTS` が唯一の指示

## Phase 1: チーム編成 + アーキテクチャ

1. 名前 `swarm-{timestamp}` で `TeamCreate`
2. 以下のプロンプトで Architect (architect-feature) をスポーン。
   - Spawn Context (${CLAUDE_SKILL_DIR}/references/contracts.md#spawn-context-leader--all-agents 参照)
   - `$ARGUMENTS` の実装説明
   - 期待される出力: DM 経由の Architect Output contract
3. 以下のプロンプトで QA (team-qa) をスポーン。
   - 指示: Architect の設計を観察し、peer DM でコメント
   - チーム設定を読んでチームメイトを把握
4. Architect の contract DM を待つ

## Phase 2: 分割の承認

1. Architect の分割をユーザーに提示。
   - ファイル割当付きの並列ユニット
   - 共有変更 (並列実行前に適用)
   - 依存関係グラフ (理想は全独立)
   - 推定ワーカー数
2. ユーザーは分割を調整できる。
   - ユニットのマージ / 分割
   - ユニット間でのファイル再割当
   - 依存関係の判断を上書き
3. 承認後に Phase 3 へ進む

## Phase 3: テスト生成

1. 最終 Architect Output contract が確定したのち (Phase 1 + QA レビュー)
2. generator-test をスタンドアロンのバックグラウンドエージェントとしてスポーン (`subagent_type: generator-test`, `run_in_background: true`)
3. test-gen のプロンプトに Architect の contract を含める
4. `TaskOutput` でテスト結果を受け取る

## Phase 4: ファイル割当

1. 最終 Architect Output contract を受け取る (QA レビューラウンド後に確定)
2. `TaskOutput` で test-gen の結果を受け取る
3. Architect の `parallel_units` ごとに Implementer をスポーンする。分析は行わず機械的に。
   - 並列ユニットごとに 1 Implementer (worktree 隔離)
   - 単一ユニット → 単一 Implementer
   - `mode: "dontAsk"` (worktree 隔離が自律 Bash の安全性を担保)
   - プロンプト: ${CLAUDE_SKILL_DIR}/references/contracts.md#implementer-assignment-leader--implementer の Implementer Assignment contract
   - 指示: RGRC サイクル、質問は Architect に DM
4. ファイル割当を観察用に QA に転送

## Phase 5: RGRC 実装

1. Implementer 群が割り当てられたファイルを担当
2. 各 Implementer から `started` DM を待つ (受領確認)
   - Implementer ごとに 120s タイムアウト (/audit 慣行に揃える)
   - 120s 内に `started` DM がなければシャットダウンし、同じ割当で再スポーン (リトライ最大 1 回 → ユーザーへエスカレート)
3. Peer DM チャネル。
   - Implementer ↔ Architect: contract への質問、設計の明確化
   - QA → Implementer: エッジケース観察
   - QA → Architect: contract 品質の観察
   - QA → Leader: 検証コマンド要求
4. Leader は QA の検証要求を機械的に処理。
   - コマンド要求を受領 → 実行 → 結果を QA に返す
5. 全 Implementer の完了を待つ (ステータス付き DM)
6. 死亡疑い (完了 DM なし、異常に長い沈黙) を検出。
   - Leader が worktree を確認: `git -C <worktree-path> status`
   - 変更ファイルあり → 部分的な進捗あり
   - クリーン → Implementer は実作業を開始していない
   - 死亡 Implementer をシャットダウンし、同じ割当で再スポーン (リトライ最大 1 回 → ユーザーへエスカレート)。新しい Implementer は worktree の状態を読み、続行か再開かを独立に判断する

## Phase 6: 統合 + 品質ゲート

### 6a: マージ戦略

1. shared_changes を最初に適用 (Architect Output から)。
   - Leader は shared changes を main ブランチに直接適用
   - 適用に失敗したらマージを中止し、ユーザーへエスカレート
   - 検証: 適用後に main で type-check/lint を実行
2. 残りの worktree を逐次マージ。
   - 独立ユニットは完了順にマージ
   - depends_on を持つユニットは build_sequence の順にマージ
   - コンフリクトは `git merge` または branch 更新で解決
3. 最終状態: 全変更が main ブランチにある

<!-- canonical: skills/use-workflow-code (full gate table) -->

### 6b: 品質ゲート

1. Leader が main ブランチで QG (テスト、lint、型、カバレッジ) を実行
2. Spec が存在する場合: Spec 準拠チェック
   - ファイルカバレッジ: `git diff --name-only` を Spec の `## Implementation` ファイルリストと比較。新規テストファイルと設定ファイルは免除
   - 受け入れ基準の検証: SOW の AC ごとに、実装 + テストの存在を確認。未達または部分達成の AC は具体的なギャップを示してフラグ
3. 失敗時は以下のアクションを取る。
   - 失敗ファイルから責任エージェントを特定
   - 失敗詳細を DM でそのエージェントへ転送
   - エージェントが修正して報告
4. 修正後に QG を再実行
5. 最大 3 反復 → ユーザーへエスカレート

## Phase 7: サマリ

1. 全エージェントから結果を収集
2. サマリレポートを生成 (変更ファイル、テスト、issues)
3. 全エージェントをシャットダウン (`shutdown_request`)
4. クリーンアップとして `TeamDelete`
5. サマリをユーザーに提示
