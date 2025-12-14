---
description: >
  Perform project research and technical investigation without implementation. Explore codebase structure, technology stack, dependencies, and patterns.
  Use when understanding is low (≥30%) and you need to learn before implementing. Documents findings persistently for future reference.
  Uses Task agent for complex searches with efficient parallel execution.
  プロジェクト理解と技術調査を行う（実装なし）。コードベース構造、技術スタック、依存関係、パターンを探索。
allowed-tools: Bash(tree:*), Bash(ls:*), Bash(git log:*), Bash(git diff:*), Bash(grep:*), Bash(cat:*), Bash(cat package.json:*), Bash(head:*), Bash(wc:*), Read, Glob, Grep, LS, Task
model: inherit
argument-hint: "[research topic or question]"
---

# /research - Advanced Project Research & Technical Investigation

## Purpose

Investigate codebase with dynamic discovery, parallel search execution, and confidence-based findings (✓/→/?), without implementation commitment.

**Output Verifiability**: All findings include evidence, distinguish facts from inferences, and explicitly state unknowns per AI Operation Principle #4.

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

Use Glob to find documentation:

- `**/*.md` (excluding node_modules)

### Core File Count

Use Glob to count source files:

- `**/*.{ts,tsx,js,jsx}` (excluding node_modules)

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

Use both numeric scores (0.0-1.0) and visual markers (✓/→/?) for clarity:

- **✓ High Confidence (> 0.8)**: Directly verified from code/files
- **→ Medium Confidence (0.5 - 0.8)**: Reasonable inference from evidence
- **? Low Confidence (< 0.5)**: Assumption requiring verification

```markdown
## ✓ High Confidence Findings (> 0.8)
### Authentication System (0.95)
- **Location**: src/auth/* (verified)
- **Type**: JWT-based (confirmed by imports)
- **Evidence**: Multiple JWT imports, token validation middleware
- **Dependencies**: jsonwebtoken, bcrypt (package.json:12-15)
- **Entry Points**: auth.controller.ts, auth.middleware.ts

## → Medium Confidence Findings (0.5 - 0.8)
### State Management (0.7)
- **Pattern**: Redux-like pattern detected
- **Evidence**: Actions, reducers folders found (src/store/)
- **Uncertainty**: Actual library unclear (Redux/MobX/Zustand?)
- **Reason**: Folder structure suggests Redux, but no explicit import found yet

## ? Low Confidence Findings (< 0.5)
### Possible Patterns
- [?] May use microservices (0.4) - multiple service folders observed
- [?] Might have WebSocket support (0.3) - socket.io in dependencies, no usage found
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

### When to Use Explore Agent

Use `Explore` agent for:

- **Complex Investigations**: 10+ related searches
- **Exploratory Analysis**: Unknown structure
- **Relationship Mapping**: Understanding connections
- **Historical Research**: Git history analysis
- **Parallel Execution**: Multiple searches simultaneously
- **Result Structuring**: Clean, organized output
- **Fast Codebase Exploration**: Haiku-powered for efficiency

### Explore Agent Integration

```typescript
// Explore agent with automatic level selection
Task({
  subagent_type: "Explore",
  thoroughness: determineThornessLevel(), // "quick" | "medium" | "very thorough"
  description: "Codebase exploration and investigation",
  prompt: `
Topic: "${researchTopic}"

Investigate:
1. Architecture: organization, entry points (file:line), patterns [✓]
2. Tech stack: frameworks (versions), languages, testing [✓]
3. Key components: modules, APIs, config [✓]
4. Code patterns: conventions, practices [→]
5. Relationships: dependencies, data flow, integration [→]

Report format:
- Coverage, confidence [✓/→/?]
- Key findings by confidence with evidence (file:line)
- Verification notes: verified, inferred, unknown
  `
})

// Helper function for determining thoroughness level
function determineThornessLevel() {
  // Auto-select based on context
  if (isQuickScanNeeded()) return "quick";        // 30s overview
  if (isDeepDiveNeeded()) return "very thorough"; // 5m comprehensive
  return "medium";                                 // 2-3m balanced (default)
}
```

### Context-Aware Research Task (Default)

```typescript
// Default: Explore agent with automatic thoroughness selection
Task({
  subagent_type: "Explore",
  thoroughness: "medium", // Auto-adjusted based on context if needed
  description: "Codebase investigation",
  prompt: `
    Research Topic: "${topic}"

    Explore the codebase and provide structured findings:

    1. Architecture & Structure [✓]
    2. Technology Stack [✓]
    3. Key Components & Patterns [→]
    4. Relationships & Dependencies [→]
    5. Unknowns requiring investigation [?]

    Include:
    - Confidence markers (✓/→/?)
    - Evidence (file:line references)
    - Clear distinction between facts and inferences

    Return organized report with verification notes.
  `
})
```

### Manual Override Examples

```typescript
// Force quick scan (when you know you need just an overview)
Task({
  subagent_type: "Explore",
  thoroughness: "quick",
  description: "Quick overview scan",
  prompt: `
    Topic: "${topic}"

    Provide quick overview (30 seconds):
    - Top 5 key findings
    - Basic architecture
    - Main technologies
    - Entry points

    Each finding: one line with confidence marker (✓/→/?)
  `
})

// Force deep investigation (when you know you need everything)
Task({
  subagent_type: "Explore",
  thoroughness: "very thorough",
  description: "Comprehensive investigation",
  prompt: `
    Topic: "${topic}"

    Comprehensive analysis (5 minutes):
    - Complete architecture mapping
    - All patterns and relationships
    - Historical context (git history)
    - Root cause analysis
    - Security and performance considerations

    Return detailed findings with full evidence and context.
    Include confidence markers and verification notes.
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

**IMPORTANT**: Apply Output Verifiability principle - use ✓/→/? markers with evidence.

```markdown
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 Research Context (Context Engineering Structure)

🎯 Purpose
- Why this research is being conducted
- What we aim to achieve

📋 Prerequisites
- [✓] Known constraints & requirements (verified)
- [→] Inferred environment & configuration
- [?] Unknown dependencies (need verification)

📊 Available Data
- Related files: [file paths discovered]
- Tech stack: [frameworks/libraries identified]
- Existing implementation: [what was found]

🔒 Constraints
- Security requirements
- Performance limitations
- Compatibility constraints

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Research Summary
- **Scope**: [What was researched]
- **Duration**: [Time taken]
- **Overall Confidence**: [Score with marker: ✓/→/?]
- **Coverage**: [% of codebase analyzed]

## Key Discoveries

### ✓ Architecture (0.9)
- **Pattern**: [MVC/Microservices/Monolith]
- **Structure**: [Description]
- **Entry Points**: [Main files with line numbers]
- **Evidence**: [Specific files/imports that confirm this]

### ✓ Technology Stack (0.95)
- **Framework**: [React/Vue/Express/etc]
- **Language**: [TypeScript/JavaScript]
- **Key Libraries**: [List with versions from package.json:line]
- **Evidence**: [package.json dependencies, import statements]

### → Code Patterns (0.7)
- **Design Patterns**: [Observer/Factory/etc]
- **Conventions**: [Naming/Structure]
- **Best Practices**: [Identified patterns]
- **Inference Basis**: [Why we believe this - folder structure/naming]

## Findings by Confidence

### ✓ High Confidence (>0.8)
1. [✓] [Finding] - Evidence: [file:line, specific code reference]
2. [✓] [Finding] - Evidence: [direct observation]

### → Medium Confidence (0.5-0.8)
1. [→] [Finding] - Inferred from: [logical reasoning]
2. [→] [Finding] - Likely because: [supporting evidence]

### ? Low Confidence (<0.5)
1. [?] [Possible pattern] - Needs verification: [what to check]
2. [?] [Assumption] - Unknown: [what information is missing]

## Relationships Discovered
- [✓] [Component A] → [Component B]: [Relationship] (verified in imports)
- [→] [Service X] ← [Module Y]: [Dependency] (inferred from structure)

## Recommendations
1. **Immediate Focus**: [Most important areas]
2. **Further Investigation**: [Areas needing deeper research with specific unknowns]
3. **Implementation Approach**: [If moving to /code]

## References
- Key Files: [List with absolute paths and relevant line numbers]
- Documentation: [Absolute paths to docs]
- External Resources: [URLs if found]

## Verification Notes
- **What was directly verified**: [List with ✓]
- **What was inferred**: [List with →]
- **What remains unknown**: [List with ?]
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

### Context Engineering Integration

**IMPORTANT**: Always save structured context for `/think` integration.

**Context File**: `.claude/workspace/research/[timestamp]-[topic]-context.md`

**Format**:

```markdown
# Research Context: [Topic]
Generated: [Timestamp]
Overall Confidence: [✓/→/?] [Score]

## 🎯 Purpose
[Why this research was conducted]
[What we aim to achieve with this knowledge]

## 📋 Prerequisites
### Verified Facts (✓)
- [✓] [Fact] - Evidence: [file:line or source]

### Working Assumptions (→)
- [→] [Assumption] - Based on: [reasoning]

### Unknown/Needs Verification (?)
- [?] [Unknown] - Need to check: [what/where]

## 📊 Available Data
### Related Files
- [file paths with relevance notes]

### Technology Stack
- [frameworks/libraries with versions]

### Existing Implementation
- [what was found with evidence]

## 🔒 Constraints
### Security
- [security requirements identified]

### Performance
- [performance limitations discovered]

### Compatibility
- [compatibility constraints found]

## 📌 Key Findings Summary
[Brief summary of most important discoveries for quick reference]

## 🔗 References
- Detailed findings: [link to full research doc]
- Related SOWs: [if any exist]
```

**Usage Flow**:

1. `/research` generates both detailed findings AND structured context
2. Context file is automatically saved for `/think` to discover
3. `/think` reads latest context file to inform planning

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
3. **Apply Output Verifiability**: Use ✓/→/? markers with evidence
   - [✓] Direct verification: Include file paths and line numbers
   - [→] Logical inference: Explain reasoning
   - [?] Assumptions: Explicitly state what needs confirmation
4. **Score Confidence**: Always rate findings reliability (0.0-1.0)
5. **Document Patterns**: Note recurring themes
6. **Map Relationships**: Connect components with evidence
7. **Save Important Findings**: Persist for future reference
8. **Admit Unknowns**: Never pretend to know - explicitly list gaps

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
