# Commands Design

Command design and relationships.

📌 **[日本語版](../.ja/docs/COMMANDS.md)**

## Architecture

```mermaid
graph TD
    subgraph User["User Interface"]
        CMD["/command"]
    end

    subgraph Orchestration["Command Layer"]
        CMD --> SKILL[Skills]
        CMD --> AGENT[Agents]
        CMD --> PLUGIN[External Plugins]
    end

    subgraph Execution["Execution Layer"]
        SKILL --> FORK[Fork Context]
        AGENT --> TASK[Task Tool]
    end
```

## Commands & Workflows

See [WORKFLOWS](../rules/workflows/WORKFLOWS.md) for command
listing and selection guide.

## Design Principles

### 1. Thin Wrapper Pattern

Commands are orchestrators, no implementation details.

```markdown
# Good: /code

- Skills: use-workflow-code (RGRC definition)
- Agents: generator-test (test generation)
- Plugins: ralph-loop (automatic iteration)

# Bad

- Hardcoding TDD steps inside the command
```

### 2. Conditional Context Loading

Load skills only when needed.

```markdown
/code (no flags) → no additional skills
```

### 3. Graceful Degradation

Commands work without external plugins:

```markdown
ralph-loop present → automatic RGRC iteration ralph-loop absent → manual
confirmation mode (same functionality)
```

## Command → Skill/Agent Mapping

| Command     | Skills Used                                   | Agents Used                                                           |
| ----------- | --------------------------------------------- | --------------------------------------------------------------------- |
| `/think`    | -                                             | -                                                                     |
| `/code`     | use-workflow-code, use-workflow-tdd-cycle     | generator-test                                                        |
| `/audit`    | -                                             | tier-based reviewer agents (3 or file-routed from 17)                 |
| `/fix`      | use-context-root-cause-analysis               | generator-test, resolver-build                                  |
| `/polish`   | -                                             | enhancer-code                                                       |
| `/feature`  | use-workflow-code                       | explorer-feature, architect-feature, generator-test, team-implementation |
| `/swarm`    | use-workflow-code                       | team-qa, team-implementation                                         |
| `/glossary` | -                                             | -                                                                     |

## File Structure

```text
skills/
├── code/SKILL.md      # YAML front matter + execution steps
├── fix/SKILL.md
├── think/SKILL.md
└── ...
```

### Front Matter Fields

| Field           | Required | Purpose                                    |
| --------------- | -------- | ------------------------------------------ |
| `description`   | ✓        | Command description (Skill picker display) |
| `allowed-tools` | ✓        | Permitted tools                            |
| `model`         | -        | Model to use (opus/sonnet/haiku)           |
| `argument-hint` | -        | Hint shown for argument input              |

## Related

- [SKILLS_AGENTS.md](./SKILLS_AGENTS.md) — Skills and agents reference
- [WORKFLOWS](../rules/workflows/WORKFLOWS.md) — Workflow
  selection guide
