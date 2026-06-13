---
name: polish
description: Light adversarial probe + cleanup. Codex + CodeRabbit + Antigravity findings are challenged by critic-audit, not aggregated as facts. Do NOT use for deep multi-reviewer audits (use /audit).
when_to_use: 整理して, きれいにして, コード整理, slop除去, ポリッシュ, テスト整理, テスト監査, クロスチェック, crosscheck, Codex レビュー, CodeRabbit, Gemini レビュー
allowed-tools: Bash(codex:*) Bash(coderabbit:*) Bash(agy:*) Bash(git diff:*) Bash(git log:*) Bash(git stash:*) Bash(git status:*) Bash(cargo test:*) Bash(npm test:*) Bash(npm run test:*) Bash(bun test:*) Bash(pnpm test:*) Bash(yarn test:*) Bash(make test:*) Bash(which:*) Read Edit LS Skill Task AskUserQuestion Bash(ugrep:*) Bash(bfs:*)
model: opus
argument-hint: "[target scope]"
---

# /polish - Light Review + Cleanup

Parallel review (code-review + Codex + CodeRabbit + Antigravity) → critic-audit adversarial challenge → cleanup (simplify + enhancer-code). All fixes applied directly in foreground.

Phase 1 reviewers run in parallel without seeing each other's findings. Aggregating their outputs is a sum, not a discussion. Phase 1.5 spawns `critic-audit` once over the aggregated set so a single skeptical reader judges each finding against the actual code, downgrades or disputes the ones that miss context, and lets only validated items reach Phase 2.

## Input

- Target scope: `$ARGUMENTS` (optional)
- If `$ARGUMENTS` is empty → analyze `git diff HEAD` (staged + unstaged changes)

## Execution

### Phase 1: Parallel review + adversarial challenge

Run code-review (high effort), Codex, CodeRabbit, and Antigravity in parallel. Each tool skips independently if unavailable. If all skip, proceed to Phase 2. Antigravity (Gemini-backed) provides cross-family review to counter Self-Enhancement bias when Claude generated the code.

code-review effort rationale. `high` is used because critic-audit (Phase 1.5) filters false positives. Upstream breadth raises the catch rate on bugs that low/default would miss; downstream skepticism keeps the noise out of Phase 2.

| Tool        | Focus                                         | Skip condition                                             |
| ----------- | --------------------------------------------- | ---------------------------------------------------------- |
| code-review | Reuse, quality, efficiency (high effort)      | (always available)                                         |
| Codex       | Logic, architecture, data flow                | `which codex` fails                                        |
| CodeRabbit  | Security, mechanical bugs (P1)                | `which coderabbit` fails OR `coderabbit auth status` fails |
| Antigravity | Logic, maintainability (cross-family skeptic) | `which agy` fails                                          |

Mode selection by change state. If both uncommitted and committed changes exist, use uncommitted mode.

| Condition                       | Mode        | Codex                        | CodeRabbit                                     | Antigravity diff source |
| ------------------------------- | ----------- | ---------------------------- | ---------------------------------------------- | ----------------------- |
| Uncommitted changes             | uncommitted | `codex review --uncommitted` | `coderabbit review --agent --type uncommitted` | `git diff HEAD`         |
| Commits vs base, no uncommitted | base        | `codex review --base main`   | `coderabbit review --agent --type committed`   | `git diff main...HEAD`  |

Antigravity command. Capture the diff via the source above into `$DIFF`, then pass it inline so Antigravity does not need shell access.

```sh
OUT="$(agy -p --print-timeout 4m "$(cat <<EOF
Review this diff. The code may be Claude-generated, so be skeptical to counter Self-Enhancement bias.
Focus: Logic correctness, Architecture, Maintainability.
Skip: Security (covered by CodeRabbit), Code reuse and AI slop (covered by code-review and enhancer).
Output per finding: [Critical|Major|Minor] file:line - description. Drop Minor.
<diff>
${DIFF}
</diff>
EOF
)")"

# Capacity detection. On quota exhaustion agy prints nothing and still exits 0
# (or stalls until --print-timeout), so empty stdout must NOT be read as
# "reviewed, no findings"; doing so silently drops the cross-family skeptic.
if [ -n "${OUT//[[:space:]]/}" ]; then
  printf '%s\n' "$OUT"          # findings → Phase 1 aggregation
elif ugrep -q 'RESOURCE_EXHAUSTED' ~/.gemini/antigravity-cli/cli.log 2>/dev/null; then
  RESET="$(ugrep -o 'Resets in [0-9hms]*' ~/.gemini/antigravity-cli/cli.log | tail -1)"
  echo "antigravity: skipped (quota exhausted${RESET:+, $RESET})"
else
  echo "antigravity: skipped (no output)"
fi
```

Notes. `agy -p` runs a single prompt non-interactively (Antigravity CLI, Gemini-backed). Read-only by construction: the prompt is self-contained via the inline diff, no `--add-dir` grants a workspace, and `--dangerously-skip-permissions` is omitted so no edit can be auto-approved (in `--print` mode no permission prompt is possible). Model and rate limits are managed by Antigravity, not user-selectable via flag.

Capacity detection rationale. Quota exhaustion does not surface as a non-zero exit or stderr: agy prints empty stdout with exit 0, and sometimes stalls instead. `--print-timeout 4m` bounds the stall (agy default is 5m). Empty stdout therefore never counts as a clean review. The block above classifies it as `skipped`, reading the resets-in window from `~/.gemini/antigravity-cli/cli.log` (the default app-data log path; differs if a custom `.gemini` dir is set), so the cross-family skeptic is reported as missing rather than vanishing silently.

CodeRabbit drops (Phase 2 territory, not applied here): naming, formatting, readability, AI slop. Users should set `profile: chill` in `.coderabbit.yaml` to reduce free-tier rate-limit pressure.

Steps for orchestrating Phase 1.

| Step | Action                                                                                                                                                                                                                                                                                                                                           |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1    | Detect mode: `git status --porcelain` → uncommitted or base                                                                                                                                                                                                                                                                                      |
| 2    | Spawn code-review via `Skill("code-review", args: "high")` and run Codex/CodeRabbit/Antigravity CLIs concurrently in the same response                                                                                                                                                                                                           |
| 3    | Wait for all four tasks to return findings                                                                                                                                                                                                                                                                                                       |
| 4    | Dedupe findings across tools by file:line                                                                                                                                                                                                                                                                                                        |
| 5    | Adversarial challenge. Map each aggregated finding to the critic-audit input schema (see `~/.claude/agents/critics/critic-audit.md`, Input section). Spawn `Task(subagent_type: "critic-audit")` once with the full list. Wait for per-finding verdict: confirmed / disputed / downgraded / needs_context                                        |
| 6    | Triage. Apply critic-audit verdicts first: drop `disputed`, apply `downgraded` severity, surface `needs_context` to user with a one-line summary. On the survivors, keep code-review all, Codex P1/P2, CodeRabbit critical only, Antigravity Critical+Major. Drop Phase 2 territory. Drop fixes whose edits touch files outside `git diff` scope |
| 7    | Fix surviving findings (high first, then medium)                                                                                                                                                                                                                                                                                                 |
| 8    | Detect test command and validate. `git stash` fix on test failure                                                                                                                                                                                                                                                                                |

### Phase 2: Code cleanup

Two cleanup mutators run in sequence on the post-Phase-1 diff, then tests validate. Both are cleanup-only and apply fixes directly, so they bypass critic-audit by design, the same trust model Phase 2 already grants enhancer-code. Neither hunts bugs, so no finding skips the Phase 1.5 challenge.

enhancer-code runs last so its preservation rules (when in doubt, keep) get the final say over simplify's edits. It sees the post-2a structure, so AI slop detection reflects the final code state, not pre-fix bias.

`simplify` defaults to the current diff like the Phase 1 code-review call. If it rejects a no-arg invocation, pass the same diff scope Phase 1 detected.

| Step | Action                                                                                                                                 | Covers                                                                      |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| 2a   | `Skill("simplify")` on the current diff. Cleanup-only review (reuse, simplification, efficiency, altitude) with fixes applied directly | altitude, the cleanup dimension findings-only code-review in Phase 1 misses |
| 2b   | Spawn `enhancer-code` via `Task(subagent_type: "enhancer-code")`. Removes AI slop, applies simplification rules, audits tests          | AI slop, test audit, preservation-guarded simplification                    |
| 2c   | Detect test command and validate. `git stash` the cleanup edits on failure                                                             | regression guard for both mutators                                          |

## Output

```text
Phase 1 (review):
  code-review: <summary>
  codex: <fixed N / skipped N with reasons / not available>
  coderabbit: <fixed N / skipped N with reasons / not available>
  antigravity: <fixed N / skipped N with reasons / not available>
Phase 1.5 (critic-audit challenge):
  total: N / confirmed: N / disputed: N / downgraded: N / needs_context: N
Phase 2 (cleanup):
  simplify: <changes with file:line / not available>
  enhancer-code:
    Code: <changes with file:line>
    Tests: <changes with file:line>
    Skipped: <files not audited, with reason>
  validation: <test command + pass/fail>
```

## Error Handling

| Error                                              | Action                                                                                 |
| -------------------------------------------------- | -------------------------------------------------------------------------------------- |
| No changes in diff                                 | Report "Nothing to polish"                                                             |
| code-review fails                                  | Log warning, continue with other tools                                                 |
| codex not installed                                | Skip Codex only, keep others                                                           |
| codex review fails                                 | Log warning, proceed                                                                   |
| coderabbit not installed                           | Skip CodeRabbit only, keep others                                                      |
| coderabbit auth status fails                       | Skip CodeRabbit only, keep others                                                      |
| coderabbit review fails                            | Log warning, proceed                                                                   |
| agy not installed                                  | Skip Antigravity only, keep others                                                     |
| agy empty stdout + `RESOURCE_EXHAUSTED` in cli.log | Report `antigravity: skipped (quota exhausted, <resets in>)`; do not count as reviewed |
| agy empty stdout, no quota marker                  | Report `antigravity: skipped (no output)`; do not count as reviewed                    |
| agy call fails                                     | Log warning, proceed                                                                   |
| critic-audit returns empty                         | Log warning, keep aggregated findings as-is, proceed to Triage                         |
| critic-audit fails                                 | Log warning, keep aggregated findings as-is, proceed to Triage                         |
| All Phase 1 tools skipped                          | Proceed directly to Phase 2                                                            |
| Fix causes test fail                               | `git stash` the fix, skip finding                                                      |
| simplify not available                             | Skip step 2a, proceed to enhancer-code                                                 |
| simplify fails                                     | Log warning, proceed to enhancer-code                                                  |
| Cleanup causes test fail                           | `git stash` the cleanup edits (2a + 2b), report the failing step                       |
