# Claude AI Architecture Overview

A comprehensive technical architecture document for the Claude AI configuration system.

## 📁 Directory Structure and Configuration

```text
~/.claude/
├── CLAUDE.md              # Global configuration (AI reads this)
├── README.md              # Quick start and overview
├── settings.json          # Tool permissions and settings
├── docs/                  # Documentation
│   ├── ARCHITECTURE.md   # This file - system architecture
│   ├── COMMANDS.md       # Command reference (English)
│   ├── MODEL_SELECTION.md # Model selection guidelines
│   ├── AGENT_USAGE.md    # Agent usage documentation
│   └── PROJECT_SETUP.md  # Project setup guide
│
├── agents/                # Agent definitions (14 total)
│   ├── orchestrators/
│   │   └── review-orchestrator.md
│   ├── frontend/
│   │   ├── readability-reviewer.md
│   │   ├── structure-reviewer.md
│   │   ├── root-cause-reviewer.md
│   │   ├── type-safety-reviewer.md
│   │   ├── performance-reviewer.md
│   │   ├── security-reviewer.md
│   │   ├── accessibility-reviewer.md
│   │   ├── design-pattern-reviewer.md
│   │   └── testability-reviewer.md
│   └── general/
│       ├── progressive-enhancer.md
│       ├── document-reviewer.md
│       └── subagent-reviewer.md
│
├── commands/              # Command definitions (8 active)
│   ├── code.md           # TDD/RGRC implementation
│   ├── fix.md            # Quick bug fixes
│   ├── hotfix.md         # Emergency production fixes
│   ├── research.md       # Investigation without implementation
│   ├── review.md         # Code review orchestration
│   ├── test.md           # Comprehensive testing
│   ├── think.md          # Planning & SOW creation
│   └── gemini/
│       └── search.md     # Google search via Gemini
│
├── rules/                 # Development principles (7 files)
│   ├── core/
│   │   └── AI_OPERATION_PRINCIPLES.md
│   ├── commands/
│   │   ├── COMMAND_SELECTION.md
│   │   └── STANDARD_WORKFLOWS.md
│   ├── development/
│   │   ├── PROGRESSIVE_ENHANCEMENT.md
│   │   ├── READABLE_CODE.md
│   │   └── CONTAINER_PRESENTATIONAL.md
│   └── reference/
│       └── PRE_TASK_CHECK.md
│
├── ja/                    # Japanese translations
│   ├── CLAUDE.md
│   ├── docs/
│   │   ├── AGENT_SUMMARY.md
│   │   ├── AGENT_MAP.md
│   │   └── COMMANDS.md
│   ├── agents/
│   ├── commands/
│   └── rules/
│
└── workspace/            # Working files
    └── sow/             # SOW documents
```

## 🤖 Agent System (14 Agents)

### Agent Categories

#### Orchestrators (1)

- **review-orchestrator** [opus/indigo] - Master orchestrator for code reviews

#### Frontend Specialists (9)

- **readability-reviewer** [sonnet/cyan] - Code clarity and maintainability
- **structure-reviewer** [sonnet/magenta] - Code organization and patterns
- **root-cause-reviewer** [opus/red] - Deep problem analysis
- **type-safety-reviewer** [sonnet/cyan] - TypeScript type validation
- **performance-reviewer** [sonnet/orange] - Performance optimization
- **security-reviewer** [sonnet/yellow] - Security vulnerability detection
- **accessibility-reviewer** [sonnet/pink] - WCAG compliance
- **design-pattern-reviewer** [sonnet/purple] - React pattern validation
- **testability-reviewer** [sonnet/green] - Test coverage and quality

#### General Purpose (3)

- **progressive-enhancer** [sonnet/lime] - Progressive enhancement approach
- **document-reviewer** [sonnet/brown] - Documentation quality
- **subagent-reviewer** [opus/gray] - Agent definition validation

### Model Selection Strategy

| Model | Use Case | Agents |
|-------|----------|--------|
| **opus** | Complex reasoning, orchestration | review-orchestrator, root-cause-reviewer, subagent-reviewer |
| **sonnet** | Pattern recognition, validation | All other reviewers (11 agents) |

### Agent Execution Phases

```text
Phase 1: Foundation (30s timeout)
├── structure-reviewer
├── readability-reviewer
├── root-cause-reviewer
└── progressive-enhancer

Phase 2: Quality (45s timeout)
├── type-safety-reviewer
├── design-pattern-reviewer
├── testability-reviewer
└── document-reviewer (conditional: .md files)

Phase 3: Production (60s timeout)
├── performance-reviewer
├── security-reviewer
└── accessibility-reviewer
```

## 🎯 Command System (8 Commands)

### Command Categories

#### Core Development (5)

| Command | Purpose | Workflow Position |
|---------|---------|------------------|
| `/think` | Planning & SOW creation | Start |
| `/research` | Investigation without implementation | Analysis |
| `/code` | TDD/RGRC implementation | Development |
| `/test` | Comprehensive testing | Verification |
| `/review` | Code review via agents | Quality |

#### Quick Actions (2)

| Command | Purpose | Environment |
|---------|---------|-------------|
| `/fix` | Quick bug fixes | Development |
| `/hotfix` | Emergency production fixes | Production |

#### External Tools (1)

| Command | Purpose | Requirement |
|---------|---------|-------------|
| `/gemini:search` | Google search | Gemini CLI |

### Standard Workflows

```text
Feature Development:
/think → /research → /code → /test → /review

Bug Investigation:
/research → /fix → /test

Emergency Response:
/hotfix (standalone)

Code Quality Check:
/review (can be used anytime)
```

## 📚 Rule System (7 Files)

### Rule Categories

#### Core Rules (1)

- **AI_OPERATION_PRINCIPLES.md** - Top-level AI behavior principles

#### Command Rules (2)

- **COMMAND_SELECTION.md** - Dynamic command discovery and selection
- **STANDARD_WORKFLOWS.md** - Predefined workflow patterns

#### Development Patterns (3)

- **PROGRESSIVE_ENHANCEMENT.md** - CSS-first, build simple → enhance
- **READABLE_CODE.md** - Based on "The Art of Readable Code"
- **CONTAINER_PRESENTATIONAL.md** - React component separation pattern

#### Reference (1)

- **PRE_TASK_CHECK.md** - Task understanding and execution planning

### Rule Priority Hierarchy

```markdown
1. User Instructions (ultimate authority)
2. CLAUDE.md global configuration
3. AI_OPERATION_PRINCIPLES.md
4. Command-specific rules
5. Development pattern rules
```

## 🔄 Integration Points

### Agent-Command Integration

| Command | Agents Used | Conditional Logic |
|---------|-------------|------------------|
| `/review` | All 11 reviewers | document-reviewer if .md files present |
| `/code` | None directly | May trigger review suggestion |
| `/test` | None directly | May trigger performance-reviewer |

### Rule-Command Integration

| Rule | Commands Affected | Integration Type |
|------|------------------|-----------------|
| PRE_TASK_CHECK | All commands | Understanding verification |
| PROGRESSIVE_ENHANCEMENT | `/code`, `/fix` | Implementation approach |
| READABLE_CODE | `/code`, `/review` | Code quality standards |
| CONTAINER_PRESENTATIONAL | `/code` | Component structure |

### Language Processing

```markdown
Input: Japanese (from user)
     ↓
Internal: English (AI processing)
     ↓
Templates: English (with translation notes)
     ↓
Output: Japanese (to user)
```

## 🔧 Configuration Files

### settings.json

- Tool permissions
- Command shortcuts
- Agent preferences
- File operation safety (rm disabled)

### CLAUDE.md

- Priority rules (P1: Language, P2: Development, P3: Safety)
- Global instructions
- Override behaviors

### Workspace Structure

```text
workspace/
└── sow/
    └── [timestamp]-[task].md  # SOW documents from /think
```

## 📊 System Metrics

### Performance Targets

- Agent timeout: 30-60s per phase
- Total review time: <180s
- Command response: <5s
- File operations: Immediate

### Coverage

- **Languages**: TypeScript, React, JavaScript, CSS
- **Standards**: WCAG 2.1, OWASP Top 10
- **Patterns**: SOLID, DRY, TDD/RGRC
- **Frameworks**: React, Next.js, Node.js

## 🚀 Extension Points

### Adding New Agents

1. Create agent file in appropriate directory
2. Add YAML frontmatter (name, description, model, tools, color)
3. Assign unique color
4. Update review-orchestrator.md
5. Update command mappings
6. Document in docs/AGENT_USAGE.md

### Adding New Commands

1. Create command file in commands/
2. Add workflow integration
3. Update docs/COMMANDS.md
4. Create Japanese translation
5. Test command selection logic

### Adding New Rules

1. Create rule file in appropriate subdirectory
2. Define priority level
3. Update integration points
4. Document in this file

## 📈 Evolution Strategy

### Current State (v2.0)

- 14 agents (3 orchestrator/general, 11 specialized)
- 8 active commands
- 7 rule files
- Full Japanese language support

### Future Considerations

- Backend agent integration (API, database reviews)
- CI/CD pipeline agents
- Automated fix generation
- Multi-language support beyond Japanese

## 🔐 Safety Features

### File Operations

- `rm` command disabled
- Files moved to ~/.Trash/ instead
- Confirmation required for all modifications
- PRE_TASK_CHECK for understanding

### Execution Control

- User confirmation at each step
- Timeout limits for agents
- Rollback planning for hotfixes
- Explicit execution plans

## 📖 Documentation

### English Documentation

- README.md - Quick start
- docs/ARCHITECTURE.md - This file
- docs/COMMANDS.md - Command reference
- docs/PROJECT_SETUP.md - Setup guide
- CLAUDE.md - Configuration

### Japanese Documentation

- ja/CLAUDE.md - Configuration
- ja/docs/COMMANDS.md - Command reference
- ja/docs/AGENT_SUMMARY.md - Agent overview
- ja/docs/AGENT_MAP.md - Agent structure

## 🎓 Key Concepts

### Progressive Enhancement

Default philosophy: Build simple → enhance progressively

- CSS-first solutions
- Root cause over quick fixes
- Elegance through simplicity

### Code Readability

Based on "The Art of Readable Code":

- Minimize understanding time
- Clear naming and intent
- Simple and direct solutions

### Container/Presentational Pattern

React component separation:

- Containers: Logic & data
- Presentational: UI only
- Props-only components
- Maximum reusability

---

*Last Updated: 2025-08-06*
*Version: 2.0*
*Author: thkt*
