# Skills

Skills provide knowledge bases, guides, and automation workflows for Claude Code.

## Skill Inventory (25 Skills)

| Category          | Skill                        | Description                   | Used by               |
| ----------------- | ---------------------------- | ----------------------------- | --------------------- |
| **TDD/Testing**   | `generating-tdd-tests`       | TDD/RGRC cycle, test design   | /code, /fix           |
|                   | `managing-testing`           | Test workflow orchestration   | /e2e                  |
| **Code Quality**  | `applying-code-principles`   | SOLID, DRY, YAGNI principles  | /code                 |
|                   | `applying-frontend-patterns` | React/UI patterns             | /code --frontend      |
|                   | `integrating-storybook`      | Storybook development         | /code --storybook     |
|                   | `enhancing-progressively`    | CSS-first approach            | /code                 |
| **Review**        | `reviewing-security`         | Security review (OWASP)       | /audit                |
|                   | `reviewing-readability`      | Readability review            | /audit                |
|                   | `reviewing-type-safety`      | Type safety (TypeScript)      | /audit                |
|                   | `reviewing-silent-failures`  | Silent failure detection      | /audit                |
|                   | `reviewing-testability`      | Testability review            | /audit                |
|                   | `analyzing-root-causes`      | Root cause analysis (5 Whys)  | /audit                |
|                   | `optimizing-performance`     | Performance optimization      | /audit                |
| **Documentation** | `creating-adrs`              | ADR creation (MADR)           | /adr, /rulify         |
|                   | `formatting-audits`          | Document formatting           | /sow, /spec           |
|                   | `documenting-architecture`   | Architecture documentation    | skill                 |
|                   | `documenting-apis`           | API specification             | skill                 |
|                   | `documenting-domains`        | Domain understanding          | skill                 |
|                   | `setting-up-docs`            | Environment setup guide       | skill                 |
|                   | `managing-documentation`     | Documentation workflows       | /adr, /rulify         |
| **Automation**    | `automating-browser`         | Browser control (demos, GIFs) | /e2e                  |
|                   | `utilizing-cli-tools`        | CLI tools (gh, git)           | /commit, /pr, /branch |
| **Workflows**     | `orchestrating-workflows`    | Command workflow patterns     | /code, /fix, /audit   |
|                   | `managing-planning`          | SOW/Spec generation           | /think, /sow, /spec   |
|                   | `managing-git-workflows`     | Git operation patterns        | /commit, /pr, /branch |

## Naming Convention

**Format**: gerund form (verb-ing)

| Pattern | Examples                                                  |
| ------- | --------------------------------------------------------- |
| Good    | `generating-*`, `applying-*`, `creating-*`, `reviewing-*` |
| Avoid   | `helper`, `utils`, `tools` (too vague)                    |

## Creating New Skills

See: [SKILL_FORMAT_GUIDE.md](./SKILL_FORMAT_GUIDE.md)

## Related

- [WORKFLOW_GUIDE.md](../rules/workflows/WORKFLOW_GUIDE.md) - Commands reference
