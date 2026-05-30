---
name: polish
description: Light adversarial probe + cleanup. Codex + CodeRabbit + Gemini findings are challenged by critic-audit, not aggregated as facts. Do NOT use for deep multi-reviewer audits (use /audit).
when_to_use: 整理して, きれいにして, コード整理, slop除去, ポリッシュ, テスト整理, テスト監査, クロスチェック, crosscheck, Codex レビュー, CodeRabbit, Gemini レビュー
allowed-tools: Bash(codex:*) Bash(coderabbit:*) Bash(gemini:*) Bash(git diff:*) Bash(git log:*) Bash(git stash:*) Bash(git status:*) Bash(cargo test:*) Bash(npm test:*) Bash(npm run test:*) Bash(bun test:*) Bash(pnpm test:*) Bash(yarn test:*) Bash(make test:*) Bash(which:*) Read Edit LS Skill Task AskUserQuestion Bash(ugrep:*) Bash(bfs:*)
model: opus
argument-hint: "[target scope]"
---

# /polish - Light Review + Cleanup

Parallel review (simplify + Codex + CodeRabbit + Gemini) → critic-audit adversarial challenge → cleanup (enhancer-code). All fixes applied directly in foreground.

Phase 1 reviewers run in parallel without seeing each other's findings. Aggregating their outputs is a sum, not a discussion. Phase 1.5 spawns `critic-audit` once over the aggregated set so a single skeptical reader judges each finding against the actual code, downgrades or disputes the ones that miss context, and lets only validated items reach Phase 2.

## Input

- Target scope: `$ARGUMENTS` (optional)
- If `$ARGUMENTS` is empty → analyze `git diff HEAD` (staged + unstaged changes)

## Execution

### Phase 1: Parallel review + adversarial challenge

Run simplify, Codex, CodeRabbit, and Gemini in parallel. Each tool skips independently if unavailable. If all skip, proceed to Phase 2. Gemini provides cross-family review to counter Self-Enhancement bias when Claude generated the code.

| Tool       | Focus                                         | Skip condition                                             |
| ---------- | --------------------------------------------- | ---------------------------------------------------------- |
| simplify   | Reuse, quality, efficiency                    | (always available)                                         |
| Codex      | Logic, architecture, data flow                | `which codex` fails                                        |
| CodeRabbit | Security, mechanical bugs (P1)                | `which coderabbit` fails OR `coderabbit auth status` fails |
| Gemini     | Logic, maintainability (cross-family skeptic) | `which gemini` fails                                       |

Mode selection by change state. If both uncommitted and committed changes exist, use uncommitted mode.

| Condition                       | Mode        | Codex                        | CodeRabbit                                     | Gemini diff source     |
| ------------------------------- | ----------- | ---------------------------- | ---------------------------------------------- | ---------------------- |
| Uncommitted changes             | uncommitted | `codex review --uncommitted` | `coderabbit review --agent --type uncommitted` | `git diff HEAD`        |
| Commits vs base, no uncommitted | base        | `codex review --base main`   | `coderabbit review --agent --type committed`   | `git diff main...HEAD` |

Gemini command. Capture the diff via the source above into `$DIFF`, then pass it inline so Gemini does not need shell access.

```sh
gemini --skip-trust --approval-mode plan -m gemini-2.5-flash -p "$(cat <<EOF
Review this diff. The code may be Claude-generated, so be skeptical to counter Self-Enhancement bias.
Focus: Logic correctness, Architecture, Maintainability.
Skip: Security (covered by CodeRabbit), Code reuse and AI slop (covered by simplify and enhancer).
Output per finding: [Critical|Major|Minor] file:line - description. Drop Minor.
<diff>
${DIFF}
</diff>
EOF
)"
```

Notes. `--skip-trust` bypasses the trusted-folder check for headless mode. `--approval-mode plan` enforces read-only so Gemini cannot edit files. `gemini-2.5-flash` is current. OAuth-personal Pro quota is 100 RPD (Dec 2025 nerf) and routinely exhausted by interactive use, so Pro is unreliable for polish. Flash has 250 RPD on the same auth. Revisit when Gemini 3 Flash ships or when paid API quota becomes available.

Steps for orchestrating Phase 1.

| Step | Action                                                                                                                                                                                      |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | Detect mode: `git status --porcelain` → uncommitted or base                                                                                                                                 |
| 2    | Spawn simplify via `Skill("simplify", args: "$ARGUMENTS")` and run Codex/CodeRabbit/Gemini CLIs concurrently in the same response                                                           |
| 3    | Wait for all four tasks to return findings                                                                                                                                                  |
| 4    | Dedupe findings across tools by file:line                                                                                                                                                   |
| 5    | Adversarial challenge. Map each aggregated finding to the critic-audit input schema (see `~/.claude/agents/critics/critic-audit.md`, Input section). Spawn `Task(subagent_type: "critic-audit")` once with the full list. Wait for per-finding verdict: confirmed / disputed / downgraded / needs_context |
| 6    | Triage. Apply critic-audit verdicts first: drop `disputed`, apply `downgraded` severity, surface `needs_context` to user with a one-line summary. On the survivors, keep simplify all, Codex P1/P2, CodeRabbit critical only, Gemini Critical+Major. Drop Phase 2 territory. Drop fixes whose edits touch files outside `git diff` scope |
| 7    | Fix surviving findings (high first, then medium)                                                                                                                                            |
| 8    | Detect test command and validate. `git stash` fix on test failure                                                                                                                           |

CodeRabbit drops (Phase 2 territory, not applied here): naming, formatting, readability, AI slop. Users should set `profile: chill` in `.coderabbit.yaml` to reduce free-tier rate-limit pressure.

### Phase 2: Code cleanup

Spawn `enhancer-code` agent on the post-Phase-1 diff via `Task(subagent_type: "enhancer-code")`. The agent removes AI slop, applies simplification rules, and audits tests while respecting preservation rules defined in the agent.

Phase 2 sees the cleaned-up structure from Phase 1, so AI slop detection reflects the final code state, not pre-fix bias.

## Output

```text
Phase 1 (review):
  simplify: <summary>
  codex: <fixed N / skipped N with reasons / not available>
  coderabbit: <fixed N / skipped N with reasons / not available>
  gemini: <fixed N / skipped N with reasons / not available>
Phase 1.5 (critic-audit challenge):
  total: N / confirmed: N / disputed: N / downgraded: N / needs_context: N
Phase 2 (cleanup):
  Code: <changes with file:line>
  Tests: <changes with file:line>
  Skipped: <files not audited, with reason>
```

## Error Handling

| Error                        | Action                                 |
| ---------------------------- | -------------------------------------- |
| No changes in diff           | Report "Nothing to polish"             |
| simplify fails               | Log warning, continue with other tools |
| codex not installed          | Skip Codex only, keep others           |
| codex review fails           | Log warning, proceed                   |
| coderabbit not installed     | Skip CodeRabbit only, keep others      |
| coderabbit auth status fails | Skip CodeRabbit only, keep others      |
| coderabbit review fails      | Log warning, proceed                   |
| gemini not installed         | Skip Gemini only, keep others          |
| gemini capacity exhausted    | Skip Gemini only, log model name       |
| gemini call fails            | Log warning, proceed                   |
| critic-audit returns empty   | Log warning, keep aggregated findings as-is, proceed to Triage |
| critic-audit fails           | Log warning, keep aggregated findings as-is, proceed to Triage |
| All Phase 1 tools skipped    | Proceed directly to Phase 2            |
| Fix causes test fail         | `git stash` the fix, skip finding      |
