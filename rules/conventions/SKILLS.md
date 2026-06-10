---
paths:
  - ".claude/skills/**"
---

# Skill Conventions

Conventions for skill files under `.claude/skills/`.

## YAML Frontmatter

```yaml
---
name: skill-name # lowercase-hyphens, ≤64 chars
description: Brief summary. # ≤1024 chars, third person
when_to_use: scenario, keyword1, キーワード # EN/JP trigger phrases
allowed-tools: Read Write # space-separated
agent: agent-name # Optional: links to agents/
context: fork # Optional: fork = sub-agent, inline = main
user-invocable: false # Optional: default true (false hides from / menu, for internal skills)
---
```

## Naming

Choose by category.

| user-invocable | Binding    | Pattern               | Examples                                        |
| -------------- | ---------- | --------------------- | ----------------------------------------------- |
| true           | -          | Short name            | commit, fix, audit                              |
| false          | CLI wrap   | `use-cli-<cli>`       | use-cli-recall, use-cli-scout                   |
| false          | Agent-only | `use-context-<agent>` | use-context-reviewer-security                   |
| false          | Workflow   | `use-workflow-<noun>` | use-workflow-code, use-workflow-spec-validation |
| any            | Avoid      | -                     | helper, utils, tools                            |

## Directory structure

```text
skill-name/
├── SKILL.md (required)
└── references/ (optional)
    └── detailed-guide.md
```

Claude reads SKILL.md first, references only when needed.

## Reference notation

Write reference paths inside SKILL.md, scripts/, templates/, references/ with bare `${CLAUDE_SKILL_DIR}` substitution.

| Form                                            | Use         | Reason                                                                                             |
| ----------------------------------------------- | ----------- | -------------------------------------------------------------------------------------------------- |
| `${CLAUDE_SKILL_DIR}/references/foo.md` (bare)  | Always      | Harness expands the variable to absolute path. Read tool resolves directly                         |
| `${CLAUDE_SKILL_DIR}/../<dir>/foo.md` (sibling) | Cross-skill | Harness expands the variable; Read normalizes the .. segment. Used for shared \_lib/ across skills |
| `[references/foo.md](references/foo.md)` (link) | Never       | Harness does not expand markdown links; AI infers relative path                                    |
| `` `${CLAUDE_SKILL_DIR}/references/foo.md` ``   | Avoid       | Harness behavior inside backticks is undocumented; safer to omit                                   |

## Argument variables

Skill input arguments expand at invocation time.

| Variable        | Returns                       | Example (args=`alpha beta gamma`) |
| --------------- | ----------------------------- | --------------------------------- |
| `$ARGUMENTS`    | full argument string          | `alpha beta gamma`                |
| `$ARGUMENTS[N]` | `split(' ')[N]` (0-indexed)   | `[0]`=`alpha`, `[1]`=`beta`       |
| `$N`            | shorthand for `$ARGUMENTS[N]` | `$0`=`alpha`, `$1`=`beta`         |

| Use case                     | Use             |
| ---------------------------- | --------------- |
| Capture multi-word free text | `$ARGUMENTS`    |
| Get first word explicitly    | `$ARGUMENTS[0]` |

## Size limits

| Rule            | Threshold | Action                      |
| --------------- | --------- | --------------------------- |
| SKILL.md body   | 200 lines | Split into reference files  |
| Reference files | 200 lines | Consider splitting by topic |

## Craft

Quality axes beyond the frontmatter and size rules above. A skill can satisfy every mechanical rule and still read poorly.

| Axis                        | Pass condition                                                                                      | Fail signal                                              |
| --------------------------- | --------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| Single responsibility       | One task per skill. A second unrelated trigger is a split signal                                    | description joins 2+ unrelated capabilities              |
| Description distinctiveness | Sentence 1 names the capability; an agent picks this over sibling skills from the description alone | Generic verbs (helps with, manages) that fit many skills |
| Imperative voice            | Body commands the agent directly                                                                    | Passive recital of what the skill does                   |
| Verifiable completion       | Steps end with checkable conditions and explicit stop points (Do not proceed until X)               | Done-state absent or stated as do it well                |
| Concrete calibration        | One Good/Bad pair, Yes/Not contrast, or numeric threshold per judgment                              | Rules stated abstractly with no example                  |
| Progressive disclosure      | SKILL.md stays thin; detail moves to references/                                                    | Inline dumps that belong in references/                  |
