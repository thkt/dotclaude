<!--
Golden Master: SOW - Config Optimization

Selection criteria:
- Typical example of configuration/performance optimization
- Specific quantitative goal (70% reduction)
- File:line references to existing configuration
- DRY violation analysis and intentional design determination

Features:
- Reference example for configuration file analysis tasks
- Quantitative UX improvement targets
- Appropriate handling of false positives

Source: ~/.claude/workspace/planning/2025-12-04-claude-code-config-optimization/

Last Reviewed: 2025-12-17
Update Reason: Added maintenance metadata fields
Previous Version: N/A
-->

# SOW: Claude Code Configuration Optimization

Version: 1.0.0
Status: Approved
Created: 2025-12-04

---

## Executive Summary

Optimization project based on Claude Code configuration review from Opus 4.5 perspective.

**Key findings**:

- [✓] PRE_TASK_CHECK confirmation flow triggers on every message, degrading UX
- [✓] Suspected DRY violations were intentional hierarchical design (no issue)
- [✓] Agents structure is generally good, but documentation is lacking

**Goal**: 70% reduction in "Y/n" confirmations for UX improvement

---

## Problem Analysis

### Current State [✓]

**PRE_TASK_CHECK confirmation redundancy**:

- [✓] PRE_TASK_CHECK_COMPACT.md is hook-injected on every message (settings.json:162-172)
- [✓] Confirmation responses ("y", "ok") also trigger "Y/n" confirmation flow every time
- [✓] Degraded user experience: Even simple conversations require confirmation waiting

**Lack of Agent standardization**:

- [→] Model selection criteria remain tacit knowledge (haiku/sonnet/opus usage)
- [→] Reference documentation for new Agent creation is insufficient
- [✓] 17 agents exist but no README

**Maintenance issues**:

- [✓] 228 directories accumulated in logs/agents/
- [→] Regular cleanup mechanism is inadequate

### Root Cause [→]

"Skip conditions" were not explicitly defined when PRE_TASK_CHECK was designed, causing AI to execute full flow every time.

---

## Assumptions & Prerequisites

### Verified Facts (✓)

- [✓] PRE_TASK_CHECK_COMPACT.md is 49 lines, approximately 1KB (rules/core/PRE_TASK_CHECK_COMPACT.md)
- [✓] Hook injection executes on UserPromptSubmit event (settings.json:162-172)
- [✓] Existing "When to Skip" section exists but not placed at the beginning
- [✓] Agents are unified in YAML frontmatter + Markdown format

### Working Assumptions (→)

- [→] Placing skip conditions at the beginning enables early AI decision-making
- [→] 70% of messages match skip conditions (confirmation responses, short text, read-only)
- [→] Having a model selection guide improves efficiency of new Agent creation

### Unknown/Needs Verification (?)

- [?] Actual skip rate needs to be measured in operation
- [?] Validity of log rotation threshold (50 items, 1MB)

---

## Solution Design

### Proposed Approach

**Design policy (user approved)**:

```text
Hook injection (maintained) → AI checks skip conditions →
  ├─ Matches → Direct response (skip confirmation flow)
  └─ Doesn't match → Display PRE_TASK_CHECK as usual
```

### Alternatives Considered

1. [→] **Make hook injection conditional**
   - Pro: Token savings
   - Con: Difficult to get message content in hook
   - **Rejection reason**: Technical constraint

2. [✓] **Explicitly state skip conditions in compact version (Adopted)**
   - Pro: Easy implementation, rollback possible
   - Con: Tokens are consumed
   - **Adoption reason**: UX improvement is main goal, technically reliable

3. [→] **Completely abolish PRE_TASK_CHECK**
   - Pro: Maximum simplification
   - Con: Reduced safety, risk of missing file operation confirmations
   - **Rejection reason**: Cannot sacrifice safety

### Recommendation

**Option 2: Explicit skip conditions** - Confidence: [✓]

---

## Test Plan

### Manual Tests (Priority: High)

- [ ] Skip occurs for confirmation responses ("y", "yes", "ok")
- [ ] Skip occurs for short text (< 15 characters)
- [ ] Confirmation flow triggers for file operation requests
- [ ] Confirmation flow triggers for ambiguous requests

### Verification (Priority: Medium)

- [ ] Measure skip rate after 1 week of operation
- [ ] Confirm 0 missed file operation confirmations

---

## Acceptance Criteria

### Phase 1: PRE_TASK_CHECK Optimization

- [✓] AC-1: Skip condition section added to beginning of PRE_TASK_CHECK_COMPACT.md
- [✓] AC-2: Confirmation flow skipped for confirmation responses (y/yes/ok/n/no)
- [✓] AC-3: Confirmation flow skipped for messages under 15 characters
- [✓] AC-4: Confirmation flow triggers as usual for file operation requests
- [→] AC-5: 70% skip rate achieved (measured after 1 week operation)

### Phase 2: Agent Standardization Documentation

- [✓] AC-6: MODEL_SELECTION_GUIDE.md created
- [✓] AC-7: agents/README.md created
- [→] AC-8: Reference destination for new Agent creation is clear

### Phase 3: Maintenance Improvement

- [✓] AC-9: Log rotation processing added to session-end.sh
- [✓] AC-10: SYNC_CHECKLIST.md created
- [→] AC-11: logs/ doesn't bloat (maintained below 50 items)

---

## Implementation Plan

### Phase 1: PRE_TASK_CHECK Optimization [Priority: High]

**Effort**: 1-2 hours

1. Add skip condition section to PRE_TASK_CHECK_COMPACT.md
2. Add Quick Command Guide
3. Add Ambiguity Detection section
4. Verify operation

### Phase 2: Agent Standardization Documentation [Priority: Medium]

**Effort**: 2-3 hours

1. Create MODEL_SELECTION_GUIDE.md
2. Create agents/README.md
3. Verify consistency with existing Agents

### Phase 3: Maintenance Improvement [Priority: Low]

**Effort**: 1 hour

1. Add log rotation to session-end.sh
2. Create SYNC_CHECKLIST.md

---

## Success Metrics

- [✓] Phase 1 complete: Skip conditions are functioning
- [→] After 1 week: 70% skip rate achieved
- [→] After 1 month: 0 missed file operation confirmations

---

## Risks & Mitigations

### High Confidence Risks (✓)

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Excessive skipping | Medium | Low | Conservative skip conditions, always confirm file operations |

### Potential Risks (→)

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Insufficient skipping | Low | Medium | Can respond by adding patterns |
| AI judgment errors | Medium | Low | Clarify Decision Tree |

### Rollback Strategy

```bash
# Phase 1 rollback
git checkout HEAD~1 -- ~/.claude/rules/core/PRE_TASK_CHECK_COMPACT.md
```

---

## Verification Checklist

Before implementation:

- [x] All [?] items investigated
- [x] Assumptions [→] confirmed with user
- [x] Facts [✓] have evidence

After implementation:

- [ ] Verify all AC-1 through AC-11
- [ ] Measure skip rate after 1 week operation

---

## Related Documents

- Plan file: `~/.claude/plans/synthetic-marinating-pillow.md`
- Spec: `spec.md` (same directory)
