# CLAUDE.md

## Priority Rules (FOLLOW IN ORDER)

### [P0] CRITICAL - Core AI Operation Rules

**ALWAYS ACTIVE** - Applied on every user message, supersedes all other rules

Core principles: [@~/.claude/rules/core/AI_OPERATION_PRINCIPLES.md](./rules/core/AI_OPERATION_PRINCIPLES.md)
Task verification: [@~/.claude/rules/core/PRE_TASK_CHECK_COMPACT.md](./rules/core/PRE_TASK_CHECK_COMPACT.md) (injected via hook)

### [P1] REQUIRED - Language Settings

**ALWAYS ENFORCE** - Output must be Japanese

- Input: Japanese from user
- Process: English internally
- Output: **JAPANESE ONLY** - Strictly prohibit English output
- Translate all templates, messages, labels to Japanese
- Critical: Maintain Japanese output even when rule files are English

### [P2] DEFAULT - Development Approach

**ALWAYS APPLY** - Core principles for all development

Essential principles (SOLID, DRY, Occam's Razor, Miller's Law, YAGNI) available via `applying-code-principles` skill.

**Quick Decision Questions** (apply before every implementation):

- "Is there a simpler way?" (Occam's Razor)
- "Understandable in <1 min?" (Miller's Law)
- "Duplicating knowledge?" (DRY)
- "Needed now?" (YAGNI)

Skills auto-activate on relevant keywords. Full details: [@~/.claude/skills/applying-code-principles/SKILL.md](./skills/applying-code-principles/SKILL.md)

### [P3] CONTEXTUAL - Just-in-Time References

**APPLY AS NEEDED** - Load based on task type

- Code tasks: Available via `enhancing-progressively` skill
- React/UI: Available via `applying-frontend-patterns` skill
- Component design: [Container/Presentational](./rules/development/CONTAINER_PRESENTATIONAL.md)
- Large-scale: [Law of Demeter](./rules/development/LAW_OF_DEMETER.md)
- Testing: Available via `generating-tdd-tests` skill

**Note**: Skills are automatically activated based on context and keywords.

Complete guide: [PRINCIPLES_GUIDE.md](./rules/PRINCIPLES_GUIDE.md)

### [P4] OPTIONAL - File Deletion Behavior

- **NEVER use rm command**: rm is disabled in settings.json
- **NEVER use git rm**: Also deletes files permanently
- **Always use Trash**: Move files to ~/.Trash/ instead of permanent deletion
- **Command**: Use `mv [file] ~/.Trash/` then `git add -A` to record deletion
- **Rationale**: Safety - enables recovery of accidentally deleted files

## Work Completion Guidelines

**Critical**: Verify all work meets these specific criteria before reporting completion:

- **Test Creation**: After creating tests, execute ALL of the following checks:
  1. Run project's test command (discover from package.json/pubspec.yaml/etc.)
  2. Verify exit code is 0 (all tests passed)
  3. Common patterns: `npm test`, `yarn test`, `flutter test`, `vitest`, etc.

- **Code Implementation**: After writing code, execute ALL of the following checks:
  1. Build/compile succeeds (exit code 0)
  2. Linter passes with 0 errors (warnings acceptable if <5)
  3. All related tests pass (0 failures)
  4. Manual smoke test for critical paths (document steps taken)

If any check fails:

- For build errors: Fix immediately, do not proceed
- For linter errors: Fix all errors, address warnings if time permits
- For test failures: Fix root cause, do not disable tests
- For smoke test failures: Debug and re-test until green

- **Command Discovery** (execute in this priority order):
  1. **First**: Read README.md, check "Scripts" or "Commands" section
  2. **Second**: Inspect package manager config (package.json > scripts, pubspec.yaml > scripts)
  3. **Third**: Search for common test files (*.test.*, *.spec.*, test/, spec/)
  4. **Last resort**: If steps 1-3 yield no results, ask user with format:
     "Could not find test command. Please specify the command to run tests (e.g., npm test, yarn test)."

- **STRICTLY PROHIBIT completion reporting** with:
  - Failing tests (unless explicitly creating tests for unimplemented features)
  - Compilation/build errors
  - Unresolved errors from previous attempts

### Commands Reference

- Command list: [@~/.claude/docs/COMMANDS.md](./docs/COMMANDS.md)

### Documentation Guidelines

- Documentation rules: [@~/.claude/rules/guidelines/DOCUMENTATION_RULES.md](./rules/guidelines/DOCUMENTATION_RULES.md)
- Ensure absolute consistency across all documentation
