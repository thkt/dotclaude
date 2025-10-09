# CLAUDE.md

## Priority Rules (FOLLOW IN ORDER)

### [P0] Core AI Operation Rules (MUST FOLLOW)

**These rules govern fundamental AI behavior and MUST be followed at all times.**

- **AI Operation Principles**: [@~/.claude/rules/core/AI_OPERATION_PRINCIPLES.md](./rules/core/AI_OPERATION_PRINCIPLES.md)
  - Safety First - Maintain safety boundaries for destructive operations
  - User Authority - User instructions are the ultimate authority
  - Workflow Integration - Follow PRE_TASK_CHECK for structured operations
  - **Priority**: Top-level (supersedes all other rules)
  - **Application**: Applied internally via hooks on every user message

- **Pre-Task Check**: [@~/.claude/rules/core/PRE_TASK_CHECK.md](./rules/core/PRE_TASK_CHECK.md)
  - Understanding confirmation before file operations
  - Execution planning for multi-step workflows
  - User approval gates for destructive operations
  - **When to apply**: File operations, command execution, complex tasks
  - **Workflow**: Apply principles → PRE_TASK_CHECK → Wait for confirmation

**Note**: These P0 rules are the foundation of all AI interactions. All other priority levels (P1, P2, P3) operate within the framework established by P0.

### [P1] Language

- Input: Japanese from user
- Process: English internally
- Output: **JAPANESE ONLY** - STRICTLY PROHIBIT ENGLISH OUTPUT TO USER
- Translation: **EXPLICITLY REQUIRED** for:
  - All format templates (Understanding Level → 理解レベル)
  - All messages and prompts (Proceed? → 進めてよろしいですか？)
  - All labels and status (completed → 完了)
- **CRITICAL**: Ensure output remains Japanese even when rule files display English

### [P2] Development Approach

**Core Principles (Always Apply):**

#### Occam's Razor（オッカムの剃刀）

複数の解決策が存在する場合、最もシンプルなものを選択する。複雑さには明確な正当性が必要。「念のため」の実装は避け、実測された問題に対してのみ複雑さを追加する。動作する最小限の実装から始め、必要性が証明されてから拡張する。

**適用例:**
- インターフェース vs 直接実装 → 2つ目の実装が出現するまで待つ
- 抽象化 vs 具体的コード → 3回重複してから抽象化（DRY原則）
- クラス vs 関数 → タスクスコープに応じて選択

**判断質問:** "この複雑さは本当に必要か？より単純な方法はないか？"

**詳細:** [@~/.claude/rules/reference/OCCAMS_RAZOR.md](./rules/reference/OCCAMS_RAZOR.md) - タスクスコープ別アプローチ、複雑さの予算、警告サインなど

---

#### Readable Code（読みやすいコード）

コードは1分以内に理解できるべき。Miller's Law（7±2の認知限界）を尊重し、複雑さを管理する。明確な命名、明白な制御フロー、集中した関数（5-10行が理想）を心がける。理解時間 > 記述時間を優先。

**適用例:**
- 変数名: 具体的 > 抽象的（`userEmail` not `data`）
- 制御フロー: ガード句で早期リターン、ネスト最小化
- 関数: 1つのことを行う、"and"で説明できない

**判断質問:** "新しいチームメンバーが1分以内に理解できるか？"

**詳細:** [@~/.claude/rules/development/READABLE_CODE.md](./rules/development/READABLE_CODE.md) - AI生成コードのスメル、リファクタリング戦略など

---

**Just-in-Time References（状況に応じて参照）:**

コード作業時:
- **Progressive Enhancement**: 最小限の実装から開始、段階的拡張 → [@~/.claude/rules/development/PROGRESSIVE_ENHANCEMENT.md](./rules/development/PROGRESSIVE_ENHANCEMENT.md)
- **DRY**: 3回目の重複で抽象化 → [@~/.claude/rules/reference/DRY.md](./rules/reference/DRY.md)

React/UI作業時:
- **Container/Presentational**: ロジックとUIの分離 → [@~/.claude/rules/development/CONTAINER_PRESENTATIONAL.md](./rules/development/CONTAINER_PRESENTATIONAL.md)

大規模設計時:
- **SOLID**: 変更に強い設計 → [@~/.claude/rules/reference/SOLID.md](./rules/reference/SOLID.md)
- **Law of Demeter**: 結合度の管理 → [@~/.claude/rules/development/LAW_OF_DEMETER.md](./rules/development/LAW_OF_DEMETER.md)

テスト作成時:
- **TDD/RGRC**: Red-Green-Refactor-Commit → [@~/.claude/rules/development/TDD_RGRC.md](./rules/development/TDD_RGRC.md)

**全体ガイド:** [@~/.claude/rules/PRINCIPLES_GUIDE.md](./rules/PRINCIPLES_GUIDE.md) - 原則の適用方法、優先順位、コンフリクト解決など

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
