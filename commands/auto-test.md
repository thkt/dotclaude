---
description: >
  Automatically execute tests after file modifications and invoke /fix command if tests fail using SlashCommand tool.
  Streamlines test-fix cycle with automatic conditional execution. Can be triggered via hooks in settings.json.
  Use after code changes to verify functionality and automatically attempt fixes on failure.
  ファイル変更後に自動的にテストを実行し、失敗時に/fixコマンドを呼び出す。
allowed-tools: SlashCommand, Bash(npm test:*), Bash(yarn test:*), Bash(pnpm test:*)
model: inherit
---

# /auto-test - Automatic Test Runner with SlashCommand Integration

## Purpose

Systematically execute tests after file modifications and explicitly invoke `/fix` command when issues are detected through automated workflow orchestration.

## Workflow Instructions

Follow this sequence when invoked:

### Step 1: Execute Tests

Run the project's test command:

```bash
# Auto-detect and run tests
if [ -f "package.json" ] && grep -q "\"test\":" package.json; then
  npm test || yarn test || pnpm test
elif [ -f "pubspec.yaml" ]; then
  flutter test
elif [ -f "Makefile" ] && grep -q "test:" Makefile; then
  make test
else
  echo "No test command found"
  exit 1
fi
```

### Step 2: Analyze Test Results

After test execution:

- Parse the output for test failures
- Count failed tests
- Extract error messages and stack traces

### Step 3: Invoke /fix if Tests Fail

**IMPORTANT**: If any tests fail, you MUST use the SlashCommand tool to invoke `/fix`:

1. Prepare context for /fix:
   - Failed test names
   - Error messages
   - Relevant file paths

2. **Use SlashCommand tool with this exact format**:

    ```markdown
    Use the SlashCommand tool to execute: /fix

    Context to pass to /fix:
    - Failed tests: [list test names]
    - Error messages: [specific error details]
    - Affected files: [file paths from stack traces]
    ```

3. Wait for /fix command to complete

4. Re-run tests to verify fixes

## Example Execution

```markdown
User: /auto-test

Claude: Running tests...
[Executes: npm test]

Result: 3 tests failed out of 15 total

Claude: Tests failed. Using SlashCommand tool to invoke /fix...
[Uses SlashCommand tool to call: /fix]

Context passed to /fix:
- Failed tests: auth.test.ts::login, auth.test.ts::logout, user.test.ts::profile
- Error messages:
  - Expected 200, got 401 in auth.test.ts:42
  - Undefined user object in user.test.ts:28
- Affected files: src/auth.ts, src/user.ts

[/fix command executes and applies fixes]

Claude: Re-running tests...
[Executes: npm test]

Result: All 15 tests passed ✓
```

## Requirements for SlashCommand Tool

- `/fix` command must be available in `.claude/commands/`
- `/fix` must have proper `allowed-tools` configured
- This command requires `SlashCommand` to be in the allow list in settings.json permissions

## Usage Patterns

```bash
# Manual execution
/auto-test

# Automatic trigger after file modifications (via hooks)
# Explicitly enable by configuring settings.json
```

## Hook Integration Configuration

Explicitly enable automatic execution by adding to settings.json:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit|MultiEdit",
        "hooks": [
          {
            "type": "command",
            "command": "claude --command '/auto-test'"
          }
        ]
      }
    ]
  }
}
```

## Key Benefits

- 🚀 **Complete Automation**: Eliminates manual test execution after file changes
- 🔄 **Continuous Execution**: Automatically attempts fixes upon test failures
- 📊 **Maximized Efficiency**: Accelerates development cycle significantly

## Critical Notes

- Strictly requires SlashCommand tool availability
- Test commands are intelligently auto-detected based on environment
- `/fix` command is explicitly invoked when corrections are necessary
