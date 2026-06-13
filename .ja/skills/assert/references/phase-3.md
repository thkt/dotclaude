# Phase 3: Intent Assertion

Phase 2a の結果が返ったあと、orchestrator (Claude Code) が失敗した adversarial test を 1 件ずつトリアージする。この phase に並列処理はなく、Phase 2 全体の完了後に走る。

出力は promote された adversarial findings のリスト (`[adversarial]` ソースタグ付き) で、Phase 4 に渡す。

## トリアージ手順

| Step | アクション                                |
| ---- | ----------------------------------------- |
| 1    | 失敗 assertion の説明を読む               |
| 2    | 対象コードを読む (file:line の前後 30 行) |
| 3    | 下記 § Intent Sources から intent を探す  |
| 4    | 判定ルールを適用                          |

## Intent Sources

OUTCOME.md は「完了」の定義そのものなので、最優先で確認する。以下、上から順に確認。

| Source               | 検索パターン                                                        |
| -------------------- | ------------------------------------------------------------------- |
| `.claude/OUTCOME.md` | Pre-flight でキャッシュした Behavior / Non-goals / Constraints      |
| SOW / Spec           | `.claude/workspace/planning/` 配下。CLAUDE.md / SKILL.md からの参照 |
| ADR                  | `docs/decisions/` 等の ADR ディレクトリ                             |
| Commit message       | 対象ファイルの `git log`                                            |
| Code comments        | 対象コードの前後 10 行以内のコメント                                |
| Function docstring   | 対象関数の JSDoc, rustdoc, docstring                                |
| README               | プロジェクトルートの README.md                                      |
| Test names           | 同じ関数の既存テスト名                                              |

## 判定ルール

| 条件                                                                   | 判定    |
| ---------------------------------------------------------------------- | ------- |
| Intent source がテスト期待を否定                                       | exclude |
| それ以外 (source が見つからない、または source がテストの正しさを支持) | promote |

## 除外ログ

判定ルールで `exclude` としたテストを、レポートに次の形式で記録する。

```markdown
### Excluded Adversarial Tests

| # | Test             | Reason                                                                            |
| - | ---------------- | --------------------------------------------------------------------------------- |
| 1 | test_null_throws | test encodes wrong expectation. Function returns null by design (line 42 comment) |
```

## メトリクス

いずれもゲート判定には使わず、参考情報として記録する。

| Metric          | 計算式                              | 記録先      |
| --------------- | ----------------------------------- | ----------- |
| survival_rate   | `passed / (passed + promoted_fail)` | Evidence 表 |
| exclusion_rate  | `excluded / total_fail`             | レポート    |
| generation_rate | `total_tests / scoped_files`        | レポート    |
