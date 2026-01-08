# Frontmatter Specification

## Documentation Priority

| Priority | Source        | Description                                      |
| -------- | ------------- | ------------------------------------------------ |
| 1        | Release Notes | Actual released features (`.cache/changelog.md`) |
| 2        | Official Docs | Guides and explanations (may lag behind)         |
| 3        | Community     | Reference only                                   |

**Note**: For new features (e.g., 2.1.0), release notes are the authoritative source.

## Skill Fields

| Field            | Required | Type   | Description                   |
| ---------------- | -------- | ------ | ----------------------------- |
| `name`           | ✓        | string | kebab-case identifier         |
| `description`    | ✓        | string | Description + Triggers        |
| `allowed-tools`  | ✓        | list   | Permitted tools               |
| `context`        | -        | string | `fork` for isolated execution |
| `agent`          | -        | string | Execute with specific agent   |
| `model`          | -        | string | haiku/sonnet/opus             |
| `hooks`          | -        | object | Lifecycle hooks               |
| `user-invocable` | -        | bool   | Show in menu (default: true)  |

### Key Field Details

**`description` with Triggers**: Include keywords that auto-activate the skill.

```yaml
description: >
  What this skill does.
  Triggers: keyword1, keyword2, キーワード1
```

**`context: fork`**: Runs in isolated sub-agent context. Use for:

- Long-running analysis
- Large codebase exploration
- Memory-intensive operations

## Agent Fields

| Field             | Required | Type   | Description                   |
| ----------------- | -------- | ------ | ----------------------------- |
| `name`            | ✓        | string | kebab-case identifier         |
| `description`     | ✓        | string | Description                   |
| `tools`           | ✓        | list   | Permitted tools               |
| `model`           | ✓        | string | haiku/sonnet/opus             |
| `skills`          | -        | list   | Auto-load skills              |
| `context`         | -        | string | `fork` for isolated execution |
| `hooks`           | -        | object | Lifecycle hooks               |
| `permissionMode`  | -        | string | default/auto-accept           |
| `disallowedTools` | -        | list   | Explicitly blocked tools      |

## Category Patterns

### Skills by Prefix

| Prefix          | context: fork | agent                  | hooks       |
| --------------- | ------------- | ---------------------- | ----------- |
| `reviewing-*`   | -             | ✓ matching reviewer    | -           |
| `documenting-*` | ✓             | -                      | -           |
| `generating-*`  | ✓             | -                      | PostToolUse |
| `automating-*`  | ✓             | -                      | PreToolUse  |
| `analyzing-*`   | ✓             | -                      | -           |
| `optimizing-*`  | -             | ✓ performance-reviewer | -           |
| `applying-*`    | -             | -                      | -           |
| `creating-*`    | -             | -                      | -           |
| `utilizing-*`   | -             | -                      | -           |
| `enhancing-*`   | -             | -                      | -           |
| `formatting-*`  | -             | -                      | -           |
| `integrating-*` | -             | -                      | -           |
| `setting-up-*`  | -             | -                      | -           |

### Agents by Directory

| Directory        | context: fork | hooks                    |
| ---------------- | ------------- | ------------------------ |
| `reviewers/`     | -             | Stop (completion notify) |
| `analyzers/`     | ✓             | PostToolUse (logging)    |
| `generators/`    | ✓             | PostToolUse              |
| `orchestrators/` | -             | PreToolUse (validation)  |
| `integrators/`   | -             | -                        |
| `enhancers/`     | -             | -                        |
| `git/`           | -             | -                        |

## Hooks Structure

### Hook Types

| Type          | Timing                    | Use Case                        |
| ------------- | ------------------------- | ------------------------------- |
| `PreToolUse`  | Before tool execution     | Validation, logging, middleware |
| `PostToolUse` | After tool execution      | Formatting, notifications       |
| `Stop`        | On skill/agent completion | Completion notification         |

### YAML Format

```yaml
hooks:
  PreToolUse:
    - matcher: "Tool|OtherTool"
      command: "command"
      once: true # optional
  PostToolUse:
    - matcher: "Tool"
      command: "command"
  Stop:
    - command: "command"
```

Matcher: `"Read"` | `"Read|Write"` | `".*"` (all)

## Templates

- Skill: `~/.claude/templates/frontmatter/skill-template.yaml`
- Agent: `~/.claude/templates/frontmatter/agent-template.yaml`
