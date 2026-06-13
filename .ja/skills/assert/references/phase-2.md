# Phase 2: Deep Assertion (並列)

次の 3 つを並列に起動する。Challenger と Verifier は background Task として走らせる。

| Task             | 実行者           | 入力                            | タイムアウト |
| ---------------- | ---------------- | ------------------------------- | ------------ |
| Adversarial test | Codex CLI (Bash) | worktree 内のスコープコード     | 600s         |
| Challenger       | critic-audit     | Phase 1 の重複除去済み findings | 120s         |
| Verifier         | critic-evidence  | Phase 1 の重複除去済み findings | 120s         |

## 2a. Adversarial Testing (worktree 内で Codex exec)

Phase 0 の成功が前提で、失敗していた場合はスキップする。実行する場合、`<adversarial-prompt>` には下記 § Codex プロンプトを使い、スコープファイル一覧を埋め込む。

```bash
codex exec -C <worktree-path> --full-auto "<adversarial-prompt>"
```

## Codex プロンプト

プロジェクトタイプに応じて調整する。テストの命名 / 型 / null の扱いはプロジェクトの慣習に委ね、結果の報告形式 (RESULTS block) は固定する。

```text
You are an adversarial tester. Your goal is to find bugs by writing tests that the original developer likely missed.

Target files:
<scoped file list>

Instructions:
1. Read each target file and understand its behavior
2. Generate edge-case tests targeting:
   - Boundary values (empty, zero, max, off-by-one)
   - Error paths (invalid input, null/nil equivalents, failure modes)
   - Input validation gaps (special characters, injection, overflow)
   - State transitions (concurrent access, race conditions if applicable)
   - Implicit assumptions (hardcoded limits, timezone, locale)
3. Write tests using the project's existing test framework and naming convention
4. Place tests following the project's test directory and file-naming convention
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

## 結果のパース

`ADVERSARIAL_RESULTS_START` と `ADVERSARIAL_RESULTS_END` の間の出力を parse する。results block がない場合は、テスト 0 件として扱う。この時 Evidence 表の Adversarial 列は `skipped` とし、ゲートはブロックしない。

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
