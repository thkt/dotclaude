# Adversarial Testingプロトコル

Codexが隔離worktreeでエッジケーステストを生成・実行し、結果を報告する。
失敗したテストはfindingに昇格する前にintent検証を通過する。

## 前提条件

- worktreeブートストラップ成功（Phase 0）
- モード選択によるスコープ済みファイルリスト

## Codexプロンプト

プロジェクト種別に応じて調整する。

```
You are an adversarial tester. Your goal is to find bugs by writing tests that
the original developer likely missed.

Target files:
<スコープ済みファイルリスト>

Instructions:
1. Read each target file and understand its behavior
2. Generate edge-case tests targeting:
   - Boundary values (empty, zero, max, off-by-one)
   - Error paths (null, undefined, invalid types, network failure)
   - Input validation gaps (special characters, injection, overflow)
   - State transitions (concurrent access, race conditions if applicable)
   - Implicit assumptions (hardcoded limits, timezone, locale)
3. Write tests using the project's existing test framework
4. Place tests in a file named `adversarial.test.<ext>` in the project test directory
5. Run the tests
6. Report results in this exact format:

ADVERSARIAL_RESULTS_START
test_name: <name>
target: <file:line being tested>
assertion: <what the test asserts>
result: PASS | FAIL
failure_detail: <error message if FAIL>
---
(repeat for each test)
ADVERSARIAL_RESULTS_END
```

## タイムアウト

600秒。タイムアウト時: adversarial testingスキップ、理由をレポートに記録。

## 結果パース

`ADVERSARIAL_RESULTS_START` 〜 `ADVERSARIAL_RESULTS_END` 間の出力をパースする。

| フィールド     | 抽出元         |
| -------------- | -------------- |
| test_name      | 結果ブロック   |
| target         | file:line      |
| assertion      | 結果ブロック   |
| result         | PASS / FAIL    |
| failure_detail | FAILの場合のみ |

| result | アクション              |
| ------ | ----------------------- |
| PASS   | survival rateにカウント |
| FAIL   | intent検証キューへ      |

結果ブロック未検出時はテスト生成0件（adversarialスコア = 15、中立）。

## Intent検証（Phase 2.5 — オーケストレーター）

以下のステップはCodexではなくオーケストレーター（Claude Code）が実行する。
オーケストレーターが各失敗adversarialテストをトリアージする。

### トリアージ手順

| Step | アクション                                       |
| ---- | ------------------------------------------------ |
| 1    | 失敗したassertionの説明を読む                    |
| 2    | 対象コードを読む（file:line ± 30行コンテキスト） |
| 3    | intentドキュメントを検索（下記Intentソース参照） |
| 4    | verdictルールを適用                              |

### Intentソース（確認順序）

| ソース         | 検索パターン                                    |
| -------------- | ----------------------------------------------- |
| コードコメント | 対象コードの前後10行のコメント                  |
| 関数docstring  | JSDoc, rustdoc, 対象関数のdocstring             |
| Spec           | SKILL.mdまたはCLAUDE.mdで参照されているSOW/Spec |
| README         | プロジェクトルートのREADME.md                   |
| テスト名       | 同じ関数の既存テストの説明                      |

### Verdictルール

| 条件                                 | Verdict | Confidence |
| ------------------------------------ | ------- | ---------- |
| Intentソースがテスト期待値と矛盾     | exclude | —          |
| Intentソースがテストの正しさを裏付け | promote | 0.85+      |
| Intentソースなし、明らかにバグ       | promote | 0.80       |
| Intentソースなし、挙動が曖昧         | promote | 0.70       |

### 除外ログ

```markdown
### 除外されたAdversarialテスト

| # | テスト | 理由 |
| 1 | test_null_throws | テストが誤った期待値をエンコード — 関数はnull返却が設計意図（42行目コメント）|
```

## メトリクス

| メトリクス      | 計算式                            | 用途             |
| --------------- | --------------------------------- | ---------------- |
| survival_rate   | passed / (passed + promoted_fail) | Evidence テーブル（情報）|
| exclusion_rate  | excluded / total_fail             | レポート（参考） |
| generation_rate | total_tests / scoped_files        | レポート（参考） |
