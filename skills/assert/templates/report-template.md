# Assertion Report Template

Skeleton for the /assert final report. Transcribe gate and findings values verbatim from the enhancer-evidence JSON decision block (references/phase-4.md § Gate Decode).

## Template

Replace `{...}` at generation time. When gate is `Ready (caveat)`, append `caveat: dynamic evidence skipped` to the gate row.

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

{All issues + build/test failures with Fix suggestions and source tag (challenger / verifier / adversarial). (none) when gate = Ready}

### Root Causes

{RC-001 format with description, category, findings, action}

### Issues

{High / Medium severity tables with Source tag, File:Line, Description, Evidence. Multi-source detections show all tags, e.g. [challenger, adversarial]}

### Adversarial Test Results

{test name, target, result, verdict per test}

### Outcome Evidence

{build/test pass/fail with stderr excerpts}

### Diff from previous

{Resolved / New / Carried versus workspace/history/}
```
