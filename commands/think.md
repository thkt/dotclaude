---
description: Orchestrate SOW and Spec generation for comprehensive planning
allowed-tools: SlashCommand, Read, Write, Glob, Task
model: inherit
argument-hint: "[task description] (optional if research context exists)"
dependencies: [sow-spec-reviewer]
---

# /think - Planning Orchestrator

## Purpose

Orchestrate SOW and Spec generation as a single workflow.

## Golden Master Reference

Use for **structure and format guidance**:

- SOW structure: [@~/.claude/golden-masters/documents/sow/example-workflow-improvement.md](~/.claude/golden-masters/documents/sow/example-workflow-improvement.md)
- Spec structure: [@~/.claude/golden-masters/documents/spec/example-workflow-improvement.md](~/.claude/golden-masters/documents/spec/example-workflow-improvement.md)
- Summary structure: [@~/.claude/golden-masters/documents/summary/example-workflow-improvement.md](~/.claude/golden-masters/documents/summary/example-workflow-improvement.md)

**IMPORTANT**: Reference structures only, generate fresh content based on user's task.

## Input Resolution

Same as /sow - see /sow.md for details:

1. **Explicit argument**: Use directly
2. **Research context**: Auto-detect and use topic/findings
3. **Neither**: Ask user for task description

## Execution Flow

### Step 0: Requirements Clarification (Conditional)

Before generating SOW, clarify requirements through interactive Q&A.

**Skip conditions** (proceed directly to Step 1):

- Research context exists with clear requirements
- User provided detailed description with acceptance criteria
- Follow-up task with existing SOW/Spec

**When to ask** (requirements unclear):

- Vague or ambiguous task description
- Missing success criteria
- Unknown constraints or priorities

#### Questions Template (Business-focused)

Ask 5-7 questions from these categories:

```markdown
📌 Requirements Clarification

1. **Purpose**: What is the main goal of this feature?
   - What problem does it solve?
   - Who benefits from this?

2. **Users**: Who are the primary users?
   - End users / Internal team / API consumers?

3. **Priority**: How important is this? (MoSCoW)
   - Must have / Should have / Could have / Won't have

4. **Success Criteria**: How do we know it's done?
   - What does "working" look like?
   - Any specific metrics?

5. **Constraints**: Are there any limitations?
   - Deadline / Dependencies / Technical restrictions?

6. **Scope**: What's explicitly out of scope?
   - What should we NOT do?

7. **Edge Cases**: Any special scenarios to handle?
   - Error states / Empty states / Edge conditions?
```

#### Known Information Filter (NEW)

**IMPORTANT**: Before asking questions, extract known information from user input and skip already-answered questions.

```typescript
interface KnownInfo {
  purpose?: string      // Goal mentioned in task description
  users?: string        // User type mentioned or inferable
  priority?: string     // Urgency indicators ("urgent", "critical", etc.)
  criteria?: string[]   // Success criteria mentioned
  constraints?: string[] // Deadlines, dependencies mentioned
  scope?: string        // Exclusions mentioned
  edgeCases?: string[]  // Edge cases mentioned
}

function extractKnownInfo(taskDescription: string): KnownInfo {
  // Analyze task description for already-provided information
  // Examples:
  // "Add login button for end users" → users: "end users"
  // "Fix critical bug by Friday" → priority: "Must have", constraints: ["Friday deadline"]
  // "Add OAuth authentication (no SSO)" → scope: "SSO excluded"
}

function filterQuestions(allQuestions: Question[], known: KnownInfo): Question[] {
  return allQuestions.filter(q => {
    // Skip questions where answer is already known
    if (q.category === 'purpose' && known.purpose) return false
    if (q.category === 'users' && known.users) return false
    if (q.category === 'priority' && known.priority) return false
    // ... apply for all categories
    return true
  })
}
```

**Example Application**:

```markdown
User input: "Add OAuth authentication for API consumers by next sprint"

Extracted known info:
- ✓ Purpose: OAuth authentication (inferred: secure API access)
- ✓ Users: API consumers
- ✓ Constraints: next sprint deadline

Questions to ASK (remaining unknowns):
1. Priority: Must have / Should have / Could have?
2. Success Criteria: What defines "working" OAuth?
3. Scope: Any providers to exclude? (Google/GitHub/etc.)
4. Edge Cases: Token refresh, revocation scenarios?

Questions SKIPPED (already known):
- Purpose: ✓ Already stated
- Users: ✓ Already stated
- Constraints: ✓ Already stated
```

#### Q&A Flow

```typescript
// 1. Check if clarification is needed
const needsClarification = !hasResearchContext() && !hasDetailedDescription()

if (needsClarification) {
  // 2. Extract known information from task description (NEW)
  const knownInfo = extractKnownInfo(taskDescription)

  // 3. Filter out questions that are already answered (NEW)
  const allQuestions = getQuestionsTemplate()
  const remainingQuestions = filterQuestions(allQuestions, knownInfo)

  // 4. Display known info summary + remaining questions
  displayKnownInfoSummary(knownInfo)  // Show what we already know
  displayQuestions(remainingQuestions) // Ask only unknowns
  // Wait for user response

  // 5. Save Q&A for reference (includes extracted + answered)
  const qaPath = `.claude/workspace/qa/${timestamp}-${topic}.md`
  saveQA(qaPath, knownInfo, remainingQuestions, answers)

  // 6. Confirm understanding
  displayUnderstandingCheck()
  // Wait for user confirmation
}
```

#### Q&A Output Format

```markdown
# Q&A: [Topic]
Date: [YYYY-MM-DD]

## Questions & Answers

### 1. Purpose
**Q**: What is the main goal?
**A**: [User's answer]

### 2. Users
**Q**: Who are the primary users?
**A**: [User's answer]

[... more Q&A ...]

## Summary
- **Goal**: [Extracted from answers]
- **Priority**: [Must/Should/Could]
- **Success Criteria**: [Key criteria]
- **Constraints**: [Key constraints]
```

Save to: `.claude/workspace/qa/[timestamp]-[topic].md`

### Step 1: Generate SOW

```typescript
// If argument provided
SlashCommand({ command: '/sow "[task description]"' })

// If no argument (relies on /sow's input resolution)
SlashCommand({ command: '/sow' })
```

### Step 2: Generate Spec

```typescript
SlashCommand({ command: '/spec' })
// Auto-detects the SOW created in Step 1
```

### Step 3: Review (Optional)

```typescript
Task({
  subagent_type: "sow-spec-reviewer",
  model: "haiku",
  prompt: "Review the generated SOW and Spec for quality and consistency."
})
```

### Step 4: Generate Summary (Review Summary)

After SOW and Spec are generated, create a concise summary for efficient team review.

**Summary structure** (reference: [@~/.claude/golden-masters/documents/summary/example-workflow-improvement.md](~/.claude/golden-masters/documents/summary/example-workflow-improvement.md)):

```markdown
# Summary: [Feature Name] (Review Summary)

## 🎯 Purpose (1-2 sentences)
[Extract from SOW Executive Summary]

## 📋 Change Overview
[Concise table of phases/steps]

## 📁 Scope of Impact
- Files to modify: [2-5 key files]
- Affected components: [Impacted modules]

## ❓ Discussion Points
[Items marked with [?] in SOW/Spec + alternative choices]

## ⚠️ Risks
[High-risk items only]

## ✅ Key Acceptance Criteria
[4-5 main items from SOW Acceptance Criteria]

## 🔗 Detailed Documentation
- SOW: `sow.md`
- Spec: `spec.md`
```

**Output**: `.claude/workspace/planning/[same-dir]/summary.md`

## Output

All documents saved to:
`.claude/workspace/planning/[timestamp]-[feature]/`

```text
├── sow.md     # Statement of Work (detailed)
├── spec.md    # Specification (detailed)
└── summary.md # Review Summary (for quick review)
```

Display after completion:

```text
✅ Planning complete:
   SOW:     .claude/workspace/planning/[path]/sow.md
   Spec:    .claude/workspace/planning/[path]/spec.md
   Summary: .claude/workspace/planning/[path]/summary.md ← Start review here
```

## When to Use

| Situation | Command |
|-----------|---------|
| Full planning (after research) | `/research` → `/think` |
| Full planning (explicit) | `/think "task description"` |
| SOW only | `/sow` or `/sow "task"` |
| Spec only (SOW exists) | `/spec` |
| View existing plans | `/plans` |

## Example

```bash
# After /research (recommended workflow)
/research "user authentication options"
/think  # Auto-detects research context

# With explicit argument
/think "Add user authentication with OAuth"

# No context, no argument → asks for input
/think
# → "What would you like to plan? Please provide a task description."
```

## Related Commands

- `/sow` - SOW generation only
- `/spec` - Spec generation only
- `/plans` - View planning documents
- `/code` - Implement based on spec
