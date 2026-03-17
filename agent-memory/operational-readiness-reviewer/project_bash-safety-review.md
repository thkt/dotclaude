---
name: bash-safety.sh operational review
description: Findings from OR review of the bash-safety PreToolUse hook — key gaps in logging, jq fork overhead, and self-test coverage
type: project
---

Reviewed `/Users/thkt/.claude/hooks/security/bash-safety.sh` for operational readiness. 7 findings.

Key gaps:

- Three separate jq subprocess forks (lines 23, 28–29) are the dominant latency risk under the 2s timeout
- Block events log the matched substring but not which rule index triggered — harms incident replay
- Silent empty-command exits (line 26) produce no audit trace
- Full-disk log failure is silently swallowed with no secondary sink
- Self-tests do not cover the normalization path (quoted rm bypass scenario)

**Why:** This hook is security-critical and runs on every Bash tool invocation in every Claude Code session.

**How to apply:** When suggesting changes to bash-safety.sh, prioritize the jq consolidation (OR-007) for timeout risk and rule-ID logging (OR-002) for incident response. Do not suggest changes that increase subprocess count or add synchronous network calls.
