# CLAUDE.md

## Priority Rules (FOLLOW IN ORDER)

### [P1] Language

- Input: Japanese from thkt
- Process: English internally
- Output: **JAPANESE ONLY** - NO ENGLISH OUTPUT TO USER
- Translation: **MANDATORY** for:
  - All format templates (Understanding Level → 理解レベル)
  - All messages and prompts (Proceed? → 進めてよろしいですか？)
  - All labels and status (completed → 完了)
- **CRITICAL**: Even if rule files show English, output MUST be Japanese

### [P2] Development Approach

- **📚 Principles Guide**: Complete application guide → [@~/.claude/rules/PRINCIPLES_GUIDE.md](./rules/PRINCIPLES_GUIDE.md)
  - Quick reference for immediate decisions
  - Detailed guide for deeper understanding
  - Priority matrix and conflict resolution
- **Core principle**: Occam's Razor → [@~/.claude/rules/reference/OCCAMS_RAZOR.md](./rules/reference/OCCAMS_RAZOR.md)
  - Choose the simplest solution that works
  - Avoid unnecessary complexity
  - Question every abstraction
- **Default philosophy**: Progressive Enhancement → [@~/.claude/rules/development/PROGRESSIVE_ENHANCEMENT.md](./rules/development/PROGRESSIVE_ENHANCEMENT.md)
  - Build simple → enhance progressively
  - Root cause over quick fixes
  - CSS-first for UI solutions
  - Elegance through simplicity
- **Code readability**: The Art of Readable Code → [@~/.claude/rules/development/READABLE_CODE.md](./rules/development/READABLE_CODE.md)
  - Clear naming and intent
  - Simple and direct solutions
  - Code that explains itself
  - Minimize understanding time
- **Container/Presentational**: Component design pattern → [@~/.claude/rules/development/CONTAINER_PRESENTATIONAL.md](./rules/development/CONTAINER_PRESENTATIONAL.md)
  - Separate logic from UI
  - Props-only Presentational components
  - Hooks in Container components
  - Maximize reusability
- Development methodologies integrated in commands:
  - `/code` - TDD/RGRC [@~/.claude/rules/development/TDD_RGRC.md], SOLID [@~/.claude/rules/reference/SOLID.md], DRY principles [@~/.claude/rules/reference/DRY.md]
  - `/think` - SOLID design principles [@~/.claude/rules/reference/SOLID.md]

### [P3] File Deletion Behavior

- **NEVER use rm command**: rm is disabled in settings.json
- **Always use trash**: Move files to ~/.Trash/ instead of permanent deletion
- **Command**: Use `mv [file] ~/.Trash/` for file deletion
- **Reason**: Safety - allows recovery of accidentally deleted files

## Work Completion Guidelines

**Critical**: Ensure all work is properly verified before reporting completion

- **Test Creation**: After creating tests, always run the project's test command to verify they pass
  - Discover test command from package.json/pubspec.yaml/etc.
  - Common patterns: `npm test`, `yarn test`, `flutter test`, `vitest`, etc.

- **Code Implementation**: After writing code, always verify:
  - Code compiles/builds without errors (use project's build/analyze command)
  - Linting passes (use project's lint command if available)
  - Related tests pass (run relevant test suites)
  - No obvious runtime errors

- **Command Discovery**:
  - First check README.md for available scripts
  - Check package manager config (package.json scripts, pubspec.yaml, etc.)
  - Ask user for specific commands if unclear

- **Retry Policy**: 問題発生時は自動で最大5回まで再試行し、それでも解消できない場合にのみユーザーへ連絡する（途中経過は報告しない）
  - Report to user: "同じエラーが5回続いています。別のアプローチが必要かもしれません。"

- **Never report completion** with:
  - Failing tests (unless explicitly creating tests for unimplemented features)
  - Compilation/build errors
  - Unresolved errors from previous attempts

### Commands Reference

- Command list: [@~/.claude/docs/COMMANDS.md](./docs/COMMANDS.md)
- Japanese version: [@~/.claude/ja/docs/COMMANDS.md](./ja/docs/COMMANDS.md)

### Documentation Guidelines

- Documentation rules: [@~/.claude/docs/DOCUMENTATION_RULES.md](./docs/DOCUMENTATION_RULES.md)
- Maintain consistency across all documentation

### Reference

JP version for human review: [@~/.claude/ja/CLAUDE.md](./ja/CLAUDE.md)
AI reads English version only.
