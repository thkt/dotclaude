---
name: reflect
description: Surface the current session's tentative reflection (realization / judgment / counterfactual) and optionally promote it to the durable knowledge store. Escape hatch for when Stop hook reflection extraction failed.
allowed-tools: Read Write Bash
---

# /reflect — manual reflection promotion

Escape hatch for ADR-0068. Stop hook subagent extraction (`reflection-extract.sh`) normally writes per-session reflections automatically. When that pipeline fails (subagent timeout, API error, build issue), `/reflect` lets you produce the same artifact manually before the session ends.

This is NOT the primary path. The Stop hook is. Use this skill when:

- The latest `knowledge/reflection/<session_id>.md` is a `placeholder: true` file (auto-extraction returned empty) and you have meaningful reflection to capture.
- You want to override or edit the auto-extracted content before the next session reads it.
- You suspect the Stop hook is broken on this machine and want to verify the knowledge store stays current.

## Procedure

### Step 0: Resolve paths

Run once at the top of the skill.

```bash
KDIR="${REFLECT_KNOWLEDGE_DIR:-${CLAUDE_PROJECT_DIR}/.claude/knowledge}"
SID="${CLAUDE_SESSION_ID:?session id required}"
MD="$KDIR/reflection/$SID.md"
INDEX="$KDIR/reflection-index.jsonl"
```

If `$KDIR` does not exist, advise the user to run a session under the Stop hook at least once (the directory is created on first auto-extraction) or set `REFLECT_KNOWLEDGE_DIR` explicitly.

### Step 1: Read the current state

Print to the user, in this order:

1. Does `$MD` exist? If yes, show it (frontmatter + body).
2. Is it a placeholder (`placeholder: true`)? Flag it.
3. Latest 3 entries from `$INDEX` (so the user sees the local history).

### Step 2: Compose

Generate a fresh reflection across the 3 categories. Use the same shape as `agents/reflection-extractor.md` and reuse its guidance (realization / judgment / counterfactual). Keep the body under 300 words total. Output frontmatter:

```
---
session_id: <SID>
confidence: confirmed   # always "confirmed" for /reflect — user-attested
categories: [...]
word_count: <int>
created_at: <ISO8601 UTC>
promoted_via: reflect-skill
---
```

The `promoted_via: reflect-skill` field marks manual promotions so audits can distinguish them from auto-extracted reflections.

### Step 3: Confirm

Show the user the composed reflection in a fenced block. Ask: "Promote this to `$MD`? (yes / edit / cancel)"

- `yes` → Step 4
- `edit` → ask what to change, regenerate, return to Step 3
- `cancel` → exit without writing

### Step 4: Write and index

```bash
# Atomic write: stage to a temp file, then move.
TMP="$(mktemp "$KDIR/reflection/.$SID.XXXXXX")"
cat > "$TMP" <<EOF
<composed reflection>
EOF
mv "$TMP" "$MD"

# Index: append if this session has no prior entry, otherwise skip
# (append-only contract; duplicates are tolerated but noisy).
if ! grep -Fq "\"session_id\":\"$SID\"" "$INDEX" 2>/dev/null; then
  printf '{"session_id":"%s","reflection_file":"%s","created_at":"%s","promoted_via":"reflect-skill"}\n' \
    "$SID" "$MD" "$(date -u +'%Y-%m-%dT%H:%M:%SZ')" >> "$INDEX"
fi

echo "Promoted to $MD"
```

## Constraints

- Never modify `CLAUDE.md`, `MEMORY.md`, `rules/`, `agents/`, `skills/`, or any file referenced by `paths:` frontmatter. Same auto-loaded-path immutability rule as the Stop hook (ADR-0068 BR-006). Violations invalidate the prompt cache for every following session.
- Never read transcripts outside the current session.
- Never call `claude --bare` recursively. This skill runs in the main session, not in a subagent.

## When NOT to use this

- The Stop hook is working and the latest reflection is `confidence: confirmed` (not placeholder). Re-running `/reflect` would overwrite a higher-quality extraction.
- You want to edit a reflection from an old session. That requires manual edit of `$KDIR/reflection/<old-sid>.md`, not this skill.
- You want to delete entries. The index is append-only by contract; deletion is a separate operation outside this skill.

## Related

- ADR-0068: Stop hook Knowledge Reflection design (this skill is the escape hatch named there).
- `agents/reflection-extractor.md`: shares the 3-category output shape.
- `hooks/lifecycle/reflection-extract.sh`: the primary auto-extraction path this skill complements.
