# /fix Workflow

## Flow

```text
Root Cause (5 Whys) → Regression Test (Red) → Implementation (Green) → Verification
```

## Phase 1: Root Cause Analysis

### 5 Whys Questions

| #   | Question                      | Purpose                |
| --- | ----------------------------- | ---------------------- |
| 1   | Why did this happen?          | Immediate cause        |
| 2   | Why did that condition exist? | What allowed this      |
| 3   | Why wasn't this caught?       | Process gap            |
| 4   | Why is this pattern here?     | Isolated or systematic |
| 5   | Why do we do it this way?     | Design flaw?           |

### Output Format

```markdown
Symptom: [User-facing]
Root cause: [Why it failed]
Confidence: 0.XX
Pattern: [Isolated/Pattern/Systematic]
```

## Phase 1.5: Regression Test First

Write test reproducing bug BEFORE fixing. Test must **fail**.

## Phase 2: Implementation

| Confidence | Strategy   | Approach        |
| ---------- | ---------- | --------------- |
| ≥90%       | Direct fix | Straightforward |
| 70-89%     | Defensive  | Add guards      |
| <70%       | Escalate   | → /research     |

**Rule**: Fix bug only. Save refactoring for separate PR.

## Phase 3: Verification

```bash
npm test -- --findRelatedTests &
npm run lint -- --fix &
npm run type-check &
wait
```

## Escalation

| Confidence | Action                          |
| ---------- | ------------------------------- |
| <50%       | → /research immediately         |
| 50-69%     | Ask user: continue or escalate? |
| ≥70%       | Proceed normally                |
