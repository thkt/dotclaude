# Phase Handoff

YAML written after each phase. Next phase reads this instead of full context.

## File Path

`.claude/workspace/planning/YYYY-MM-DD-[feature]/handoff.yaml`

Same directory as sow.md and spec.md.

## Schema

```yaml
schema_version: 1 # required

# Written by Phase 1
discovery:
  feature: "short description"       # required
  scope_tier: small | medium | large # required — enum, thresholds in exploration-team.md
  target_files: [path, ...]          # required — non-empty
  context_pattern: "react-nextjs"    # required — from Context Patterns
  constraints: ["...", ...]          # optional — empty array if none

# Written by Phase 2-4
architecture:
  design: "one-paragraph summary"                      # required
  components:                                          # required — non-empty array
    - name: "ComponentName"                            # required
      layer: shared | logic | ui                       # required — enum, defined in implementation-team.md
      files_create: [path, ...]                        # required — may be empty
      files_modify: [path, ...]                        # required — may be empty
  contracts: ["interface/type signatures", ...]        # required — non-empty
  sow_path: ".claude/workspace/planning/.../sow.md"    # required
  spec_path: ".claude/workspace/planning/.../spec.md"  # optional

# Written by Phase 5
implementation:
  mode: parallel | sequential # required — enum
  files_changed: [path, ...]  # required — non-empty
  tests_added: [path, ...]    # required — non-empty (TDD)

# Written by Phase 6
quality:
  iterations: 1                            # required — range: 1-3
  auto_fixed: ["finding-id: summary", ...] # required — may be empty
  remaining: ["finding-id: summary", ...]  # required — may be empty
  tests_passing: true                      # required — boolean
```

## Validation

Each reader validates before proceeding:

| Reader    | Checks                                                                                                                                                                                                    | On failure         |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ |
| Phase 2-4 | `discovery.target_files` non-empty, `scope_tier` in enum                                                                                                                                                  | Notify user        |
| Phase 5   | `architecture.components` non-empty, each `layer` in `shared\|logic\|ui`, each component has `name` non-empty, each has at least one of `files_create` or `files_modify` non-empty, `contracts` non-empty | Notify user        |
| Phase 6   | `implementation.files_changed` and `tests_added` non-empty                                                                                                                                                | Notify user        |
| Phase 7   | `quality.tests_passing` is true                                                                                                                                                                           | Re-enter Phase 6   |
| Resume    | YAML parses, `schema_version` recognized, expected sections exist                                                                                                                                         | Warn user, Phase 1 |

Read-merge-write. After write, verify: (1) prior sections intact, (2) section count +1.

## Rules

| Rule              | Detail                                               |
| ----------------- | ---------------------------------------------------- |
| Leader-only       | Only Leader writes. Sub-agents report via DM         |
| Append-only       | Each phase appends its section, never modifies prior |
| Write-on-complete | Write after phase completes (not incrementally)      |
| Compact-safe      | Leader may `/compact` after writing handoff          |
| Sub-agent input   | Include handoff in sub-agent Task prompt (read-only) |
| Resume source     | handoff.yaml supersedes SOW metadata for resume      |
