# Phase 2: Deep Assertion (並列)

次の 3 つを並列に起動する。Challenger と Verifier は background Task として走らせる。

| Task             | 実行者           | 入力                            | タイムアウト |
| ---------------- | ---------------- | ------------------------------- | ------------ |
| Adversarial test | Codex CLI (Bash) | worktree 内のスコープコード     | 600s         |
| Challenger       | critic-audit     | Phase 1 の重複除去済み findings | 120s         |
| Verifier         | critic-evidence  | Phase 1 の重複除去済み findings | 120s         |

## 2a. Adversarial Testing

Phase 0 の成功が前提で、失敗していた場合はスキップする。`<adversarial-prompt>` には下記 § Codex プロンプトを使い、スコープファイル一覧を埋め込む。フラグは `${CLAUDE_SKILL_DIR}/references/phase-1.md` § 1c. テスト実行 と同じ。worktree 内で下記コマンドを実行する。

```bash
codex exec -c sandbox_workspace_write.network_access=true -C <worktree-path> --full-auto "<adversarial-prompt>" </dev/null
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

Codex 出力は background Bash の output-file をそのまま `${CLAUDE_SKILL_DIR}/scripts/parse-adversarial.py` に渡す (`$TMPDIR` へ再リダイレクトしない)。

```bash
"${CLAUDE_SKILL_DIR}/scripts/parse-adversarial.py" <codex-output-file> --scoped-files <N>
```

スクリプトは JSON `{tests, total, passed, failed, generation_rate, survival_rate}` を返す。`total = 0` の場合は Evidence 表の Adversarial 列を `skipped` とし、ゲートはブロックしない。survival_rate は Phase 3 の triage 後に `--promoted <N>` を添えて再実行すると算出される (`${CLAUDE_SKILL_DIR}/references/phase-3.md` § メトリクス)。

各 test のフィールド (test_name / target / assertion / result / failure_detail) は JSON の `tests` 配列に入る。`result` の扱いは下表。

| result | アクション                        |
| ------ | --------------------------------- |
| PASS   | survival rate にカウント          |
| FAIL   | intent assertion のキューに入れる |
