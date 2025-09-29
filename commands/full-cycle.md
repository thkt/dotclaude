---
name: full-cycle
description: Comprehensively orchestrate complete development cycle
priority: high
suitable_for:
  scale: [medium, large]
  type: [feature, refactor]
  understanding: "≥ 70%"
aliases: [fc, fulldev]
timeout: 300
allowed-tools: SlashCommand, TodoWrite, Read, Write, Edit, MultiEdit
uses_slashcommand: true
context:
  workflow_type: "sequential"
  error_handling: "stop_on_failure"
---

# /full-cycle - Complete Development Cycle Automation

## Purpose

Systematically orchestrate the complete development cycle through SlashCommand tool integration, rigorously executing from research through implementation, testing, and validation phases.

## SlashCommand Chain Execution Architecture

```yaml
workflow_sequence:
  - name: "Research Phase"
    command: "/research"
    on_success: "proceed"
    on_failure: "terminate"

  - name: "Planning Phase"
    command: "/think"
    on_success: "proceed"
    on_failure: "retry_once"

  - name: "Implementation Phase"
    command: "/code"
    on_success: "proceed"
    on_failure: "explicitly_invoke_fix"

  - name: "Testing Phase"
    command: "/test"
    on_success: "proceed"
    on_failure: "explicitly_invoke_fix"

  - name: "Review Phase"
    command: "/review"
    on_success: "proceed"
    on_failure: "document_issues"

  - name: "Validation Phase"
    command: "/validate"
    on_success: "finalize"
    on_failure: "scrutinize_failures"
```

## Implementation Architecture with SlashCommand

```typescript
// Rigorously orchestrated execution via SlashCommand tool
async function orchestrateFullCycle(context: any) {
  const commandSequence = [
    '/research',
    '/think',
    '/code',
    '/test',
    '/review',
    '/validate'
  ];

  const executionResults = [];

  for (const cmd of commandSequence) {
    try {
      console.log(`Executing: ${cmd}`);

      // Explicitly invoke each command through SlashCommand tool
      const result = await SlashCommand({
        command: cmd,
        context: {
          ...context,
          previousResults: executionResults
        }
      });

      executionResults.push({
        command: cmd,
        status: 'success',
        result
      });

      // Systematically update progress via TodoWrite
      await updateProgress(cmd, 'completed');

    } catch (error) {
      executionResults.push({
        command: cmd,
        status: 'failed',
        error
      });

      // Intelligent error handling
      if (shouldRetry(cmd, error)) {
        await SlashCommand({ command: '/fix' });
      } else {
        break; // Terminate on critical errors
      }
    }
  }

  return executionResults;
}
```

## Advanced Features

### Conditional Execution Logic

```typescript
// Conditionally enhance based on test coverage
if (testResults.coverage < 80) {
  await SlashCommand({ command: '/code --add-tests' });
}

// Prioritize critical issues from review
if (reviewResults.issues.critical > 0) {
  await SlashCommand({ command: '/fix --priority=critical' });
}
```

### Parallel Execution Architecture

```typescript
// Concurrently execute independent tasks
const parallelResults = await Promise.all([
  SlashCommand({ command: '/test --unit' }),
  SlashCommand({ command: '/test --integration' }),
  SlashCommand({ command: '/review --style' })
]);
```

## Usage Specifications

```bash
# Standard execution
/full-cycle

# Selectively skip phases
/full-cycle --skip=research,think

# Initiate from specific phase
/full-cycle --start-from=code

# Dry-run mode (display plan without execution)
/full-cycle --dry-run
```

## Integration Benefits

1. **🔄 Complete Automation**: Minimizes manual intervention throughout workflow
2. **📊 Progress Visibility**: Seamlessly integrates with TodoWrite for transparent tracking
3. **🛡️ Error Resilience**: Intelligent retry mechanisms with automatic corrections
4. **⚡ Optimized Execution**: Ensures optimal command sequence and timing

## Configuration Specification

Customize behavior through settings.json:

```json
{
  "full_cycle": {
    "default_sequence": ["research", "think", "code", "test", "review"],
    "error_handling": "stop_on_failure",
    "parallel_execution": true,
    "auto_commit": false
  }
}
```

## Critical Requirements

- Strictly requires SlashCommand tool (v1.0.123+)
- Execution permissions must be explicitly configured for each command
- Automatic corrections utilize `/fix` only when available
- Comprehensive summary report generated upon completion
