---
name: research
description: プロジェクト理解と技術調査を行う（実装なし）
priority: medium
suitable_for:
  scale: [small, medium, large]
  type: [exploration, analysis, learning]
  understanding: "≥ 30%"
  urgency: [low, medium]
aliases: []
timeout: 90
allowed-tools: Bash(find:*), Bash(tree:*), Bash(ls:*), Bash(git log:*), Bash(git diff:*), Bash(grep:*), Bash(cat:*), Bash(cat package.json:*), Bash(head:*), Bash(wc:*), Read, Glob, Grep, LS, Task
context:
  project_structure: "dynamic"
  tech_stack: "discovered"
  dependencies: "analyzed"
  patterns: "identified"
---

# /research - Advanced Project Research & Technical Investigation

## Purpose

Investigate codebase with dynamic discovery, parallel search execution, and confidence-based findings, without implementation commitment.

## Dynamic Project Discovery

### Recent Commit History

```bash
!`git log --oneline -10 || echo "Not a git repository"`
```

### Technology Stack

```bash
!`ls -la package.json pyproject.toml go.mod Cargo.toml pom.xml build.gradle | head -5 || echo "No standard project files found"`
```

### Modified Files

```bash
!`git diff --name-only HEAD~1 | head -10 || echo "No recent changes"`
```

### Documentation Files

```bash
!`find . -name "*.md" | grep -v node_modules | head -10 || echo "No documentation found"`
```

### Core File Count

```bash
!`find . -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" | grep -v node_modules | wc -l`
```

## Quick Context Analysis

### Test Framework Detection

```bash
!`grep -E "jest|mocha|vitest|pytest|unittest" package.json 2>/dev/null | head -3 || echo "No test framework detected"`
```

### API Endpoints

```bash
!`grep -r "app.get\|app.post\|app.put\|app.delete\|router." --include="*.js" --include="*.ts" | head -10 || echo "No API endpoints found"`
```

### Configuration Files

```bash
!`ls -la .env* .config* *.config.* | head -10 || echo "No configuration files found"`
```

### Package Dependencies

```bash
!`grep -E '"dependencies"|"devDependencies"' -A 10 package.json 2>/dev/null || echo "No package.json found"`
```

### Recent Issues/TODOs

```bash
!`grep -r "TODO\|FIXME\|HACK" --include="*.ts" --include="*.tsx" --include="*.js" | head -10 || echo "No TODOs found"`
```

## Hierarchical Research Process

### Phase 1: Scope Discovery

Analyze project to understand:

1. **Architecture**: Identify project structure and patterns
2. **Technology**: Detect frameworks, libraries, tools
3. **Conventions**: Recognize coding standards and practices
4. **Entry Points**: Find main files, exports, APIs

### Phase 2: Parallel Investigation

Execute searches concurrently for efficiency:

- **Pattern Search**: Multiple grep operations in parallel
- **File Discovery**: Simultaneous glob patterns
- **Dependency Tracing**: Parallel import analysis
- **Documentation Scan**: Concurrent README/docs reading

### Phase 3: Synthesis & Scoring

Consolidate findings with confidence levels:

1. **Confidence Scoring**: Rate each finding (0.0-1.0)
2. **Pattern Recognition**: Identify recurring themes
3. **Relationship Mapping**: Connect related components
4. **Priority Assessment**: Rank by importance

## Context-Based Automatic Level Selection

The `/research` command automatically determines the appropriate investigation depth based on context analysis, eliminating the need for manual level specification.

### How Context Analysis Works

When you run `/research`, the AI automatically:

1. **Analyzes Current Context**
   - Conversation history and flow
   - Previous research findings
   - Current work phase (planning/implementation/debugging)
   - User's implied intent

2. **Selects Optimal Level**
   - **Quick Scan (30 sec)**: Initial project exploration, overview requests
   - **Standard Research (2-3 min)**: Implementation preparation, specific inquiries
   - **Deep Investigation (5 min)**: Problem solving, comprehensive analysis

3. **Explains the Decision**

   ```text
   🔍 Research Level: Standard (auto-selected)
   Reason: Implementation context detected - gathering detailed information
   ```

### Context Determination Criteria

```markdown
## Automatic Level Selection Logic

### Quick Scan Selected When:
- First interaction with a project
- User asks for overview or summary
- No specific problem to solve
- General exploration needed

### Standard Research Selected When:
- Following up on previous findings
- Preparing for implementation
- Specific component investigation
- Normal development workflow

### Deep Investigation Selected When:
- Debugging or troubleshooting context
- Previous research was insufficient
- Complex system analysis needed
- Multiple interconnected components involved
```

## Research Strategies

### Quick Scan (Auto-selected: 30 sec)

Surface-level understanding:

- Project structure overview
- Main technologies identification
- Key file discovery

### Standard Research (Auto-selected: 2-3 min)

Balanced depth and breadth:

- Core architecture understanding
- Key patterns identification
- Main dependencies analysis
- Implementation-ready insights

### Deep Dive (Auto-selected: 5 min)

Comprehensive investigation:

- Complete architecture mapping
- All patterns and relationships
- Full dependency graph
- Historical context (git history)
- Root cause analysis

### Manual Override (Optional)

While context-based selection is automatic, you can override if needed:

- `/research --quick` - Force quick scan
- `/research --deep` - Force deep investigation
- Default behavior: Automatic context-based selection

## Efficient Search Patterns

### Parallel Execution Example

```typescript
// Execute these simultaneously, not sequentially
const searches = [
  Grep({ pattern: "class.*Controller", glob: "**/*.ts" }),
  Grep({ pattern: "export.*function", glob: "**/*.js" }),
  Glob({ pattern: "**/*.test.*" }),
  Glob({ pattern: "**/api/**" })
];
```

### Smart Pattern Selection

Based on initial discovery:

- **React Project**: Search for hooks, components, context
- **API Project**: Search for routes, controllers, middleware
- **Library Project**: Search for exports, types, tests

## Confidence-Based Findings

### Finding Classification

```markdown
## High Confidence Findings (> 0.8)
### Authentication System
- **Location**: src/auth/*
- **Type**: JWT-based
- **Confidence**: 0.95
- **Evidence**: Multiple JWT imports, token validation middleware
- **Dependencies**: jsonwebtoken, bcrypt
- **Entry Points**: auth.controller.ts, auth.middleware.ts

## Medium Confidence Findings (0.5 - 0.8)
### State Management
- **Pattern**: Redux-like pattern detected
- **Confidence**: 0.7
- **Evidence**: Actions, reducers folders found
- **Uncertainty**: Actual library unclear (Redux/MobX/Zustand?)

## Low Confidence Findings (< 0.5)
### Possible Patterns
- May use microservices (0.4) - multiple service folders
- Might have WebSocket support (0.3) - socket.io in dependencies
```

## TodoWrite Integration

Automatic task tracking:

```markdown
# Research: [Topic]
1. ⏳ Discover project structure (30 sec)
2. ⏳ Identify technology stack (30 sec)
3. ⏳ Execute parallel searches (2 min)
4. ⏳ Analyze findings (1 min)
5. ⏳ Score confidence levels (30 sec)
6. ⏳ Synthesize report (1 min)
```

## Task Agent Usage

### When to Use Task Agent

Use `general-purpose` agent for:

- **Complex Investigations**: 10+ related searches
- **Exploratory Analysis**: Unknown structure
- **Relationship Mapping**: Understanding connections
- **Historical Research**: Git history analysis
- **Parallel Execution**: Multiple searches simultaneously
- **Result Structuring**: Clean, organized output

### Enhanced Task Agent Integration with Context Analysis

```typescript
// Context-aware automatic level selection
Task({
  subagent_type: "general-purpose",
  description: "Context-aware code investigation",
  prompt: `
    [CONTEXT ANALYSIS]
    First, analyze the current context to determine investigation depth:

    1. Conversation Context:
       - Is this the first investigation? → Quick scan
       - Following up on previous findings? → Standard/Deep
       - Debugging or troubleshooting? → Deep

    2. User Intent Analysis:
       - Overview requested? → Quick scan
       - Implementation preparation? → Standard
       - Problem solving? → Deep

    3. Automatically Select Level:
       - Quick (30 sec): High-level overview only
       - Standard (2-3 min): Balanced investigation
       - Deep (5 min): Comprehensive analysis

    [SELECTED LEVEL: Determine based on context]

    [PARALLEL EXECUTION TASKS]
    Based on selected level, execute appropriate tasks:

    Quick Scan Tasks:
    - Project structure overview
    - Main technology identification
    - Key component listing

    Standard Research Tasks:
    - Architecture analysis with patterns
    - Technology stack deep dive
    - Code quality assessment
    - Implementation readiness check

    Deep Investigation Tasks:
    - Complete system mapping
    - All design patterns and relationships
    - Security analysis
    - Performance bottlenecks
    - Historical evolution
    - Root cause analysis if debugging

    [OUTPUT REQUIREMENTS]
    - State selected level and reason
    - Return only structured results
    - Include confidence score (0.0-1.0) for each finding
    - Sort by importance
    - Remove redundant information
    - Quick: 30 seconds max
    - Standard: 2-3 minutes max
    - Deep: 5 minutes max

    [REPORT FORMAT]
    ## 🔍 Research Level: [Quick/Standard/Deep] (auto-selected)
    Reason: [Why this level was chosen based on context]

    ## Investigation Summary
    - Execution time: [seconds]
    - Coverage: [%]
    - Overall confidence: [0.0-1.0]

    ## Key Findings (by confidence)
    1. [Finding] (Confidence: X.XX)
    2. [Finding] (Confidence: X.XX)

    ## Technical Details
    - Architecture: [Brief description]
    - Main technologies: [List]
    - Improvement suggestions: [If any]
  `
})
```

### Context-Aware Research Task (Default)

```typescript
// Default: Let AI determine appropriate level based on context
Task({
  subagent_type: "general-purpose",
  description: "Adaptive research",
  prompt: `
    Topic: ${topic}

    [AUTO-SELECT RESEARCH LEVEL]
    Analyze context and choose:
    - Quick (30s): If overview/first look needed
    - Standard (2-3m): If implementation/normal investigation
    - Deep (5m): If debugging/comprehensive analysis

    Execute appropriate investigation based on selected level.
    Return structured findings with confidence scores.
    Include reason for level selection.
  `
})
```

### Manual Override Examples

```typescript
// Force quick scan (when you know you need just an overview)
Task({
  subagent_type: "general-purpose",
  description: "Quick scan override",
  prompt: `
    FORCE LEVEL: Quick scan (30 seconds max)
    Topic: ${topic}
    Return top 5 findings only.
    Each finding: one line with confidence score.
  `
})

// Force deep investigation (when you know you need everything)
Task({
  subagent_type: "general-purpose",
  description: "Deep investigation override",
  prompt: `
    FORCE LEVEL: Deep investigation (5 minutes)
    Topic: ${topic}
    Perform comprehensive analysis including:
    - Complete architecture mapping
    - All patterns and relationships
    - Historical context
    - Root cause analysis
    Return detailed findings with full context.
  `
})
```

## Advanced Features

### Cross-Reference Analysis

Connect findings across different areas:

```bash
grep -l "AuthController" **/*.ts | xargs grep -l "UserService"
```

### Import Dependency Graph

Trace module dependencies:

```bash
grep -h "^import.*from" **/*.ts | sed "s/.*from ['\"]\.\/\(.*\)['\"].*/\1/" | sort | uniq -c | sort -rn | head -10
```

### Pattern Frequency Analysis

Identify common patterns:

```bash
grep -oh "use[A-Z][a-zA-Z]*" **/*.tsx | sort | uniq -c | sort -rn | head -10
```

### Historical Context

Understand evolution:

```bash
git log --oneline --since="3 months ago" --pretty=format:"%h %s" | head -10
```

## Output Format

```markdown
## Research Summary
- **Scope**: [What was researched]
- **Duration**: [Time taken]
- **Confidence**: [Overall confidence score]
- **Coverage**: [% of codebase analyzed]

## Key Discoveries

### Architecture (Confidence: 0.9)
- **Pattern**: [MVC/Microservices/Monolith]
- **Structure**: [Description]
- **Entry Points**: [Main files]

### Technology Stack (Confidence: 0.95)
- **Framework**: [React/Vue/Express/etc]
- **Language**: [TypeScript/JavaScript]
- **Key Libraries**: [List]

### Code Patterns (Confidence: 0.85)
- **Design Patterns**: [Observer/Factory/etc]
- **Conventions**: [Naming/Structure]
- **Best Practices**: [Identified patterns]

## Findings by Confidence

### High Confidence (>0.8)
1. [Finding with evidence]
2. [Finding with evidence]

### Medium Confidence (0.5-0.8)
1. [Finding with uncertainty noted]
2. [Finding with assumptions]

### Low Confidence (<0.5)
1. [Possible pattern]
2. [Needs verification]

## Relationships Discovered
- [Component A] → [Component B]: [Relationship type]
- [Service X] ← [Module Y]: [Dependency]

## Recommendations
1. **Immediate Focus**: [Most important areas]
2. **Further Investigation**: [Areas needing deeper research]
3. **Implementation Approach**: [If moving to /code]

## References
- Key Files: [List with paths]
- Documentation: [Links/paths]
- External Resources: [If found]
```

## Persistent Documentation

For significant findings, save to:

```bash
.claude/workspace/research/YYYY-MM-DD-[topic].md
```

Include:

- Architecture diagrams (ASCII)
- Dependency graphs
- Key code snippets
- Future reference notes

## Usage Examples

### Default Context-Based Selection (Recommended)

```bash
/research "authentication system"
# AI automatically selects appropriate level based on context
# Example: Selects "Standard" if preparing for implementation
# Example: Selects "Deep" if debugging authentication issues
# Example: Selects "Quick" if first time exploring the project
```

### Automatic Level Selection Examples

```bash
# Scenario 1: First project exploration
/research
# → Auto-selects Quick scan (30s overview)

# Scenario 2: After finding a bug
/research "user validation error"
# → Auto-selects Deep investigation (root cause analysis)

# Scenario 3: During implementation planning
/research "database schema"
# → Auto-selects Standard research (implementation details)
```

### Manual Override (When Needed)

```bash
# Force quick overview
/research --quick "API structure"

# Force deep analysis
/research --deep "complete system architecture"

# Default (recommended): Let AI decide
/research "payment processing"
```

## Best Practices

1. **Start Broad**: Get overview before diving deep
2. **Parallel Search**: Execute multiple searches simultaneously
3. **Score Confidence**: Always rate findings reliability
4. **Document Patterns**: Note recurring themes
5. **Map Relationships**: Connect components
6. **Save Important Findings**: Persist for future reference

## Performance Tips

### Optimize Searches

- Use specific globs: `**/*.controller.ts` not `**/*`
- Limit depth when possible: `-maxdepth 3`
- Exclude irrelevant: `-not -path "*/test/*"`

### Efficient Patterns

- Batch related searches together
- Use Task agent for 10+ operations
- Cache common queries results

## Next Steps

- **Found Issues** → `/fix` for targeted solutions
- **Need Planning** → `/think` for architecture decisions
- **Ready to Build** → `/code` for implementation
- **Documentation Needed** → Create comprehensive docs
