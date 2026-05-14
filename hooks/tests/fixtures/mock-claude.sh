#!/usr/bin/env bash
# Mock for `claude --bare -p ...` subagent invocation.
#
# Behavior is controlled by MOCK_CLAUDE_MODE env var:
#   success  - write a non-empty reflection .md file directly to
#              $REFLECT_KNOWLEDGE_DIR/reflection/$REFLECT_SESSION_ID.md and
#              exit 0
#   empty    - write nothing (extract.sh is expected to create a placeholder)
#              and exit 0
#   fail     - exit 1 without writing
#   timeout  - sleep beyond the subagent timeout, then exit 0 (to be killed
#              by parent watchdog). Sleep duration is controlled by
#              MOCK_CLAUDE_SLEEP_SEC (default 4).
#   recurse  - re-invoke $REFLECT_HOOK_EXTRACT_SH as a child subagent. Used
#              by T-010 to verify recursion guard.
#
# Mock must be installed into PATH as a file literally named `claude` so that
# extract.sh resolves it via `claude --bare ...`. See test-reflection-extract.sh
# `setup_mock_claude` for the install convention.
set -uo pipefail

MODE="${MOCK_CLAUDE_MODE:-success}"
SID="${REFLECT_SESSION_ID:-unknown-session}"
KDIR="${REFLECT_KNOWLEDGE_DIR:-/tmp/reflect-knowledge}"
REFL_DIR="$KDIR/reflection"

# Surface a marker on stderr so tests can confirm the mock was actually called.
printf 'mock-claude: mode=%s session_id=%s knowledge_dir=%s\n' \
  "$MODE" "$SID" "$KDIR" >&2

case "$MODE" in
  success)
    mkdir -p "$REFL_DIR" 2>/dev/null || true
    cat > "$REFL_DIR/$SID.md" <<EOF
---
session_id: $SID
confidence: confirmed
categories: [realization, judgment, counterfactual]
word_count: 18
---

## Realization

mock subagent reflection body for $SID.

## Judgment

mock judgment line.

## Counterfactual

mock counterfactual line.
EOF
    exit 0
    ;;
  empty)
    # Intentionally do not write any file. extract.sh must produce a
    # placeholder with frontmatter only.
    exit 0
    ;;
  fail)
    printf 'mock-claude: simulated subagent failure\n' >&2
    exit 1
    ;;
  timeout)
    SEC="${MOCK_CLAUDE_SLEEP_SEC:-4}"
    sleep "$SEC"
    # If we reach here, the watchdog did not fire (unexpected for the test).
    exit 0
    ;;
  recurse)
    # Simulate the worst case: the subagent re-spawns the parent hook. The
    # recursion guard in reflection-extract.sh must short-circuit this child
    # so the call tree terminates.
    CHILD_SH="${REFLECT_HOOK_EXTRACT_SH:-}"
    if [[ -z "$CHILD_SH" ]]; then
      printf 'mock-claude: REFLECT_HOOK_EXTRACT_SH unset; cannot recurse\n' >&2
      exit 0
    fi
    # Forward stdin (the original hook input JSON) to the child so it looks
    # like a real Stop hook invocation. REFLECT_HOOK_SESSION=1 must already
    # be exported by the parent extract.sh; we keep it as-is.
    printf '{"session_id":"%s"}' "$SID" | "$CHILD_SH" >/dev/null 2>&1 || true
    exit 0
    ;;
  *)
    printf 'mock-claude: unknown MOCK_CLAUDE_MODE=%s\n' "$MODE" >&2
    exit 2
    ;;
esac
