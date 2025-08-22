---
name: think
description: 詳細な分析を行い、包括的な実装計画を作成
priority: high
suitable_for:
  scale: [small, medium, large]
  type: [fix, feature, refactor, optimize]
  understanding: "≥ 50%"
  urgency: [low, medium]
aliases: [plan, analyze]
timeout: 60
allowed-tools: Bash(git log:*), Bash(git diff:*), Bash(find:*), Bash(cat package.json:*), Read, Glob, Grep, LS, Task
context:
  complexity: "assessed"
  risks: "evaluated"
  dependencies: "mapped"
  solutions: "scored"
---

# /think - Advanced Planning & Solution Architecture

## Purpose

Perform detailed problem analysis with dynamic project understanding, risk assessment, and confidence-scored solution planning (SOW).

**RECOMMENDED**: Run `/research` first to understand the codebase context before planning. Planning with actual codebase knowledge results in more accurate and implementable SOWs.

## Dynamic Project Context

### Current Branch & Changes

```bash
git branch --show-current
```

### Recent Related Commits

```bash
git log --oneline -5
```

### Project Complexity Metrics

Count source files:

```bash
find . -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" | grep -v node_modules | wc -l
```

### Dependencies That May Impact

List key dependencies:

```bash
cat package.json | jq -r '.dependencies | to_entries | map(select(.key | test("react|redux|router|state|auth|api"))) | .[].key' | head -5
```

### Test Coverage Status

Check test coverage:

```bash
cat coverage/coverage-summary.json | jq -r '.total.lines.pct'
```

## Hierarchical Analysis Process

### Phase 1: Problem Understanding

Deep analysis with confidence scoring:

1. **Problem Definition**: Clear statement with evidence
2. **Impact Analysis**: Affected systems and users
3. **Root Cause**: Why the problem exists (not just symptoms)
4. **Constraints**: Technical, time, resource limitations

### Phase 2: Solution Discovery

Generate and evaluate multiple approaches:

1. **Solution Generation**: 3+ alternative approaches
2. **Principle Evaluation**: SOLID, DRY, Progressive Enhancement
3. **Risk Assessment**: Technical, schedule, maintenance risks
4. **Confidence Scoring**: Rate each solution (0.0-1.0)

## Decision Process Trace

Record decision-making stages with transparency and confidence levels:

### Stage 1: Problem Identification (Confidence: X.XX)

```markdown
- **Input Signal**: [Original user request or error description]
- **Problem Category**: [UI/State/Performance/Security/Logic]
- **Pattern Match**: [Similar to existing issue type or new]
- **Evidence**: [Specific indicators confirming the problem]
```

### Stage 2: Root Cause Analysis (Confidence: X.XX)

```markdown
- **Hypothesis 1**: [Most likely cause] → Likelihood: XX%
  - Evidence for: [Supporting data]
  - Evidence against: [Contradicting data]
- **Hypothesis 2**: [Alternative cause] → Likelihood: XX%
  - Evidence for: [Supporting data]
  - Evidence against: [Contradicting data]
- **Selected Hypothesis**: [Which one and why]
- **Similar Past Cases**:
  - `git log --grep="[related keyword]" --oneline | head -5`
  - Reference: [commit hash if found]
```

### Stage 3: Solution Selection (Confidence: X.XX)

```markdown
- **Option A**: [Approach name]
  - Implementation: [Brief how]
  - Pros: [Benefits]
  - Cons: [Drawbacks]
  - Past Success Rate: [If similar solution used before]
- **Option B**: [Alternative approach]
  - Implementation: [Brief how]
  - Pros: [Benefits]
  - Cons: [Drawbacks]
- **Decision**: [Selected option]
- **Rationale**: [Why this option over others]
- **Confidence Factors**:
  - Clear requirements: ✓/✗
  - Similar past success: ✓/✗
  - Low risk: ✓/✗
  - Aligns with principles: ✓/✗
```

### Stage 4: Implementation Strategy (Confidence: X.XX)

```markdown
- **Approach**: [Incremental/Big-bang/Parallel]
- **Key Decisions**:
  1. [Technical choice 1]: [Why]
  2. [Technical choice 2]: [Why]
- **Risk Mitigation**: [How to handle identified risks]
- **Validation Method**: [How to verify success]
```

### Overall Decision Confidence

```markdown
| Stage | Confidence | Key Factor |
|-------|------------|------------|
| Problem ID | X.XX | [Main confidence driver] |
| Root Cause | X.XX | [Main confidence driver] |
| Solution | X.XX | [Main confidence driver] |
| Implementation | X.XX | [Main confidence driver] |
| **Overall** | **X.XX** | **[Weighted average]** |
```

### Phase 3: Implementation Planning

Detailed execution strategy:

1. **Task Decomposition**: Break into atomic units
2. **Dependency Mapping**: Order and relationships
3. **Risk Mitigation**: Contingency plans
4. **Success Metrics**: How to measure completion

## Risk Assessment Framework

### Technical Risk Matrix

```markdown
| Risk Factor | Level | Impact | Mitigation |
|------------|-------|--------|------------|
| Breaking Changes | High/Med/Low | Users affected | Strategy |
| Performance Impact | High/Med/Low | Response time | Optimization |
| Security Concerns | High/Med/Low | Vulnerability | Prevention |
| Test Coverage Gap | High/Med/Low | Quality risk | Test plan |
| Technical Debt | High/Med/Low | Future cost | Refactoring |
```

### Complexity Scoring

- **Simple** (1-3): Single file, clear logic, < 50 lines
- **Medium** (4-6): Multiple files, some dependencies, < 200 lines
- **Complex** (7-9): Many files, complex logic, > 200 lines
- **Very Complex** (10): Architectural changes, multiple systems

## Solution Evaluation with Confidence

### Multi-Solution Analysis

```markdown
## Solution Options

### Option 1: [Approach Name] (Confidence: 0.85)
- **Description**: [What and how]
- **Pros**: [Benefits]
- **Cons**: [Drawbacks]
- **Risk Level**: Low/Medium/High
- **Implementation Time**: [Estimate]
- **SOLID Adherence**: [Score/10]
- **Why Confidence 0.85**: [Evidence]

### Option 2: [Approach Name] (Confidence: 0.70)
[Similar structure...]

### Option 3: [Approach Name] (Confidence: 0.60)
[Similar structure...]

## Recommended Solution: Option 1
**Rationale**: [Why this option based on scores]
```

## Enhanced SOW Format

```markdown
# SOW: [Title]
**Date**: [YYYY-MM-DD]
**Complexity**: [Score/10]
**Risk Level**: [Low/Medium/High]
**Confidence**: [Overall confidence score]

## Executive Summary
[1-2 paragraphs for stakeholders]

## Problem Analysis
### Current State
- **Problem**: [Clear description]
- **Evidence**: [Data/metrics showing the problem]
- **Impact**: [Who/what is affected]
- **Root Cause**: [Why it exists]

### Desired State
- **Goal**: [What success looks like]
- **Success Metrics**: [How to measure]
- **Constraints**: [Limitations]

## Solution Architecture

### Selected Approach (Confidence: [score])
[Detailed solution description]

### SOLID Principles Application
- **SRP**: [How responsibilities are separated]
- **OCP**: [Extension points identified]
- **LSP**: [Substitution principles followed]
- **ISP**: [Interface segregation approach]
- **DIP**: [Dependency abstractions]

### Technical Design
- **Components**: [New/modified components]
- **Data Flow**: [How data moves]
- **State Management**: [State changes]
- **Error Handling**: [Failure scenarios]

## Implementation Plan

### Phase 1: Foundation (Day 1)
| Task | Description | Time | Risk | Dependencies |
|------|-------------|------|------|--------------|
| 1.1 | [Task] | 1h | Low | None |
| 1.2 | [Task] | 2h | Med | 1.1 |

### Phase 2: Core Implementation (Day 2-3)
[Similar table structure]

### Phase 3: Testing & Refinement (Day 4)
[Similar table structure]

## Risk Analysis

### Identified Risks
| Risk | Probability | Impact | Mitigation | Contingency |
|------|------------|--------|------------|-------------|
| [Risk 1] | High/Med/Low | High/Med/Low | [Prevention] | [If occurs] |

### Technical Debt Assessment
- **Added Debt**: [What shortcuts taken]
- **Resolved Debt**: [What improved]
- **Net Impact**: [Overall effect]

## Resource Requirements
- **Developer Time**: [Total hours]
- **Review Time**: [Hours needed]
- **Testing Time**: [QA hours]
- **Dependencies**: [External needs]

## Success Criteria
1. ✓ [Measurable criterion]
2. ✓ [Measurable criterion]
3. ✓ [Measurable criterion]

## Rollback Plan
[How to revert if issues arise]

## Appendix
- **Related Issues**: [Links]
- **Similar Implementations**: [References]
- **Documentation Updates**: [Required docs]
```

## SOW Display Optimization

### User-Facing Summary Format

When presenting SOW to users, display this concise summary instead of the full document:

```markdown
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 Implementation Plan Summary

**Problem**: [1-line description]
**Solution**: [1-line approach]
**Complexity**: [X/10] | **Risk**: [Low/Med/High]
**Estimated Time**: [Total hours]
**Confidence**: [XX%]

**Key Phases**:
1. [Phase 1 name] - [duration]
2. [Phase 2 name] - [duration]
3. [Phase 3 name] - [duration]

✅ **Success Criteria** (3 key points):
- [Most important measurable outcome]
- [Second measurable outcome]
- [Third measurable outcome]

📁 Full SOW saved to: .claude/workspace/sow/[filename].md
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Type 'show details' for full SOW or proceed with implementation.
```

### Dynamic Display Control

Display detail level based on task complexity:

#### Simple Tasks (Complexity 1-3)

- Show only summary
- Save full SOW silently
- Auto-proceed if confidence > 0.9

#### Medium Tasks (Complexity 4-6)

- Show summary + key risks
- Prompt for confirmation
- Full SOW available on request

#### Complex Tasks (Complexity 7-10)

- Show extended summary
- Include risk matrix
- Require explicit confirmation
- Recommend review of full SOW

### Display Verbosity Settings

Support user preferences for SOW display:

```yaml
# User can configure in .claude/settings.json
{
  "sow_display": "summary",     # summary | normal | detailed | auto
  "auto_save_sow": true,        # Always save full version
  "show_confidence": true,      # Display confidence scores
  "show_progress": true,        # Real-time progress indicators
  "verbosity_by_complexity": {
    "simple": "summary",
    "medium": "normal",
    "complex": "detailed"
  }
}
```

### Progressive Disclosure Pattern

Information revealed in stages:

1. **Initial Display**: Summary only (5-10 lines)
2. **On Request**: Specific sections (e.g., "show risks")
3. **Full Details**: Complete SOW (saved file or inline)

Example interaction:

```bash
User: /think "Add OAuth authentication"
AI: [Shows summary]
User: show risks
AI: [Shows risk analysis section]
User: proceed
AI: [Continues with implementation]
```

### Implementation Examples

#### Example 1: Simple Task (Low Complexity)

```markdown
User: /think "Fix button alignment issue"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 Implementation Plan Summary

**Problem**: Button misaligned in header on mobile
**Solution**: CSS flexbox adjustment
**Complexity**: 2/10 | **Risk**: Low
**Estimated Time**: 0.5 hours
**Confidence**: 95%

**Key Phases**:
1. CSS Analysis - 10 min
2. Fix & Test - 20 min

✅ **Success Criteria**:
- Button centered on all screen sizes
- No layout breaks
- Passes visual regression tests

📁 Full SOW saved to: .claude/workspace/sow/2024-11-21-button-fix.md
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[Auto-proceeding with high confidence...]
```

#### Example 2: Complex Task (High Complexity)

```markdown
User: /think "Implement real-time collaboration features"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 Implementation Plan Summary

**Problem**: No real-time collaboration in document editor
**Solution**: WebSocket + CRDT implementation
**Complexity**: 8/10 | **Risk**: High
**Estimated Time**: 40 hours
**Confidence**: 75%

**Key Phases**:
1. Architecture Design - 8 hours
2. WebSocket Infrastructure - 16 hours
3. CRDT Implementation - 12 hours
4. Testing & Optimization - 4 hours

⚠️ **Major Risks**:
- Conflict resolution complexity
- Performance at scale
- Browser compatibility

✅ **Success Criteria**:
- < 100ms sync latency
- Handles 50+ concurrent users
- Zero data loss on conflicts

📁 Full SOW saved to: .claude/workspace/sow/2024-11-21-realtime-collab.md
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️ This is a complex task. Review the full SOW? (Y/n/proceed)
```

### Best Practices for SOW Display

#### DO

- ✅ Always save full SOW regardless of display mode
- ✅ Show confidence scores for transparency
- ✅ Adapt detail level to task complexity
- ✅ Provide quick access to specific sections
- ✅ Use visual indicators (emoji/colors) for quick scanning
- ✅ Keep summary under 15 lines for readability

#### DON'T

- ❌ Hide critical risks in summary mode
- ❌ Auto-proceed on low confidence tasks
- ❌ Overwhelm with details on simple tasks
- ❌ Skip SOW generation for "quick" tasks
- ❌ Mix summary and detailed content

#### Display Decision Matrix

| Complexity | Confidence | Display Mode | Auto-Proceed |
|------------|------------|--------------|--------------|
| 1-3        | > 90%      | Summary      | Yes          |
| 1-3        | < 90%      | Summary      | No           |
| 4-6        | > 80%      | Normal       | No           |
| 4-6        | < 80%      | Detailed     | No           |
| 7-10       | Any        | Extended     | Never        |

### Monitoring and Feedback

Track display effectiveness:

```bash
# Log user interactions with SOW display
.claude/metrics/sow-display.log
- Summary views: [count]
- Detail requests: [count]
- Auto-proceeds: [count]
- User overrides: [count]
```

Use metrics to refine thresholds and improve user experience.

## TodoWrite Integration

Automatic task creation with priorities:

```markdown
# Planning: [Topic]
1. ⏳ Analyze problem and gather context (15 min) [P1]
2. ⏳ Generate solution options (20 min) [P1]
3. ⏳ Evaluate against principles (15 min) [P2]
4. ⏳ Assess risks and complexity (10 min) [P2]
5. ⏳ Create detailed implementation plan (20 min) [P1]
6. ⏳ Document SOW (10 min) [P3]
7. ⏳ Review and finalize (10 min) [P3]
```

## Progress Display

### TodoWrite Integration with Analysis Progress

Display planning progress with confidence building:

```markdown
📋 Planning Task: OAuth Authentication Feature
1. ✅ Problem analysis and context gathering (Completed: 3 min)
2. ✅ Solution generation (Completed: 5 min)
3. ⏳ Evaluating principles... ▓▓▓▓▓▓▓░░░ 70%
4. ⏸️ Risk assessment (Waiting)
5. ⏸️ Implementation planning (Waiting)
6. ⏸️ SOW documentation (Waiting)
7. ⏸️ Review and finalization (Waiting)

Current: Verifying SOLID principles alignment...
Confidence building: 72% | Elapsed: 12 min / Estimated: 20 min
```

### Confidence Building Visualization

Show confidence progression during analysis:

```markdown
🎯 Confidence Building Process:
Problem Understanding: [████████████] 95%
Solution:             [████████░░░░] 70%
Risk Assessment:      [██████░░░░░░] 50%
Implementation Detail: [████░░░░░░░░] 35%

Overall Confidence: 62.5% (Target: 80%)
Current Phase: Verifying technical feasibility...
```

### Planning Mode Indicators

#### Quick Planning

```markdown
⚡ Quick plan... [████████░░] 80% (2 min)
Scope: Simple fix | Confidence: High
```

#### Standard Planning

```markdown
📋 Standard Planning Progress:
Phase 1/3: ✅ Analysis complete
Phase 2/3: ⏳ Solution design (60%)
Phase 3/3: ⏸️ Documentation pending
```

#### Deep Planning

```markdown
🔬 Deep Planning Analysis:
Discovery:      [████████████] 100%
Architecture:   [████████████] 100%
Risk Analysis:  [████████░░░░] 70%
Dependencies:   [██████░░░░░░] 50%
Implementation: [████░░░░░░░░] 30%

Current: Mapping dependency impacts...
Decisions Made: 8/12 | Confidence Avg: 0.75
```

### Real-time Decision Updates

```markdown
💡 Decision Points:
[10:15:23] ✅ Approach: Microservice pattern selected
[10:15:45] ✅ Database: PostgreSQL chosen over MongoDB
[10:16:02] ⏳ Caching: Evaluating Redis vs Memory cache...
[10:16:15] ⏸️ API Design: Pending architecture decision
```

## Interactive Planning Mode

### Requirements Clarification

When confidence < 0.7, ask:

```markdown
## Clarification Needed
To increase planning confidence, please confirm:
1. **Requirement**: [What's unclear]
   - Option A: [Interpretation 1]
   - Option B: [Interpretation 2]

2. **Constraint**: [What limitation]
   - Current assumption: [What we think]
   - Please confirm: [Yes/No/Specify]
```

### Solution Validation

Before finalizing high-risk plans:

```markdown
## Risk Validation
This plan involves [high-risk element]:
- **Risk**: [Description]
- **Impact if wrong**: [Consequence]
- **Alternative**: [Safer option]

Proceed with risky approach? (Y/n/alternative)
```

## Decision Criteria Framework

### When to Use Each Planning Depth

#### Quick Planning (10-15 min)

- Complexity < 3
- Single file changes
- Well-understood problem
- Low risk

Command: `/think --quick`

#### Standard Planning (30-45 min)

- Complexity 4-6
- Multiple files
- Some unknowns
- Medium risk

Command: `/think` (default)

#### Deep Planning (60+ min)

- Complexity > 7
- Architectural changes
- Many unknowns
- High risk

Command: `/think --deep`

## SOW Quality Metrics

Track planning effectiveness:

- **Accuracy**: Estimated vs actual time
- **Completeness**: Tasks added during implementation
- **Risk Prediction**: Predicted vs encountered issues
- **Confidence Calibration**: Confidence vs success rate

## Advanced Features

### Historical Analysis

Learn from past implementations:

```bash
git log --oneline --since="6 months ago" --grep="similar" | head -5
```

### Dependency Impact Analysis

Understand ripple effects:

```bash
grep -l "ComponentName" **/*.{ts,tsx,js,jsx} 2>/dev/null | wc -l | xargs -I {} echo "Files depending on component: {}"
```

### Performance Baseline

For optimization planning:

```bash
cat .metrics/performance.json 2>/dev/null | jq '.current' || echo "No performance baseline"
```

## Usage Examples

### Quick Planning (After Research)

```bash
/research "login button implementation"
/think --quick "Fix login button disabled state"
# Fast planning with context for simple issue
```

### Standard Planning

```bash
/think "Add user preference system"
# Balanced planning for feature
```

### Deep Planning

```bash
/think --deep "Migrate to new state management"
# Comprehensive planning for major change
```

### From Issue

```bash
/think "https://github.com/owner/repo/issues/123"
# Plan from GitHub issue
```

## Next Steps After Planning

- **High Confidence (>0.8)** → Proceed to `/code`
- **Medium Confidence (0.6-0.8)** → Consider more `/research` if needed
- **Low Confidence (<0.6)** → Clarification or `/research` needed before proceeding

## Best Practices

1. **Always Consider Multiple Solutions**: Never settle for first idea
2. **Score Everything**: Confidence, risk, complexity
3. **Document Assumptions**: Make implicit explicit
4. **Plan for Failure**: Include rollback strategies
5. **Measure Success**: Define clear criteria
6. **Learn from History**: Check past similar work

## SOW Storage

Save all SOWs for future reference:

```bash
.claude/workspace/sow/
├── YYYY-MM-DD-[title].md      # Active SOWs
├── completed/                   # Finished work
│   └── YYYY-MM-DD-[title].md
└── archived/                    # Cancelled/outdated
    └── YYYY-MM-DD-[title].md
```

Move to `completed/` when implementation done.
Archive outdated plans for historical reference.
