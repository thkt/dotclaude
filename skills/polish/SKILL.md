---
name: polish
description: Codex review + cleanup. Findings are challenged by critic-audit, not aggregated as facts, and fixes are applied directly. Do NOT use for internal multi-reviewer deep audits or findings reports (use /audit).
when_to_use: 整理して, きれいにして, コード整理, slop除去, ポリッシュ, テスト整理, テスト監査, Codex レビュー
allowed-tools: Bash(codex:*) Bash(git diff:*) Bash(git log:*) Bash(git stash:*) Bash(git status:*) Bash(cargo test:*) Bash(npm test:*) Bash(npm run test:*) Bash(bun test:*) Bash(pnpm test:*) Bash(yarn test:*) Bash(make test:*) Bash(which:*) Read Edit Skill Task AskUserQuestion
model: opus
argument-hint: "[target scope]"
---

# /polish - Codex Review + Cleanup

Codex reviews the diff, then `critic-audit` puts the findings through an adversarial challenge. Fix the survivors, then clean up with `/simplify` and `enhancer-code`. Do not stop at a findings report; apply the fixes directly. For an internal-reviewer audit, use `/audit`.

## Input

`$ARGUMENTS` may contain the target scope. If empty, analyze `git diff HEAD` (staged and unstaged changes).

## Phase 1: Codex review

Run an external Codex review to produce findings. If `which codex` fails, skip to Phase 3.

Run `codex review "Review for logic, architecture, data flow, and code simplicity (flag over-complexity and unnecessary indirection)"`. In codex 0.141.0 the scope flags (`--uncommitted` / `--base` / `--commit`) are mutually exclusive with the PROMPT argument, so pass no scope flag when sending the simplicity-lens PROMPT. Codex reads `git status` itself and reviews the staged, unstaged, and untracked changes. Omitting the PROMPT falls back to Codex's default review and drops the simplicity lens, so always pass it.

## Phase 2: Adversarial challenge + fix

`critic-audit` filters Codex false positives, then the surviving findings are fixed directly.

1. Map each finding to the `critic-audit` input schema (`critic-audit` § Input) and spawn `Task(subagent_type: "critic-audit")` once with the full list. Wait for the per-finding verdict
2. Triage each finding by its verdict, per the table below
3. From the survivors, keep Codex P1/P2. Drop Phase 3 territory (cleanup scope) and any fix touching files outside `git diff` scope
4. Fix the survivors high severity first, then detect the test command and validate. `git stash` any fix that breaks tests

| Verdict       | Action                                      |
| ------------- | ------------------------------------------- |
| confirmed     | Keep as a fix candidate                     |
| disputed      | Drop                                        |
| downgraded    | Apply the lowered severity                  |
| needs_context | Surface to the user with a one-line summary |

## Phase 3: Code cleanup

Two cleanup mutators run in sequence on the post-Phase-2 diff, then validate. Both apply fixes directly without a `critic-audit` challenge, since neither hunts bugs.

1. Run `Skill("simplify")` on the current diff for a cleanup-only pass (reuse, simplification, efficiency, altitude). If it rejects a no-arg invocation, pass the diff scope Phase 1 detected
2. Spawn `enhancer-code` via `Task(subagent_type: "enhancer-code")` to remove AI slop and apply simplification rules, then audit tests. Run it after `/simplify` so its preservation rule (when in doubt, keep) takes priority over `/simplify`'s edits
3. Detect the test command and validate. `git stash` the cleanup edits on failure

## Output

Report what each phase did. Codex findings (Phase 1), critic-audit verdict counts and fixes applied with skip reasons (Phase 2), and `/simplify` plus `enhancer-code` edits with `file:line` and the test validation result (Phase 3).

## Error Handling

| Error                                 | Action                                         |
| ------------------------------------- | ---------------------------------------------- |
| No changes in diff                    | Report that there is nothing to polish         |
| `codex review` fails                  | Skip to Phase 3 with no findings               |
| `critic-audit` fails or returns empty | Keep all findings as confirmed, proceed to fix |
| `/simplify` unavailable or fails      | Skip to enhancer-code                          |
