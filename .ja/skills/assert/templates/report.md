# Assertion レポートテンプレート

/assert 最終レポートの骨格。gate と findings の値は enhancer-evidence の JSON decision ブロックから decode した値をそのまま転記する (references/phase-4.md § Gate Decode)。

## テンプレート

`{...}` は生成時に置き換える。gate が `Ready (caveat)` のときは gate 行に `caveat: dynamic evidence skipped` を付記する。

```markdown
## Assertion Report

| Field     | Value                                     |
| --------- | ----------------------------------------- |
| gate      | Ready / Ready (caveat) / NotReady         |
| mode      | diff (main) / diff (uncommitted) / target |
| scope     | {file count} files                        |
| bootstrap | success / failed: {reason}                |

### Gate Decision

| Check       | Value                                                                |
| ----------- | -------------------------------------------------------------------- |
| Build       | pass / fail / skipped                                                |
| Tests       | pass / fail (N passed, M failed) / skipped / no-runner               |
| Issues      | 0 / N total (X from challenger, Y from verifier, Z from adversarial) |
| Adversarial | N/M passed / skipped                                                 |

### Blockers

{全 issue + build/test 失敗を Fix 提案とソースタグ (challenger / verifier / adversarial) 付きで。gate = Ready のときは (none)}

### Root Causes

{RC-001 形式。説明、カテゴリ、findings、action 付き}

### Issues

{High / Medium severity 表。Source タグ、File:Line、Description、Evidence。複数ソース検出はすべてのタグを表示。例: [challenger, adversarial]}

### Adversarial Test Results

{テスト名、対象、結果、判定をテストごとに}

### Outcome Evidence

{build/test pass/fail、stderr 抜粋付き}

### Diff from previous

{workspace/history/ との比較で Resolved / New / Carried}
```
