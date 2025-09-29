---
name: auto-test
description: Automatically execute tests after file modifications
priority: medium
suitable_for:
  scale: [small, medium]
  type: [fix, refactor]
  understanding: "≥ 90%"
aliases: [at]
timeout: 30
allowed-tools: SlashCommand, Bash(npm test:*), Bash(yarn test:*), Bash(pnpm test:*)
context:
  auto_execution: true
  trigger: "after_file_change"
---

# /auto-test - Automatic Test Runner with SlashCommand Integration

## Purpose

Systematically execute tests after file modifications and explicitly invoke `/fix` command when issues are detected through automated workflow orchestration.

## SlashCommand Integration

This command rigorously utilizes the SlashCommand tool to conditionally execute other commands based on test results.

## Workflow Specification

```yaml
workflow:
  - step: "Execute comprehensive tests"
    command: "npm test || yarn test || pnpm test"
    on_success: "continue"
    on_failure: "explicitly_invoke_fix"

  - step: "Conditionally invoke fix mechanism"
    condition: "test_failure_detected"
    action:
      type: "SlashCommand"
      command: "/fix"
      context: "Preserve complete test failure information"
```

## Auto-execution Pattern

```typescript
// Systematically orchestrated execution via SlashCommand tool
async function executeAutoTest() {
  const testResult = await rigorouslyExecuteTests();

  if (!testResult.success) {
    // Explicitly invoke /fix through SlashCommand tool
    await SlashCommand({
      command: "/fix",
      context: testResult.errors
    });
  }

  return testResult;
}
```

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
