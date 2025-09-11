# Claude Commands Reference

Custom commands for systematic software development support.

## 🎯 Available Commands

### Core Development Commands

| Command | Purpose | Environment |
|---------|---------|-------------|
| `/think` | Verifiable SOW creation with validation | Analysis phase |
| `/research` | Investigation without implementation | Understanding phase |
| `/code` | TDD/RGRC implementation | Development phase |
| `/test` | Comprehensive testing | Verification phase |
| `/review` | Code review via agents | Quality phase |
| `/sow` | Display SOW progress | Monitoring phase |
| `/validate` | Validate SOW conformance | Verification phase |

### Quick Action Commands

| Command | Purpose | Environment | Combines |
|---------|---------|-------------|----------|
| `/fix` | Quick bug fixes | 🔧 Development | think → code → test |
| `/hotfix` | Emergency production fixes | 🚨 Production | Minimal process |

### External Tool Commands

| Command | Purpose | Requires |
|---------|---------|----------|
| `/gemini:search` | Google search via Gemini | Gemini CLI |

## 🔄 Standard Workflows

### Feature Development (Enhanced)

```txt
/research → /think → /code → /test → /review → /validate
```

### Progress Monitoring

```txt
/sow (check progress anytime)
```

### Bug Investigation & Fix

```txt
/research → /fix
```

### Emergency Response

```txt
/hotfix (standalone for critical issues)
```

## 💡 Command Details

### /think - Verifiable SOW Generator

- Creates verifiable Statement of Work with dynamic validation
- Defines acceptance criteria with TodoWrite integration
- Sets validation points and success metrics
- Saves to `.claude/workspace/sow/` with auto-update capability
- Enables progress tracking via `/sow` and `/validate`

### /research - Investigation

- Explores without implementation
- Uses Task agent for complex searches
- Documents findings persistently
- Efficient parallel search execution

### /code - Implementation

- Follows TDD/RGRC cycle (Red-Green-Refactor-Commit)
- Applies SOLID principles
- Manual commit execution
- Quality checks via hooks

### /test - Verification

- Discovers and runs test commands
- Tracks progress with TodoWrite
- Handles unit, integration, E2E tests
- Browser testing for UI changes

### /fix - Quick Fixes

- Streamlined mini-workflow
- For small, well-understood issues
- Development environment only
- Rapid iteration cycle

### /hotfix - Emergency Fixes

- Production critical issues only
- 5-min triage, 15-min fix, 10-min test
- Minimal process overhead
- Rollback plan required

### /review - Code Review

- Orchestrates specialized review agents
- Multiple review dimensions (security, performance, a11y)
- Actionable recommendations
- Priority-based issue reporting

### /sow - Progress Viewer

- Displays current SOW progress status
- Shows acceptance criteria completion
- Tracks key metrics and build status
- Read-only, no options needed
- Quick status check for active work

### /validate - SOW Validator

- Validates implementation against SOW
- L2 (practical) validation level
- Checks acceptance criteria, coverage, performance
- Pass/fail logic with clear scoring
- Identifies missing features and issues

### /gemini:search - Google Search

- Technical research via Gemini CLI
- Best practices discovery
- Troubleshooting assistance
- Requires Gemini CLI setup

## 📂 Workspace Structure

```txt
.claude/
├── CLAUDE.md          # Global rules
├── docs/
│   └── COMMANDS.md    # This file
├── commands/          # Command definitions
│   ├── code.md
│   ├── fix.md
│   ├── hotfix.md
│   ├── research.md
│   ├── review.md
│   ├── test.md
│   ├── think.md
│   ├── sow.md
│   ├── validate.md
│   └── gemini/
│       └── search.md
├── ja/               # Japanese versions
│   └── commands/
└── workspace/        # Working files
    └── sow/         # SOW documents
```

## 🚀 Quick Start

### New Feature (Enhanced Flow)

```bash
/think "Feature description"  # Create verifiable SOW
/research                      # Understand codebase
/code                         # Implement with TDD
/test                         # Verify tests pass
/sow                          # Check progress
/validate                     # Validate conformance
```

### Bug Fix

```bash
/research "Bug symptoms"
/fix       # Quick targeted fix
```

### Production Emergency

```bash
/hotfix "Critical issue description"
```

## 📋 Command Selection Guide

### Use `/fix` when

- Issue is small and well-defined
- Working in development environment
- Can wait for normal deployment

### Use `/hotfix` when

- Production is affected
- Immediate deployment needed
- Security vulnerability discovered

### Use `/research` when

- Need to understand existing code
- Exploring solution options
- No implementation planned yet

### Use `/think` when

- Starting new feature
- Need structured planning with validation
- Creating verifiable SOW document
- Want automated progress tracking

### Use `/sow` when

- Need to check implementation progress
- Want to see acceptance criteria status
- Monitoring active development work

### Use `/validate` when

- Ready to verify implementation
- Need conformance check against SOW
- Want to identify missing requirements

## 🔧 Configuration

### Language Settings

- Command files: English
- Output to user: Japanese (per CLAUDE.md)

### Related Files

- `~/.claude/CLAUDE.md` - Global settings and rules
- `~/.claude/rules/` - Development principles
- `~/.claude/settings.json` - Tool permissions

## 📅 Updates

2025-09-11 - Enhanced with Spec Kit integration

- Added `/sow` for progress monitoring
- Added `/validate` for SOW conformance
- Enhanced `/think` with verifiable SOW generation
- Updated workflows with validation steps

2025-08-06 - Current command set

- Active commands maintained
- Deleted obsolete commands
- Simplified workflows
