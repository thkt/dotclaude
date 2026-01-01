# Claude Commands Reference

Custom commands for systematic software development support.

## Available Commands

### Core Development Commands

| Command | Purpose | Environment |
| --- | --- | --- |
| `/think` | Verifiable SOW creation with validation | Analysis phase |
| `/research` | Investigation without implementation | Understanding phase |
| `/code` | TDD/RGRC implementation | Development phase |
| `/test` | Comprehensive testing | Verification phase |
| `/audit` | Code review via agents | Quality phase |
| `/polish` | Remove AI-generated slop from code | Quality phase |
| `/sow` | Display SOW progress | Monitoring phase |
| `/validate` | Validate SOW conformance | Verification phase |
| `/plans` | List and view planning documents (SOW/Spec) | Monitoring phase |
| `/spec` | Generate Spec only (implementation details) | Analysis phase |

### Quick Action Commands

| Command | Purpose | Environment | Combines |
| --- | --- | --- | --- |
| `/fix` | Quick bug fixes | Development | think → code → test |

### External Review Commands

| Command | Purpose | Environment |
| --- | --- | --- |
| `/rabbit` | CodeRabbit AI review for external perspective | Quality check |

### Automation Commands (SlashCommand Tool v1.0.123+)

| Command | Purpose | Environment | Uses SlashCommand |
| --- | --- | --- | --- |
| `/auto-test` | Auto test runner with conditional fix | Development | Yes - invokes `/fix` on failure |
| `/full-cycle` | Complete development cycle automation | Meta-command | Yes - chains multiple commands |

### Browser Automation Commands

| Command | Purpose | Environment |
| --- | --- | --- |
| `/workflow:create [name]` | Create reusable browser automation workflows | E2E Testing |
| `/workflow:export <name>` | Export Markdown workflow to Playwright test code | E2E Testing |

### Documentation Commands

| Command | Purpose | Environment |
| --- | --- | --- |
| `/adr [title]` | Create Architecture Decision Record in MADR format | Documentation |
| `/rulify <number>` | Generate project rule from ADR | Documentation |
| `/docs:architecture` | Generate architecture overview documentation | Documentation |
| `/docs:api` | Generate API specification documentation | Documentation |
| `/docs:setup` | Generate environment setup guide | Documentation |
| `/docs:domain` | Generate domain understanding documentation | Documentation |

### Git Operations Commands

| Command | Purpose | Environment |
| --- | --- | --- |
| `/branch` | Analyze changes and suggest branch names | Git |
| `/commit` | Generate Conventional Commits messages | Git |
| `/pr` | Generate comprehensive PR descriptions | Git |
| `/issue` | Generate structured GitHub Issues | Git |

## Dry-run Impact Simulation

**Automatic safety feature** integrated into PRE_TASK_CHECK workflow.

When confirming file operations or complex changes, Claude Code automatically displays a brief impact simulation before execution:

- **Files to modify**: Lists 2-5 key files
- **Affected components**: Shows impacted modules
- **Risk level**: Low / Medium / High
- **Important notes**: Highlights areas requiring attention

This "Dry-run" approach previews changes without execution, helping you:

- Understand the scope of changes
- Identify potential risks
- Make informed decisions before proceeding

**Workflow integration**:

```txt
1. Understanding Check
2. User Confirmation (Y) ← STOP POINT
3. Impact Simulation ← NEW (auto-displayed for risky changes)
4. Execution Plan
5. Plan Confirmation (Y) ← STOP POINT
6. Execute
```

## Standard Workflows

### Feature Development

Choose based on complexity:

```txt
[Complex - Architecture decisions needed]
(/research →) Plan Mode → /think → /code → /test → /audit → /validate

[Standard - Clear requirements]
/think → /code → /test → /audit → /validate

[Simple - Small feature]
/code → /test
```

**Plan Mode**: Press `Shift+Tab` to enter. Explore codebase, design approach, get user approval before proceeding.

**Note**: `/research` is optional before Plan Mode when deep investigation with persistent documentation is needed.

### Agent-Enhanced Workflow

`/research` and `/think` use both built-in and feature-dev agents:

```mermaid
flowchart LR
    subgraph R["/research"]
        direction TB
        R1[Explore]
        R2[code-explorer]
    end

    subgraph T["/think"]
        direction TB
        T1[Plan Opus]
        T2[code-architect]
    end

    R --> T --> C["/code"] --> TE["/test"] --> A["/audit"] --> V["/validate"]
```

**What this provides**:

- `/research`:
  - Step 1: Explore agent for quick overview
  - Step 2: code-explorer agents (2-3 parallel) for deep tracing
- `/think`:
  - Step 1a: Plan agent (Opus) for recommended approach
  - Step 1b: code-architect agents (3 parallel) for alternatives

### Progress Monitoring

```txt
/sow (check progress anytime)
```

### Bug Investigation & Fix

```txt
/research → /fix
```

### Investigation Only (No Implementation)

```txt
/research (findings saved to .claude/workspace/research/)
```

### Automated Workflows (SlashCommand Tool)

```txt
/auto-test        # Automatic test → fix cycle
/full-cycle       # Complete automated development flow
```

## Command Details

For detailed information about each command, see the individual command files in `~/.claude/commands/`.

**Quick reference:**

- `/think`, `/code`, `/fix` → Core development workflow
- `/research`, `/audit`, `/validate` → Investigation and quality
- `/branch`, `/commit`, `/pr`, `/issue` → Git operations
- `/adr`, `/rulify` → Architecture documentation

## Quick Start

### New Feature (Enhanced Flow)

```bash
/research "Feature description"  # Understand codebase with agents
/think                           # Create verifiable SOW with architecture options
/code                            # Implement with TDD
/test                            # Verify tests pass
/plans                           # Check progress
/validate                        # Validate conformance
```

### Bug Fix

```bash
/research "Bug symptoms"
/fix       # Quick targeted fix
```

## Command Selection Guide

### Use `/fix` when

- Issue is small and well-defined
- Working in development environment
- Rapid iteration needed

### Use Plan Mode when

- Complex feature requiring architecture decisions
- Multiple valid approaches exist
- Need to explore codebase before planning
- Want user approval on approach before implementation

**How to enter**: Press `Shift+Tab` or type "enter plan mode"

### Use `/research` when

- Need deep investigation with persistent documentation
- Exploring solution options without implementation
- Want findings saved for future reference
- Can combine with Plan Mode: `/research` → Plan Mode

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

### Use `/rabbit` when

- Want external AI perspective (independent from internal agents)
- Need fast CLI-based review (10-30 seconds)
- Looking for quick sanity check before commit/PR
- Supplementing `/audit` with second opinion

### Use `/polish` when

- After `/audit` to auto-fix AI-generated slop
- Before `/commit` to ensure clean code
- Removing unnecessary comments, defensive code, over-engineering
- Aligning code style with existing codebase

### Use `/adr` when

- Making important architecture decisions
- Need to document technical choices
- Want to record decision rationale
- Team needs visibility into decisions

### Use `/rulify` when

- ADR decision should affect AI behavior
- Want to enforce project-specific patterns
- Need AI to follow architecture decisions automatically

### Use `/workflow:create` when

- Need to automate repetitive browser interactions
- Creating E2E test scenarios
- Setting up monitoring for critical user flows
- Building data collection workflows
- Want to document complex manual testing procedures
- Need reproducible browser automation

### Use `/workflow:export` when

- Have a stable workflow from `/workflow:create`
- Want to run browser tests in CI/CD
- Need Playwright test code for regression testing
- Converting exploratory testing to automated tests

## Commands, Agents, Skills Architecture

Claude Code uses a three-layer structure:

| Layer | Role | Examples |
| --- | --- | --- |
| **Commands** | User-invoked workflows (`/command`) | `/code`, `/audit`, `/adr` |
| **Agents** | Specialized analysis/review | `performance-reviewer`, `audit-orchestrator` |
| **Skills** | Knowledge base, auto-triggered guides | `applying-code-principles`, `generating-tdd-tests` |

## Configuration

### Language Settings

- Command files: English
- Output to user: Japanese (per CLAUDE.md)

### Related Files

- `~/.claude/CLAUDE.md` - Global settings and rules
- `~/.claude/rules/` - Development principles
- `~/.claude/settings.json` - Tool permissions
