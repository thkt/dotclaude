# Phase Handoff

Structured YAML written after each phase. Next phase reads this instead of inheriting full conversation context.

## File Path

`.claude/workspace/planning/YYYY-MM-DD-[feature]/handoff.yaml`

Same directory as sow.md and spec.md.

## Schema

```yaml
# Written by Phase 1
discovery:
  feature: "short description"
  scope_tier: small | medium | large
  target_files: [path, ...]
  context_pattern: "react-nextjs"  # from Context Patterns
  constraints: ["...", ...]

# Written by Phase 2-4
architecture:
  design: "one-paragraph summary"
  components:
    - name: "ComponentName"
      layer: shared | logic | ui
      files_create: [path, ...]
      files_modify: [path, ...]
  contracts: ["interface/type signatures", ...]
  sow_path: ".claude/workspace/planning/.../sow.md"
  spec_path: ".claude/workspace/planning/.../spec.md"

# Written by Phase 5
implementation:
  mode: parallel | sequential
  files_changed: [path, ...]
  tests_added: [path, ...]

# Written by Phase 6
quality:
  iterations: 2
  auto_fixed: ["finding-id: summary", ...]
  remaining: ["finding-id: summary", ...]
  tests_passing: true
```

## Rules

| Rule             | Detail                                              |
| ---------------- | --------------------------------------------------- |
| Append-only      | Each phase appends its section, never modifies prior |
| Compact-safe     | Leader may `/compact` after writing handoff          |
| Sub-agent input  | Include handoff YAML in sub-agent Task prompt        |
| Resume source    | handoff.yaml supersedes SOW metadata for resume      |
