# /code ワークフロー

## フロー

```text
Phase 0: SOW Context + Test Generation
Phase 1-N: RGRC (one test at a time)
  Red → Green (gates auto-retry) → Refactor → Commit
Review: reviewer-readability (skip for /fix)
E2E: generator-e2e (conditional. Spec has Type: e2e + agent-browser + dev server)
Completion: Quality Gates
```

## Phase 0. SOW コンテキスト + テスト生成

### SOW/Spec の自動検出

${CLAUDE_SKILL_DIR}/../\_lib/sow-resolution.md を参照。

### テスト生成

前提。FR-xxx 項目を含む spec.md。

1. spec から FR-xxx 要件を解析する
2. すべてのテストを skip 状態で生成する
3. 順序。simple → complex (Baby Steps)
4. 各テストに `// T-NNN` コメントを追加し、Spec の Test Scenario ID にマッピングする

T-NNN 追跡性。各 `it()` ブロックに、対応する Spec のテストシナリオを参照するコメント (例 `// T-001`) を含める。これにより検証を生きたコード上で保ち、`evaluator-test` がカバレッジやその他の品質メトリックを計算できる。

## Phase 1-N. RGRC サイクル

各テストに対して。

| ステップ | アクション                                    |
| -------- | --------------------------------------------- |
| Red      | `.skip` を外し、正しい失敗を確認              |
| Green    | 最小限の実装 (Stop hook で gate が自動再試行) |
| Refactor | SOLID, DRY, Occam を適用                      |
| Commit   | 全チェックがパス                              |

## Review Gate

すべての RGRC サイクル後、`reviewer-readability` を spawn して、実装中に見落とした構造的・可読性の問題を捕捉する。

```text
Agent(subagent_type: "reviewer-readability",
      prompt: "Review files changed in this session: <changed file paths>",
      run_in_background: true)
```

| 結果                   | アクション                              |
| ---------------------- | --------------------------------------- |
| high 発見事項 0        | Pass → Quality Gates へ進む             |
| high 発見事項 1 件以上 | 問題を修正 → 影響を受けるテストを再実行 |
| medium/low のみ        | Pass                                    |
| timeout                | Skip                                    |

スキップする場合。`/fix`、単一ファイル変更、Spec context なし。

## E2E Phase

Review Gate の後、条件に応じて `generator-e2e` を spawn する。完全な条件と dev server の検出ロジックは ${CLAUDE_SKILL_DIR}/../code/SKILL.md の E2E Phase セクションを参照。

スキップする場合。Spec に `Type: e2e` がない、agent-browser が未インストール、dev server がない、または `/fix`。

## 品質ゲート

プロジェクトのパッケージマネージャ (lockfile から検出) を使い、lint、型チェック、test を実行する。独立したコマンドは並列で実行する。

## 実装アプローチ

| 状況                                                  | アクション               |
| ----------------------------------------------------- | ------------------------ |
| コードベース内の既知パターンに一致 (file:line を引用) | 進める                   |
| 部分一致、一部不明点が残る                            | defensive チェックを追加 |
| 未知の領域、コードベースに前例なし                    | → まず /research         |
