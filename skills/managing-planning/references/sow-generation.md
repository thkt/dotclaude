# SOW Generation

## Input Resolution

```text
/sow → Argument? → Use as task | Research? → Use research | → Ask user
```

## Required Sections

| Section             | Purpose                      |
| ------------------- | ---------------------------- |
| Executive Summary   | High-level overview          |
| Problem Analysis    | Current state, issues        |
| Assumptions         | Facts, assumptions, unknowns |
| Solution Design     | Approach, alternatives       |
| Test Plan           | Unit/Integration/E2E         |
| Acceptance Criteria | By phase                     |
| Implementation Plan | Phases, milestones           |
| Success Metrics     | Measurable outcomes          |
| Risks & Mitigations | Identified risks             |

## Confidence Markers

| Marker | Meaning   | Evidence                  |
| ------ | --------- | ------------------------- |
| [✓]    | Verified  | file:line, command output |
| [→]    | Inferred  | Reasoning stated          |
| [?]    | Uncertain | Needs investigation       |

## Output

```text
Save to: .claude/workspace/planning/YYYY-MM-DD-[feature]/sow.md
```

## Template

Structure: `~/.claude/templates/sow/template.md`

- Copy: Section structure, ID naming (I-001, AC-001, R-001)
- Do NOT copy: Actual content
