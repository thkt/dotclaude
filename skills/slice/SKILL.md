---
name: slice
description: Break a plan / spec / PRD into independently-grabbable tracer-bullet vertical-slice issues and publish them to GitHub in dependency order. Each issue is one thin slice cutting through every layer.
when_to_use: break plan into issues, plan to issues, spec to issues, vertical slice, tracer bullet, split into issues, slice
allowed-tools: Bash(gh:*) Bash(cat:*) Bash(mv:*) Bash(ugrep:*) Bash(bfs:*) Read LS Task AskUserQuestion
model: opus
argument-hint: "[plan / spec / PRD / issue ref]"
---

# /slice - Break a plan into vertical-slice issues

Break a plan into independently-grabbable issues. Each issue is a tracer bullet, a thin slice cutting end-to-end through every layer (schema / API / UI / test), demoable or verifiable on its own.

## Input

Take the plan source from `$ARGUMENTS`. For an issue reference (number / URL / path), fetch the body and comments via `gh issue view <N>`. If empty, work from a plan already in conversation context; if none, ask what to break down via AskUserQuestion.

## Distinction from related skills

| Skill                      | Output                                    | Medium / timing                      |
| -------------------------- | ----------------------------------------- | ------------------------------------ |
| /slice (this)              | Durable GitHub issues in dependency order | A queue for a human to pick up later |
| /issue                     | One issue (premise + critic verification) | File a single request                |
| architect-feature + /swarm | Ephemeral in-session parallel blueprint   | Design for implementing now          |

/slice's value is decomposition and dependency-ordered publish. For one issue use /issue. To implement now use /swarm.

## Phase 1: Gather context

Work from the plan in conversation context. If `$ARGUMENTS` carries an issue reference, read its body and comments.

## Phase 2: Explore the codebase (optional)

If not yet explored, understand the current state. Issue titles / descriptions follow the project glossary and respect ADRs in the area you touch. Look for prefactor opportunities that make the change easier ("make the change easy, then make the easy change"). Spawn one Explore agent only when a cross-cutting sweep is needed; no per-slice spawns.

## Phase 3: Draft vertical slices

Split the plan into tracer-bullet issues. Vertical slices (through all layers), not horizontal (one layer only).

| Rule            | Content                                                        |
| --------------- | -------------------------------------------------------------- |
| All layers      | Each slice cuts through every layer (schema / API / UI / test) |
| Self-verifiable | A completed slice is demoable or verifiable on its own         |
| Prefactor first | If prefactoring is needed, put it in the first slice           |

## Phase 4: Quiz the user

Present the proposed breakdown as a numbered list. For each slice show the following.

| Field        | Content                                         |
| ------------ | ----------------------------------------------- |
| Title        | Short descriptive name                          |
| Blocked by   | Which other slices must complete first (if any) |
| User stories | Which user stories this slice covers (if any)   |

Ask: does the granularity feel right (too coarse / too fine), are the dependencies correct, should any slices be merged or split. Iterate until the user approves.

## Phase 5: Publish the issues

After approval, confirm once more via AskUserQuestion before batch publish ("Create these N issues?"). Creating N issues is outward-facing and hard to unwind, so never auto-publish without confirmation.

On approval, publish in dependency order (blockers first). Create blockers first and capture their numbers so "Blocked by" can reference real issue numbers. Use the template below and Sandbox-Compatible Create per issue. Do not attach a triage label (AFK consumer wiring is out of scope). Do not close or modify any parent issue.

## Issue Template

```markdown
## Parent

A reference to the parent issue (only if the source was an existing issue; otherwise omit this section).

## What to build

A concise description of this vertical slice. Describe the end-to-end behavior, not layer-by-layer implementation. Avoid specific file paths or code snippets, which go stale fast. Exception: a snippet a prototype produced that encodes a decision more precisely than prose (state machine / reducer / schema / type). Note it came from a prototype and trim to the decision-rich parts.

## Acceptance criteria

- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

## Blocked by

- A reference to the blocking ticket (if any)

Or "None - can start immediately" if no blockers.
```

## Language

Read `language` from ${CLAUDE_SKILL_DIR}/../../settings.json and translate the issue body into that language. Default to English if unset. Keep technical terms / code / identifiers untranslated.

## Sandbox-Compatible Create

```bash
cat > /tmp/claude/slice-body.md << 'EOF'
<body>
EOF
gh issue create --title "<title>" --body-file /tmp/claude/slice-body.md
mv /tmp/claude/slice-body.md ~/.Trash/ 2>/dev/null || true
```

Repeat this in dependency order for multiple slices, capturing each issue number from the publish output to fill into later "Blocked by" fields.

## Error Handling

| Error                  | Action                                           |
| ---------------------- | ------------------------------------------------ |
| No plan source         | Ask what to break down via AskUserQuestion       |
| Issue ref unresolvable | Report the ref and stop                          |
| No git repository      | Report "Not a git repo"                          |
| gh auth failure        | Report the auth error                            |
| Publish fails midway   | Report created numbers and ask whether to resume |

## Display Format

### Preview (Phase 4)

```markdown
## Slice breakdown (N)

1. <Title>
   - Blocked by: <slices or none>
   - User stories: <ids or none>
```

### Success

List published issues in dependency order.

```markdown
Created (dependency order):

- #<number> <title> (blocked by: #<n> | none)
```
