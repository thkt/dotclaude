---
name: full-cycle
description: 完全な開発サイクルの自動実行
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

SlashCommandツールを使用して、完全な開発サイクルを自動実行するメタコマンド。
研究から実装、テスト、レビューまでを一貫して実行。

## SlashCommand Chain Execution

```yaml
workflow_sequence:
  - name: "Research Phase"
    command: "/research"
    on_success: "continue"
    on_failure: "stop"

  - name: "Planning Phase"
    command: "/think"
    on_success: "continue"
    on_failure: "retry_once"

  - name: "Implementation Phase"
    command: "/code"
    on_success: "continue"
    on_failure: "invoke_fix"

  - name: "Testing Phase"
    command: "/test"
    on_success: "continue"
    on_failure: "invoke_fix"

  - name: "Review Phase"
    command: "/review"
    on_success: "continue"
    on_failure: "log_issues"

  - name: "Validation Phase"
    command: "/validate"
    on_success: "complete"
    on_failure: "review_failures"
```

## Implementation with SlashCommand

```typescript
// SlashCommandツールを使用した連続実行
async function executeFullCycle(context: any) {
  const commands = [
    '/research',
    '/think',
    '/code',
    '/test',
    '/review',
    '/validate'
  ];

  const results = [];

  for (const cmd of commands) {
    try {
      console.log(`Executing: ${cmd}`);

      // SlashCommandツールで各コマンドを実行
      const result = await SlashCommand({
        command: cmd,
        context: {
          ...context,
          previousResults: results
        }
      });

      results.push({
        command: cmd,
        status: 'success',
        result
      });

      // TodoWriteで進捗を更新
      await updateProgress(cmd, 'completed');

    } catch (error) {
      results.push({
        command: cmd,
        status: 'failed',
        error
      });

      // エラーハンドリング
      if (shouldRetry(cmd, error)) {
        await SlashCommand({ command: '/fix' });
      } else {
        break; // 致命的エラーの場合は停止
      }
    }
  }

  return results;
}
```

## Advanced Features

### 条件付き実行

```typescript
// テスト結果に基づく条件分岐
if (testResults.coverage < 80) {
  await SlashCommand({ command: '/code --add-tests' });
}

// レビュー結果に基づく修正
if (reviewResults.issues.critical > 0) {
  await SlashCommand({ command: '/fix --priority=critical' });
}
```

### 並列実行サポート

```typescript
// 独立したタスクは並列実行
const parallelTasks = await Promise.all([
  SlashCommand({ command: '/test --unit' }),
  SlashCommand({ command: '/test --integration' }),
  SlashCommand({ command: '/review --style' })
]);
```

## Usage Examples

```bash
# 基本実行
/full-cycle

# スキップオプション付き
/full-cycle --skip=research,think

# 特定フェーズから開始
/full-cycle --start-from=code

# ドライラン（実行せずに計画のみ表示）
/full-cycle --dry-run
```

## Integration Benefits

1. **🔄 完全自動化**: 手動介入を最小限に
2. **📊 進捗管理**: TodoWriteと連携して進捗を可視化
3. **🛡️ エラー耐性**: 自動リトライと修正
4. **⚡ 効率化**: 最適な順序で実行

## Configuration

settings.jsonでカスタマイズ可能：

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

## Notes

- SlashCommandツール (v1.0.123+) が必要
- 各コマンドの実行権限が事前に設定されている必要がある
- エラー時の自動修正は `/fix` コマンドが利用可能な場合のみ
- 完了時には成功/失敗のサマリーレポートが生成される
