# Feature Prompts

## Phase 1: Feature Type

Options are generated from detected Context Pattern.

```yaml
# Claude Code config detected
question: "What would you like to add?"
header: "Feature Type"
options:
  - label: "Add command"
  - label: "Add skill"
  - label: "Add hook"
  - label: "Add agent"

# Fallback (no pattern matched)
question: "What type of feature?"
header: "Feature Type"
options:
  - label: "New Feature"
  - label: "Feature Extension"
  - label: "Refactoring"
```

## Phase 2-4: Design & Architecture

```yaml
# Design Review
question: "How does the composed architecture look?"
header: "Design"
options:
  - label: "Approve"
  - label: "Simplify Further"
  - label: "Review Details"
  - label: "Have Concerns"

# ADR Creation
question: "Record as ADR?"
header: "ADR"
options:
  - label: "Create ADR"
  - label: "Skip"

# Delegation Confirm (when user defers decision)
question: "Recommended: [X]. Proceed?"
header: "Confirm"
options:
  - label: "Yes, proceed"
  - label: "No, explain options"
```

## Phase 5: Implementation

```yaml
# Impl Mode (shown only when Parallel Decision = Parallel)
question: "Implementation mode?"
header: "Impl Mode"
options:
  - label: "Parallel (Recommended)"
  - label: "Sequential"
  - label: "Revise Design"
  - label: "Have Questions"
```

## Phase 6: Quality Loop

```yaml
# Issue Triage (shown after quality loop max iterations reached)
question: "Quality loop finished with remaining issues. How to proceed?"
header: "Triage"
options:
  - label: "Fix All Remaining"
  - label: "Proceed As-Is"
  - label: "Review Individually"
```
