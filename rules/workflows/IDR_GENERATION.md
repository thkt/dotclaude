# IDR (Implementation Decision Record) Generation

Tracks implementation decisions throughout development lifecycle.

## Recording Layers

| Layer       | Trigger     | Records                          | Automatic |
| ----------- | ----------- | -------------------------------- | --------- |
| session-end | Session end | Implementation, design decisions | Yes       |
| pre-commit  | git commit  | Confirmation gate only           | Yes       |

## Automatic Recording (session-end hook)

Records automatically at session end:

| Section          | Content                              |
| ---------------- | ------------------------------------ |
| Implementation   | Claude summarizes changes            |
| Design Decisions | Key decisions and rationale (if any) |

## Confirmation Gate (pre-commit hook)

Pre-commit confirmation gate (no IDR recording):

| File              | Purpose                       |
| ----------------- | ----------------------------- |
| `.idr-confirm.md` | Confirmation questions (temp) |

## IDR File Location

| Scenario           | Detection                                   | Path                         |
| ------------------ | ------------------------------------------- | ---------------------------- |
| Tracked SOW exists | Read `$HOME/.claude/workspace/.current-sow` | `[SOW directory]/idr.md`     |
| No tracked SOW     | Date-based directory                        | `planning/YYYY-MM-DD/idr.md` |

### SOW Tracking

The `.current-sow` file tracks the active SOW for the current work:

```bash
# Set current SOW (done by /think, /code commands)
echo "/path/to/sow.md" > "$HOME/.claude/workspace/.current-sow"

# Clear when work is complete
mv "$HOME/.claude/workspace/.current-sow" ~/.Trash/
```

## Integration

```mermaid
flowchart LR
    subgraph Auto["Automatic Recording"]
        J[Session JSONL] --> E[context-extractor.sh]
        E --> S[session-end.sh]
        S --> IDR[idr.md]
    end

    subgraph Gate["Confirmation Gate"]
        C[git commit] --> H[pre-commit hook]
        H --> CF[.idr-confirm.md]
    end
```

## Related

- Utility: `$HOME/.claude/hooks/lifecycle/_utils.sh`
- Utility: `$HOME/.claude/hooks/lifecycle/_context-extractor.sh`
- Hook: `$HOME/.claude/hooks/lifecycle/idr-pre-commit.sh`
- Hook: `$HOME/.claude/hooks/lifecycle/session-end.sh`
- SOW Template: `$HOME/.claude/templates/sow/template.md`
