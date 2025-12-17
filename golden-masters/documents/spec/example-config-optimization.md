<!--
Golden Master: Spec - Config Optimization

Selection criteria:
- Clear FR structure for configuration optimization
- Pattern-based skip conditions
- Quantitative targets

Features:
- Reference example for config/performance spec
- Measurable acceptance criteria
- Migration considerations

Source: ~/.claude/workspace/planning/2025-12-04-claude-code-config-optimization/

Last Reviewed: 2025-12-17
Update Reason: Added maintenance metadata fields
Previous Version: N/A
-->

# Specification: Claude Code Configuration Optimization

Version: 1.0.0
Based on: SOW v1.0.0
Last Updated: 2025-12-04

---

## 1. Functional Requirements

### 1.1 PRE_TASK_CHECK Skip Functionality

[✓] FR-001: Early evaluation of skip conditions

- Input: User message
- Process: Evaluate skip condition section at the beginning
- Output: If skip applicable → Direct response / Not applicable → Confirmation flow

[✓] FR-002: Skip for confirmation responses

- Pattern: `^[yYnN]$`, `^(yes|ok|no|cancel)$`
- Action: Skip confirmation flow, respond directly

[✓] FR-003: Skip for short messages

- Condition: Message length < 15 characters
- Action: Skip confirmation flow

[✓] FR-004: Skip for read-only queries

- Pattern: "what is X?", "show me X"
- Action: Skip confirmation flow

[→] FR-005: Skip for follow-ups

- Pattern: starts with "also", "and", "thanks"
- Action: Skip confirmation flow

### 1.2 Maintain Confirmation for File Operations

[✓] FR-006: File operation detection

- Keywords: "create", "edit", "delete"
- Action: Always execute confirmation flow

[✓] FR-007: Command execution detection

- Keywords: "run", "execute", "npm", "git"
- Action: Always execute confirmation flow

### 1.3 Edge Cases

[→] EC-001: Short message but includes file operation

- Example: "delete it" (9 characters)
- Action: File operation keyword takes priority → Execute confirmation flow

[→] EC-002: Contains ambiguous pronouns

- Example: "fix it"
- Action: Ambiguity detection → Execute confirmation flow

---

## 2. File Specifications

### 2.1 PRE_TASK_CHECK_COMPACT.md (After modification)

**Path**: `~/.claude/rules/core/PRE_TASK_CHECK_COMPACT.md`

**Structure**:

```markdown
# PRE_TASK_CHECK (Compact)

## ⚡ FIRST: Skip Check

**IMMEDIATELY SKIP this check if message is**:
- Confirmation: "y", "yes", "ok", "n", "no", "cancel"
- Follow-up: starts with "also", "and", "thanks"
- Short: < 15 characters AND no file/command keywords
- Read-only query: "what is X?", "show me X"

**NEVER SKIP if message contains**:
- File operations: "create", "edit", "delete"
- Command execution: "run", "execute", "npm", "git"
- Ambiguous pronouns: "it", "that", "this"

If skip → respond directly. Otherwise → proceed with check.

## Core Rules

### 95% Understanding Rule
[Maintain existing content]

### When to Execute Check
[Maintain existing content]

### When to Skip
[Maintain existing content]

## Confidence Markers
[Maintain existing content]

## Quick Command Guide

| Task | Command |
|------|---------|
| Single file fix | /fix |
| Multi-file implementation | /code |
| Investigation only | /research |
| Planning | /think |
| Emergency fix | /hotfix |

## Ambiguity Detection

**Always confirm if the following exist**:
- Unknown pronouns: "it", "that"
- Ambiguous quantities: "some", "a few"
- Unspecified technology choices

## Output Format
[Maintain existing content]

## Flow
[Maintain existing content]

## Full Details
[@~/.claude/rules/core/PRE_TASK_CHECK.md](./PRE_TASK_CHECK.md)
```

### 2.2 MODEL_SELECTION_GUIDE.md (New)

**Path**: `~/.claude/agents/MODEL_SELECTION_GUIDE.md`

````markdown
# Agent Model Selection Guide

## Selection Criteria

| Condition | Model | Cost | Speed |
|-----------|-------|------|-------|
| Multi-agent coordination | opus | High | Slow |
| Deep context understanding | sonnet | Medium | Medium |
| Pattern-based processing | haiku | Low | Fast |

## Decision Tree

```text
Does task require coordinating multiple agents?
  YES → opus
  NO ↓
Does task require deep context understanding?
  YES → sonnet
  NO ↓
Is task pattern-based or routine?
  YES → haiku
  NO → sonnet (default)
```

## Current Agent Configuration

### Reviewers (mainly sonnet)

- performance-reviewer: sonnet - Complex optimization analysis
- accessibility-reviewer: sonnet - WCAG compliance check
- readability-reviewer: haiku - Pattern-based check
- type-safety-reviewer: sonnet - Type inference required

### Generators (mainly haiku)

- commit-generator: haiku - Routine message generation
- branch-generator: haiku - Naming convention-based generation
- test-generator: sonnet - Code understanding required

### Orchestrators (opus)

- audit-orchestrator: opus - Coordination of multiple reviewers

## Cost Estimates

Per 1000 tokens:

- haiku: ~$0.00025
- sonnet: ~$0.003
- opus: ~$0.015

## Decision Flow for New Agent Creation

1. Evaluate task complexity
2. Determine context understanding needs
3. Select model following Decision Tree above
4. Adjust based on similar existing Agents
````

### 2.3 agents/README.md (New)

**Path**: `~/.claude/agents/README.md`

````markdown
# Agents Directory

## Overview

Directory for storing Agent definition files used in Claude Code.

## Directory Structure

```text
agents/
├── README.md                    # This file
├── MODEL_SELECTION_GUIDE.md     # Model selection guide
├── reviewers/                   # Code review agents
│   ├── _base-template.md        # Reviewer common template
│   ├── performance.md
│   ├── accessibility.md
│   ├── readability.md
│   ├── type-safety.md
│   ├── structure.md
│   ├── design-pattern.md
│   ├── testability.md
│   ├── root-cause.md
│   ├── document.md
│   └── subagent.md
├── generators/                  # Code/content generation
│   └── test.md
├── orchestrators/               # Coordination/integration
│   └── audit-orchestrator.md
├── enhancers/                   # Code improvement
│   └── progressive.md
└── git/                         # Git operations
    ├── commit-generator.md
    ├── pr-generator.md
    └── branch-generator.md
```

## Agent File Format

All Agents use YAML frontmatter + Markdown format:

```yaml
---
name: agent-name              # Required: kebab-case
description: >                # Required: Multi-line description
  English description.
tools: Read, Grep, Task       # Required: Available tools
model: sonnet                 # Optional: haiku|sonnet|opus
skills:                       # Optional: Referenced skills
  - skill-name
---

# Agent Content

[Markdown content with instructions]
```

## New Agent Creation Procedure

1. **Model selection**: Refer to MODEL_SELECTION_GUIDE.md
2. **Template selection**: Use base-template for appropriate category
3. **Write YAML frontmatter**: name, description, tools are required
4. **Place in appropriate directory**: According to category
5. **Verify operation**: Test invocation via Task tool

## Agent Discovery

Agents are dynamically discovered via:

- **Glob**: `~/.claude/agents/**/*.md`
- **Identifier**: `name` field in YAML frontmatter
- **Invocation**: Specified via `subagent_type` parameter

## Related Documentation

- [MODEL_SELECTION_GUIDE.md](./MODEL_SELECTION_GUIDE.md) - Model selection criteria
- [reviewers/_base-template.md](./reviewers/_base-template.md) - Reviewer template
- [Skills README](../skills/README.md) - Integration with skills
````

### 2.4 Addition to session-end.sh

**Path**: `~/.claude/scripts/session-end.sh`

**Additional code**:

```bash
# Agent logs rotation - keep last 50 directories
AGENT_LOG_DIR="$HOME/.claude/logs/agents"
if [ -d "$AGENT_LOG_DIR" ]; then
  agent_count=$(ls -1 "$AGENT_LOG_DIR" 2>/dev/null | wc -l)
  if [ "$agent_count" -gt 50 ]; then
    ls -1t "$AGENT_LOG_DIR" | tail -n +51 | while read dir; do
      mv "$AGENT_LOG_DIR/$dir" ~/.Trash/ 2>/dev/null
    done
  fi
fi

# Subagent log rotation - keep last 1MB
SUBAGENT_LOG="$HOME/.claude/logs/subagent.log"
if [ -f "$SUBAGENT_LOG" ]; then
  log_size=$(stat -f%z "$SUBAGENT_LOG" 2>/dev/null || echo 0)
  if [ "$log_size" -gt 1048576 ]; then  # 1MB
    tail -c 512000 "$SUBAGENT_LOG" > "$SUBAGENT_LOG.tmp"
    mv "$SUBAGENT_LOG.tmp" "$SUBAGENT_LOG"
  fi
fi
```

### 2.5 SYNC_CHECKLIST.md (New)

**Path**: `~/.claude/rules/reference/SYNC_CHECKLIST.md`

```markdown
# Rules/Reference Sync Checklist

## When Updating rules/reference/

### Required Updates

- [ ] Update Japanese version (ja/rules/reference/)
- [ ] Check corresponding section in skills/code-principles/SKILL.md

### Verification Items

| Reference File | SKILL.md Section | Verify |
|----------------|------------------|--------|
| SOLID.md | "1. SOLID Principles" | Summary matches |
| DRY.md | "2. DRY" | Core concepts match |
| OCCAMS_RAZOR.md | "3. Occam's Razor" | Decision criteria match |
| MILLERS_LAW.md | "4. Miller's Law" | Numeric limits match |
| YAGNI.md | "5. YAGNI" | Decision criteria match |

### Update Procedure

1. Update reference/ file
2. Sync ja/reference/
3. Check SKILL.md summary
4. Resolve discrepancies (reference is canonical)

### DRY Principle Consistency

**Intentional Structure**:
- `rules/reference/`: Detailed canonical source (single source of truth)
- `SKILL.md`: Integrated summary (with reference links)

This hierarchical structure is not a DRY violation,
but rather knowledge representation at different abstraction levels.
```

---

## 3. Test Scenarios

### 3.1 Unit Tests (Manual)

```typescript
describe('PRE_TASK_CHECK Skip Logic', () => {
  it('[✓] skips for single-char confirmation "y"', () => {
    // Given: User message is "y"
    // When: PRE_TASK_CHECK evaluates
    // Then: Skip check, respond directly
  });

  it('[✓] skips for confirmation "yes"', () => {
    // Given: User message is "yes"
    // When: PRE_TASK_CHECK evaluates
    // Then: Skip check, respond directly
  });

  it('[✓] skips for short message < 15 chars', () => {
    // Given: User message is "thanks" (6 chars)
    // When: PRE_TASK_CHECK evaluates
    // Then: Skip check, respond directly
  });

  it('[✓] does NOT skip for file operation', () => {
    // Given: User message is "delete the file"
    // When: PRE_TASK_CHECK evaluates
    // Then: Execute full check flow
  });

  it('[→] does NOT skip for ambiguous pronoun', () => {
    // Given: User message is "fix it"
    // When: PRE_TASK_CHECK evaluates
    // Then: Execute full check flow
  });

  it('[→] handles edge case: short + file keyword', () => {
    // Given: User message is "delete it" (9 chars)
    // When: PRE_TASK_CHECK evaluates
    // Then: File keyword takes priority, execute check
  });
});
```

### 3.2 Integration Tests (1-week observation)

- [ ] Measure skip rate (Target: 70%)
- [ ] Detect missed file operation confirmations (Target: 0 cases)
- [ ] Monitor user satisfaction changes

---

## 4. Implementation Checklist

### Phase 1: PRE_TASK_CHECK Optimization

- [ ] Create backup of PRE_TASK_CHECK_COMPACT.md
- [ ] Add skip condition section at beginning
- [ ] Add NEVER SKIP conditions
- [ ] Add Quick Command Guide
- [ ] Add Ambiguity Detection
- [ ] Verify operation (test each pattern)

### Phase 2: Agent Standardization Documentation

- [ ] Create MODEL_SELECTION_GUIDE.md
- [ ] Create agents/README.md
- [ ] Verify consistency with existing Agents

### Phase 3: Maintenance Improvement

- [ ] Create backup of session-end.sh
- [ ] Add log rotation code
- [ ] Create SYNC_CHECKLIST.md
- [ ] Verify operation

---

## 5. Known Issues & Assumptions

### Assumptions (→)

1. [→] 70% of messages match skip conditions - Verify in operation
2. [→] Model selection guide improves new Agent creation efficiency - Subjective evaluation

### Unknown / Need Verification (?)

1. [?] Actual skip rate - Measure after 1 week operation
2. [?] Validity of log rotation threshold - Adjust with long-term operation

---

## 6. References

- SOW: `sow.md` (same directory)
- Plan file: `~/.claude/plans/synthetic-marinating-pillow.md`
- Current PRE_TASK_CHECK: `~/.claude/rules/core/PRE_TASK_CHECK_COMPACT.md`
- Current session-end.sh: `~/.claude/scripts/session-end.sh`
