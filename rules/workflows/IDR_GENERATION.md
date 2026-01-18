# IDR (Implementation Decision Record) Generation

Tracks implementation decisions throughout development lifecycle.

## Command Actions

| Command     | IDR Action              |
| ----------- | ----------------------- |
| `/code`     | Creates with decisions  |
| `/audit`    | Appends review findings |
| `/polish`   | Appends simplifications |
| `/validate` | Reconciles with SOW AC  |

Location: `~/.claude/workspace/planning/[feature]/idr.md`

## IDR Detection

| Scenario   | Detection                                       | Path                                       |
| ---------- | ----------------------------------------------- | ------------------------------------------ |
| SOW exists | Search `~/.claude/workspace/planning/**/sow.md` | `[SOW directory]/idr.md`                   |
| No SOW     | Infer feature name from context                 | `~/.claude/workspace/idr/[feature]/idr.md` |

## IDR Generation (/code)

| Section            | Content                           |
| ------------------ | --------------------------------- |
| Changed Files      | `git diff --name-status HEAD`     |
| Key Decisions      | Rationale for implementation      |
| Notes              | Trade-offs, alternatives rejected |
| Reviewer Attention | Points for code review            |

Template: `~/.claude/templates/idr/template.md`

## IDR Update Sections

| Command   | Section Content                                |
| --------- | ---------------------------------------------- |
| /audit    | Summary (severity counts), Issues table, Notes |
| /polish   | Removals table, Simplifications description    |
| /validate | AC validation table, Gaps, Sign-off            |

## SOW Integration

| Direction | Link                                      |
| --------- | ----------------------------------------- |
| IDR → SOW | `SOW: ./sow.md` in metadata               |
| SOW → IDR | `IDR: ./idr.md` in Implementation Records |

## Error Handling

| Scenario          | Action                                      |
| ----------------- | ------------------------------------------- |
| No SOW found      | Create standalone IDR in workspace/idr/     |
| IDR not found     | Create new (for /code) or skip (for others) |
| SOW update fails  | Log warning, continue without SOW link      |
| Git not available | Skip changed files, use manual input        |

## Related

- Template: `~/.claude/templates/idr/template.md`
- SOW Template: `~/.claude/templates/sow/template.md`
