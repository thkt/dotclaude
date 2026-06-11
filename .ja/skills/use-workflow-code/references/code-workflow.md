# /code ワークフロー

## フロー

```text
Phase 0: SOW Context + Test Generation
Phase 1-N: RGRC (一度に 1 テスト)
  Red → Green (Ralph-loop) → Refactor → Commit
Review: reviewer-readability (/fix ではスキップ)
E2E: generator-e2e (条件付き。Spec に Type: e2e + agent-browser + dev server)
Completion: Quality Gates → IDR
```

## Phase 0. SOW Context + Test Generation

### SOW/Spec の自動検出

../../_lib/sow-resolution.md を参照。

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

| 結果                   | アクション                               |
| ---------------------- | ---------------------------------------- |
| high 発見事項 0        | Pass → Quality Gates へ進む             |
| high 発見事項 1 件以上 | 問題を修正 → 影響を受けるテストを再実行 |
| medium/low のみ        | Pass (IDR にメモ)                        |
| timeout                | Skip (IDR にメモ)                        |

スキップする場合。`/fix`、単一ファイル変更、Spec context なし。

## E2E Phase

Review Gate の後、条件に応じて `generator-e2e` を spawn する。完全な条件と dev server の検出ロジックは `~/.claude/skills/code/SKILL.md` の E2E Phase セクションを参照。

スキップする場合。Spec に `Type: e2e` がない、agent-browser が未インストール、dev server がない、または `/fix`。

## 品質ゲート

プロジェクトのパッケージマネージャ (lockfile から検出) を使い、lint、型チェック、test を実行する。独立したコマンドは並列で実行する。

## 実装アプローチ

| 状況                                                  | アクション               |
| ----------------------------------------------------- | ------------------------ |
| コードベース内の既知パターンに一致 (file:line を引用) | 進める                   |
| 部分一致、一部不明点が残る                            | defensive チェックを追加 |
| 未知の領域、コードベースに前例なし                    | → まず /research        |

## IDR 生成

完了後。

````markdown
# IDR: {summary title}

> {YYYY-MM-DD}

## Summary

{変更と目的を要約する 2-3 文}

## Changes

### [{file path}](file:///{absolute path})

```diff
@@ -{old_start},{old_count} +{new_start},{new_count} @@
-removed line
+added line
```

> [!NOTE]
>
> - {何が変わったか (箇条書き)}

> [!TIP]
>
> - {決定}: {なぜこの決定をしたか}
> - 不採用: {却下した代替案}。{なぜ却下したか}

---

### git diff --stat

```
 {file} | {count} {++++----}
 N files changed, M insertions(+), D deletions(-)
```
````

ルール。

- File link. `file:///` + 絶対パス (VS Code でクリック可能)
- Diff. 行番号のため `@@` hunk header を含める
- ファイル毎の順序。link heading → diff → `[!NOTE]` What Changed → `[!TIP]` Design Rationale (却下した代替案がある場合は含める)
- 出力。`$IDR_DIR/idr-{NN}.md` (自動採番)、`$IDR_DIR` = `.claude/workspace/planning/YYYY-MM-DD-[feature]/`
- 言語。`settings.json` の `language` に従う
