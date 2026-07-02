---
name: use-workflow-plan-preview
description: Internal helper for /think Step 11. Renders SOW.md + Spec.md as an integrated Astro view and returns a dev server URL.
when_to_use: Called only from /think Step 11. Not user-invokable.
allowed-tools: Read Write Edit Bash
user-invocable: false
---

# use-workflow-plan-preview

Workflow helper invoked by `/think` Step 11. Renders SOW.md + Spec.md as an integrated, browser-friendly view via the Astro project at `~/.claude/workspace/views/`.

Not for direct user invocation. `/think` is the only caller.

## Args (passed by caller `/think`)

`$1` is the planning slug (e.g. `2026-05-08-issue-53-annotation-foundation`).

## Steps

1. Read `~/.claude/workspace/planning/$1/sow.md` and `spec.md`
2. Decide a short-slug from the trailing keywords of `$1` (e.g. `2026-05-08-issue-53-annotation-foundation` → `issue-53` or `annotation-foundation`)
3. Copy ${CLAUDE_SKILL_DIR}/templates/spec.mdx to `~/.claude/workspace/views/src/content/<short-slug>.mdx`
4. Fill the frontmatter from sow.md
   - `title`. H1 line
   - `subtitle`. First sentence of Why → Outcome (a)
   - `status`. Below `## Status` (draft / approved / done)
   - `updatedAt`. Today's date YYYY-MM-DD
   - `sessionId`. From `Session:` line
   - `issueUrl`. GitHub URL in Reference
5. Fill each tab placeholder (mapping below)
6. Start or verify the dev server with `cd ~/.claude/workspace/views && bun run dev`
   - Skip if port 4321 is already running
7. Share `http://localhost:4321/spec/<short-slug>` with the user

## Tab → source mapping

| Tab          | sow.md / spec.md section                                                    |
| ------------ | --------------------------------------------------------------------------- |
| overview     | sow.md Why / Approach / Background                                          |
| scope        | sow.md Scope (In/Out) / Three-Tier Boundaries                               |
| ac           | sow.md Acceptance Criteria                                                  |
| phases       | sow.md Implementation Plan (Phase 1/2/3)                                    |
| spec         | spec.md Functional Requirements / Validation / Non-Functional / Assumptions |
| domain       | spec.md Domain Model (Entities / Business Rules)                            |
| tests        | spec.md Test Scenarios                                                      |
| risks        | sow.md Risks + spec.md Reassessment Triggers                                |
| traceability | spec.md Traceability Matrix + Implementation Phase × FR                     |

## Components

| Component | Usage                                                                                   |
| --------- | --------------------------------------------------------------------------------------- |
| TabPanel  | `<TabPanel id="overview" initial>...</TabPanel>`                                        |
| Pill      | `<span class="pill-ac">AC-1</span>` (or `<Pill variant="ac">`)                          |
| Tier      | `<span class="tier-always">必須</span>` (or `<Tier variant="always" />`)                |
| Term      | `<span class="term" data-tip="...">用語</span>`                                         |
| Card      | `<div class="card"><div class="label">X</div><p>...</p></div>`                          |
| Card grid | `<div class="card-grid">...8 cards...</div>`                                            |
| SearchBox | `<SearchBox id="fr-filter" placeholder="..." />`                                        |
| ChipGroup | `<ChipGroup id="test-chips" chips={[{type, label}, ...]} initial="all" />`              |
| PhaseFlow | `<PhaseFlow phases={[{num, title, subtitle, bullets, outcome, tone}]} caption="..." />` |
| DataFlow  | `<DataFlow boxes={[...]} edges={[...]} />`                                              |

`tone` values differ per component. Undefined values cause a runtime error.

| Component | Allowed tone                                 |
| --------- | -------------------------------------------- |
| PhaseFlow | `accent` / `warn` / `pass`                   |
| DataFlow  | `info` / `warn` / `accent` / `pass` / `fail` |

## MDX escaping

| Pattern                                | Fix                                    |
| -------------------------------------- | -------------------------------------- |
| `{0..9}` (range in braces)             | `\{0..9\}`                             |
| `[*]` (bracket + asterisk)             | `[&#42;]`                              |
| `{key: value}` JSON-like               | `{"{key: value}"}`                     |
| `${var}` template literal              | wrap inside string: `{"...${var}..."}` |
| `<code>foo*</code>` (asterisk in code) | `<code>foo&#42;</code>`                |
| `<code>__name</code>` (dunder in code) | `<code>\_\_name</code>`                |

## Reference implementation

Use ${CLAUDE_SKILL_DIR}/templates/spec.mdx as the canonical example (all 9 tabs filled).

## Done

- `~/.claude/workspace/views/src/content/<short-slug>.mdx` exists
- `http://localhost:4321/spec/<short-slug>` renders without error
- Each tab reflects content from sow.md / spec.md
- No `{/* PLACEHOLDER */}` markers remain (grep returns zero hits)

## Constraints

- sow.md / spec.md are read-only (do not modify)
- Do not modify anything under the planning directory
- Write only under `~/.claude/workspace/views/`
