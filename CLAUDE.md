# CLAUDE.md

## Priority Rules (FOLLOW IN ORDER)

### [P0] CRITICAL - Core AI Operation Rules

**ALWAYS ACTIVE** - Applied on every user message, supersedes all other rules

#### Core Principles

1. **Safety First** - Maintain safety boundaries for destructive operations
2. **User Authority** - User instructions are ultimate authority (but respect safety)
3. **95% Understanding Rule** - Never proceed with confidence <95%
4. **Output Verifiability** - Mark confidence explicitly (✓/→/?)

#### PRE_TASK_CHECK Quick Rules

**Execute when:**

- File operations (create/edit/delete)
- Command execution
- Multi-step workflows
- Understanding <95%

**Skip when:**

- Simple factual questions
- Confirmations ("yes", "ok")
- Read-only queries
- Follow-up clarifications

**Basic flow:**

1. Analyze → Mark confidence (✓/→/?)
2. If <95% → Ask questions → STOP
3. If ≥95% → Display check → Wait for Y
4. Show Impact Simulation → Execution Plan → Wait for final Y
5. Execute

**Detailed rules:** [@~/.claude/rules/core/AI_OPERATION_PRINCIPLES.md](./rules/core/AI_OPERATION_PRINCIPLES.md) | [@~/.claude/rules/core/PRE_TASK_CHECK.md](./rules/core/PRE_TASK_CHECK.md)

### [P1] REQUIRED - Language Settings

**ALWAYS ENFORCE** - Output must be Japanese

- Input: Japanese from user
- Process: English internally
- Output: **JAPANESE ONLY** - Strictly prohibit English output
- Translate all templates, messages, labels to Japanese
- Critical: Maintain Japanese output even when rule files are English

### [P2] DEFAULT - Development Approach

**ALWAYS APPLY** - Core principles for all development

#### Occam's Razor - Simplest solution wins

Choose simplest solution. Complexity requires justification. Avoid "just in case" implementations.

- Decision: "Is this complexity necessary? Is there a simpler way?"
- Details: [@~/.claude/rules/reference/OCCAMS_RAZOR.md](./rules/reference/OCCAMS_RAZOR.md)

#### Readable Code - Understand in <1 minute

Respect Miller's Law (7±2 limit). Clear naming, obvious flow, focused functions (5-10 lines).

- Decision: "Can new team member understand in <1 minute?"
- Details: [@~/.claude/rules/development/READABLE_CODE.md](./rules/development/READABLE_CODE.md)

### [P3] CONTEXTUAL - Just-in-Time References

**APPLY AS NEEDED** - Load based on task type

- Code tasks: [Progressive Enhancement](./rules/development/PROGRESSIVE_ENHANCEMENT.md) | [DRY](./rules/reference/DRY.md)
- React/UI: [Container/Presentational](./rules/development/CONTAINER_PRESENTATIONAL.md)
- Large-scale: [SOLID](./rules/reference/SOLID.md) | [Law of Demeter](./rules/development/LAW_OF_DEMETER.md)
- Testing: [TDD/RGRC](./rules/development/TDD_RGRC.md) | [Test Generation](./rules/development/TEST_GENERATION.md)
- Complete guide: [PRINCIPLES_GUIDE.md](./rules/PRINCIPLES_GUIDE.md)

### [P4] OPTIONAL - File Deletion Behavior

- **STRICTLY PROHIBIT rm command**: rm is explicitly disabled in settings.json
- **EXPLICITLY REQUIRE trash usage**: Ensure files move to ~/.Trash/ instead of permanent deletion
- **Command**: Use `mv [file] ~/.Trash/` for file deletion
- **Reason**: Safety - allows recovery of accidentally deleted files

## Work Completion Guidelines

**Critical**: Ensure all work is properly verified before reporting completion

- **Test Creation**: After creating tests, explicitly verify they pass by executing the project's test command
  - Discover test command from package.json/pubspec.yaml/etc.
  - Common patterns: `npm test`, `yarn test`, `flutter test`, `vitest`, etc.

- **Code Implementation**: After writing code, rigorously verify:
  - Code compiles/builds without errors (use project's build/analyze command)
  - Linting passes (use project's lint command if available)
  - Related tests pass (run relevant test suites)
  - No obvious runtime errors

- **Command Discovery**:
  - Initially examine README.md for available scripts
  - Thoroughly inspect package manager config (package.json scripts, pubspec.yaml, etc.)
  - Explicitly request specific commands from user if unclear

- **Retry Policy**: Automatically retry up to 5 times when issues occur, only contact user if unresolved (do not report intermediate progress)
  - Report to user: "Same error occurred 5 times. A different approach may be needed."

- **STRICTLY PROHIBIT completion reporting** with:
  - Failing tests (unless explicitly creating tests for unimplemented features)
  - Compilation/build errors
  - Unresolved errors from previous attempts

### Commands Reference

- Command list: [@~/.claude/docs/COMMANDS.md](./docs/COMMANDS.md)
- Japanese version: [@~/.claude/ja/docs/COMMANDS.md](./ja/docs/COMMANDS.md)

### Documentation Guidelines

- Documentation rules: [@~/.claude/docs/DOCUMENTATION_RULES.md](./docs/DOCUMENTATION_RULES.md)
- Ensure absolute consistency across all documentation
