# Adversarial Testing Protocol

Codex が隔離された worktree で edge-case テストを生成し、実行し、結果をレポートする。失敗したテストは intent assertion を経てから finding になる。

## 前提

- Phase 0 で worktree bootstrap が成功
- mode 選択でスコープが確定したファイル一覧

## Codex Prompt

プロジェクトタイプに応じて調整。

```
You are an adversarial tester. Your goal is to find bugs by writing tests that the original developer likely missed.

Target files:
<scoped file list>

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

## Timeout

600 秒。タイムアウト時は adversarial testing をスキップし、理由をレポートに記録する。

## Result Parsing

`ADVERSARIAL_RESULTS_START` と `ADVERSARIAL_RESULTS_END` の間の出力を parse する。

| Field          | ソース        |
| -------------- | ------------- |
| test_name      | results block |
| target         | file:line     |
| assertion      | results block |
| result         | PASS / FAIL   |
| failure_detail | FAIL のみ     |

| result | アクション                        |
| ------ | --------------------------------- |
| PASS   | survival rate にカウント          |
| FAIL   | intent assertion のキューに入れる |

results block がない場合: 0 テストとして扱う。Adversarial 列は Evidence 表で `skipped` を表示し、ゲートをブロックしない。

## Intent Assertion (Phase 3: Orchestrator)

以下のステップは Codex ではなく orchestrator (Claude Code) が実行する。
Phase 2a 戻り後、orchestrator が adversarial test の失敗を逐次トリアージする。

### Triage Steps

| Step | アクション                                          |
| ---- | --------------------------------------------------- |
| 1    | 失敗 assertion の説明を読む                         |
| 2    | 対象コードを読む (file:line ± 30 行のコンテキスト) |
| 3    | intent ドキュメントを探す (下記 Intent Sources)     |
| 4    | 判定ルールを適用                                    |

### Intent Sources (上から順に確認)

| Source             | 検索パターン                                        |
| ------------------ | --------------------------------------------------- |
| Code comments      | 対象コードの前後 10 行以内のコメント                |
| Function docstring | 対象関数の JSDoc, rustdoc, docstring                |
| Spec               | SKILL.md または CLAUDE.md で参照されている SOW/Spec |
| README             | プロジェクトルートの README.md                      |
| Test names         | 同じ関数の既存テスト名                              |

### Verdict Rules

| 条件                                                       | 判定    |
| ---------------------------------------------------------- | ------- |
| Intent source がテスト期待を否定                           | exclude |
| それ以外 (source 見つからず、または source がテストを支持) | promote |

### Exclusion Logging

```markdown
### Excluded Adversarial Tests

| # | Test             | Reason                                                                            |
| 1 | test_null_throws | test encodes wrong expectation. Function returns null by design (line 42 comment) |
```

## Metrics

| Metric          | 計算式                            | 用途                   |
| --------------- | --------------------------------- | ---------------------- |
| survival_rate   | passed / (passed + promoted_fail) | Evidence 表 (参考情報) |
| exclusion_rate  | excluded / total_fail             | レポート (info)        |
| generation_rate | total_tests / scoped_files        | レポート (info)        |
