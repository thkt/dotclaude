---
name: use-workflow-code
description: /code 用のワークフローオーケストレーション。
when_to_use: /code ワークフロー, quality gates, 品質ゲート, RGRC サイクル
allowed-tools: Read Write Task Bash(npm:*) Bash(npx:*) Bash(tsc:*) Bash(bun:*) Bash(ugrep:*) Bash(bfs:*)
user-invocable: false
---

# Workflow: /code

## ワークフロー

| コマンド | ワークフロー参照                                |
| -------- | ----------------------------------------------- |
| `/code`  | ${CLAUDE_SKILL_DIR}/references/code-workflow.md |

## パターン

| パターン       | 参照                                                        |
| -------------- | ----------------------------------------------------------- |
| IDR Generation | ${CLAUDE_SKILL_DIR}/../../hooks/lifecycle/idr-pre-commit.sh |
| TDD            | ${CLAUDE_SKILL_DIR}/../use-workflow-tdd-cycle/SKILL.md      |

<!-- canonical: rules/development/TESTING.md (coverage gate) -->

## 品質ゲート

| ゲート       | 目標               | 検証                                     |
| ------------ | ------------------ | ---------------------------------------- |
| Tests        | 全てパス           | `npm test` exit code 0                   |
| Lint         | エラー 0           | `npm run lint` exit code 0               |
| Types        | エラーなし         | `tsc --noEmit` exit code 0               |
| Coverage     | C0 ≥90%, C1 ≥80%   | カバレッジレポート                       |
| Test Quality | メトリック別の閾値 | `evaluator-test` (Spec なしならスキップ) |

### Test Quality Gate

Test Scenarios を含む Spec が存在する場合、以下の起動方法で `evaluator-test` をバックグラウンドエージェントとして spawn する。

```
Agent(subagent_type: "evaluator-test",
      prompt: "spec_path: <path>\ntest_paths: <paths>",
      run_in_background: true)
```

5 つのメトリック全てが閾値を満たせば pass。いずれかが fail なら、発見事項 (未カバーの T-NNN、過剰なテスト、重複、粒度の問題、意図の問題) を報告し、進む前に修正する。Spec が無いとき (例 `/fix`、ad-hoc な変更) はスキップ。

| メトリック  | 閾値 |
| ----------- | ---- |
| coverage    | ≥0.8 |
| excess      | ≤0.1 |
| duplication | ≤0.2 |
| granularity | ≥0.7 |
| intent      | ≥0.7 |

### Review Gate

RGRC サイクル後、`reviewer-readability` をバックグラウンドエージェントとして spawn する。

```
Agent(subagent_type: "reviewer-readability",
      prompt: "Review files changed in this session: <paths>",
      run_in_background: true)
```

High severity → 品質ゲートの前に修正。Medium/low → advisory (IDR にメモ)。
`/fix` および単一ファイル変更ではスキップ。

### ゲート結果の出力

```text
Tests:        pass | fail (detail)
Lint:         pass | fail (detail)
Types:        pass | fail (detail)
Coverage:     C0 XX% / C1 XX% - pass | fail
Test Quality: cov=X.X exc=X.X dup=X.X gran=X.X int=X.X | pass | fail | skip (no Spec)
```

5 行全てが必須。空行はスキップされたゲートを示す。進む前に調査すること。

## Rationalization Counters

| 言い訳                                 | 反論                                                             |
| -------------------------------------- | ---------------------------------------------------------------- |
| "テストは通ったから、lint は後でいい"  | Lint エラーは技術的負債。コミット前にエラー 0                    |
| "型エラーは警告にすぎない"             | `tsc --noEmit` exit 0 でなければ ship しない。型警告はエラー扱い |
| "カバレッジは十分近い"                 | "十分近い" は手間付きの失敗。閾値を満たすこと                    |
| "このゲートはこの変更には適用されない" | 4 つのゲート全てが全変更に適用される。例外なし                   |
