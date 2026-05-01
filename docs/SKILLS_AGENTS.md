# Skills & Agents Design

Design intent and usage guidelines for Skills and Agents.

📌 **[日本語版](../.ja/docs/SKILLS_AGENTS.md)**

## Core Concept

```mermaid
graph LR
    subgraph Skills["Skills (Knowledge)"]
        S1[use-workflow-tdd-cycle]
        S2[use-context-reviewer-security]
    end

    subgraph Agents["Agents (Execution)"]
        A1[generator-test]
        A2[reviewer-security]
        A3[team-integration]
    end

    subgraph Trigger["Invocation"]
        CMD[Command] --> S1
        CMD --> A1
        CTX[Context] -.-> S2
        TASK[Task Tool] --> A2
    end
```

## Skills vs Agents

| Aspect         | Skills                         | Agents        |
| -------------- | ------------------------------ | ------------- |
| **Role**       | Knowledge base (What/How)      | Executor (Do) |
| **Invocation** | Auto-load or command reference | Via Task tool |
| **Context**    | Main or fork                   | Always fork   |
| **State**      | Read-only                      | Mutable       |
| **Output**     | Information                    | Artifacts     |

## Skills

### Purpose

Skills are "knowledge modules" that provide domain-specific knowledge when AI executes tasks.

### Categories

| Category       | Skills                                                                                         | Purpose                          |
| -------------- | ---------------------------------------------------------------------------------------------- | -------------------------------- |
| Workflow       | use-workflow-code, use-workflow-tdd-cycle, use-workflow-pageshot, use-workflow-spec-validation | Multi-phase workflow definitions |
| Context        | use-context-reviewer-\*, use-context-root-cause-analysis                                       | Domain knowledge for agents      |
| CLI wrapper    | use-cli-yomu, use-cli-recall, use-cli-scout, use-cli-gcloud, use-cli-heptabase                 | CLI tool integration             |
| User-invocable | think, research, code, audit, polish, feature, fix, adr, swarm, etc.                           | Slash command entry points       |

### Loading Mechanism

```mermaid
flowchart TD
    A[User Input] --> B{Trigger Match?}
    B -->|Keyword| C[Auto-load Skill]
    B -->|Flag| D[Conditional Load]
    B -->|Command| E[Reference in Command]
    C --> F[Skill Context Added]
    D --> F
    E --> F
```

**Trigger Examples:**

| Trigger                 | Skill Loaded                    |
| ----------------------- | ------------------------------- |
| "TDD", "test-driven"    | use-workflow-tdd-cycle          |
| "OWASP", "セキュリティ" | use-context-reviewer-security   |
| "any", "type safety"    | use-context-reviewer-strictness |
| "5 Whys", "root cause"  | use-context-root-cause-analysis |

### File Structure

```text
skills/[skill-name]/
├── SKILL.md        # Required: YAML front matter + knowledge body
└── references/     # Optional: detailed guides
    └── *.md
```

### YAML Front Matter

```yaml
---
name: use-workflow-tdd-cycle
description: TDD with RGRC cycle and Baby Steps.
when_to_use: TDD, テスト駆動, Red-Green-Refactor, Baby Steps
allowed-tools: Read Write Edit Grep Glob
context: fork # fork or inline
user-invocable: false # Whether invocable as slash command
---
```

## Agents

### Purpose

Agents are "specialized executors" spawned via the Task tool to autonomously
perform specific analysis or generation tasks.

### Categories

```text
agents/
├── architects/     # Design (architect-feature)
├── critics/        # Critical verification (critic-audit, critic-design, critic-evidence)
├── enhancers/      # Code improvement (enhancer-code, enhancer-evidence)
├── evaluators/     # Quality evaluation (evaluator-test)
├── explorers/      # Exploration (explorer-feature)
├── generators/     # Generation (generator-test, generator-e2e)
├── resolvers/      # Problem resolution (resolver-build)
├── reviewers/      # Review (20 specialized reviewers)
└── teams/          # Team integration (team-integration, team-qa, team-implementation)
```

### Reviewer Agents (20 types)

| Agent                  | Focus                              |
| ---------------------- | ---------------------------------- |
| reviewer-accessibility | WCAG 2.2 conformance               |
| reviewer-causation     | 5 Whys root cause analysis         |
| reviewer-coverage      | Test coverage quality              |
| reviewer-design        | React design patterns              |
| reviewer-document      | Documentation quality              |
| reviewer-duplication   | Cross-file DRY analysis            |
| reviewer-efficiency    | Algorithmic cost, hot paths        |
| reviewer-encapsulation | Type design, invariant enforcement |
| reviewer-operations    | Error boundaries, logging          |
| reviewer-performance   | React rendering, bundle size       |
| reviewer-progressive   | CSS-first, JS reduction            |
| reviewer-prompt        | LLM prompt definition quality      |
| reviewer-readability   | Code structure, readability        |
| reviewer-resilience    | Resilience weakness analysis       |
| reviewer-reuse         | Existing code reuse opportunities  |
| reviewer-security      | OWASP Top 10                       |
| reviewer-silence       | Silent failure detection           |
| reviewer-spec          | SOW/Spec Ready/NotReady gate       |
| reviewer-strictness    | TypeScript type safety             |
| reviewer-testability   | Testable code design               |

### Team Agents

| Agent               | Focus                                                           |
| ------------------- | --------------------------------------------------------------- |
| team-integration    | Reconcile challenge/verification results + root cause synthesis |
| team-qa             | Non-blocking QA participant via peer DM                         |
| team-implementation | RGRC cycle implementation for assigned files and tests          |

### Invocation via Task Tool

```markdown
Task tool with:

- subagent_type: "reviewer-security"
- prompt: "Review the authentication module for vulnerabilities"
- model: "sonnet" (optional)
```

## Design Decisions

### Why Separate Skills and Agents?

| Reason                     | Explanation                                             |
| -------------------------- | ------------------------------------------------------- |
| **Separation of Concerns** | Separate knowledge (Skills) from execution (Agents)     |
| **Context Management**     | Agents run in fork, don't pollute main context          |
| **Reusability**            | Skills can be referenced from multiple commands         |
| **Specialization**         | Agents specialize in specific tasks for deeper analysis |

### Reference Depth Rule

```text
SKILL.md → reference.md (1 level only)
```

Reason: Claude truncates deep nesting with `head -100`, causing information loss.

## Related

- [COMMANDS.md](./COMMANDS.md) - Command design
- [SKILLS](../rules/conventions/SKILLS.md) - Skill definition format
- [SUBAGENT](../rules/conventions/SUBAGENT.md) - Sub-agent definition format
