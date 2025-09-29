# CLAUDE.md

## Priority Rules (FOLLOW IN ORDER)

### [P1] Language

- Input: Japanese from thkt
- Process: English internally
- Output: **JAPANESE ONLY** - STRICTLY PROHIBIT ENGLISH OUTPUT TO USER
- Translation: **EXPLICITLY REQUIRED** for:
  - All format templates (Understanding Level → 理解レベル)
  - All messages and prompts (Proceed? → 進めてよろしいですか？)
  - All labels and status (completed → 完了)
- **CRITICAL**: Ensure output remains Japanese even when rule files display English

### [P2] Development Approach

- **📚 Principles Guide**: Complete application guide → [@~/.claude/rules/PRINCIPLES_GUIDE.md](./rules/PRINCIPLES_GUIDE.md)
  - Quick reference for immediate decisions
  - Detailed guide for deeper understanding
  - Priority matrix and conflict resolution
- **Core principle**: Occam's Razor → [@~/.claude/rules/reference/OCCAMS_RAZOR.md](./rules/reference/OCCAMS_RAZOR.md)
  - Prioritize the simplest solution that works
  - Eliminate unnecessary complexity
  - Scrutinize every abstraction
- **Default philosophy**: Progressive Enhancement → [@~/.claude/rules/development/PROGRESSIVE_ENHANCEMENT.md](./rules/development/PROGRESSIVE_ENHANCEMENT.md)
  - Build simple → enhance progressively
  - Root cause over quick fixes
  - CSS-first for UI solutions
  - Elegance through simplicity
- **Code readability**: The Art of Readable Code → [@~/.claude/rules/development/READABLE_CODE.md](./rules/development/READABLE_CODE.md)
  - Clear naming and intent
  - Simple and direct solutions
  - Code that explains itself
  - Minimize comprehension time
- **Container/Presentational**: Component design pattern → [@~/.claude/rules/development/CONTAINER_PRESENTATIONAL.md](./rules/development/CONTAINER_PRESENTATIONAL.md)
  - Separate logic from UI
  - Props-only Presentational components
  - Hooks in Container components
  - Maximize component reusability
- Development methodologies integrated in commands:
  - `/code` - TDD/RGRC [@~/.claude/rules/development/TDD_RGRC.md], SOLID [@~/.claude/rules/reference/SOLID.md], DRY principles [@~/.claude/rules/reference/DRY.md]
  - `/think` - SOLID design principles [@~/.claude/rules/reference/SOLID.md]

### [P3] File Deletion Behavior

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

- **Retry Policy**: 問題発生時は自動で最大5回まで再試行し、それでも解消できない場合にのみユーザーへ連絡する（途中経過は報告しない）
  - Report to user: "同じエラーが5回続いています。別のアプローチが必要かもしれません。"

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

### Reference

JP version for human review: [@~/.claude/ja/CLAUDE.md](./ja/CLAUDE.md)
AI reads English version only.
