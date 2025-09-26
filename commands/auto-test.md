---
name: auto-test
description: ファイル変更後に自動テスト実行
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

# /auto-test - Automatic Test Runner with SlashCommand

## Purpose

ファイル変更後に自動的にテストを実行し、問題があれば `/fix` コマンドを呼び出す自動ワークフロー。

## SlashCommand Integration

このコマンドはSlashCommandツールを使用して、条件に応じて他のコマンドを自動実行します。

## Workflow

```yaml
workflow:
  - step: "Run tests"
    command: "npm test || yarn test || pnpm test"
    on_success: "continue"
    on_failure: "invoke_fix"

  - step: "Invoke fix if needed"
    condition: "test_failed"
    action:
      type: "SlashCommand"
      command: "/fix"
      context: "Retain test failure information"
```

## Auto-execution Pattern

```typescript
// SlashCommandツールを使用した自動実行
async function autoTest() {
  const testResult = await runTests();

  if (!testResult.success) {
    // SlashCommandツールで/fixを呼び出し
    await SlashCommand({
      command: "/fix",
      context: testResult.errors
    });
  }

  return testResult;
}
```

## Usage

```bash
# 手動実行
/auto-test

# ファイル変更後の自動トリガー（フック経由）
# settings.jsonに設定を追加することで有効化
```

## Integration with Hooks

settings.jsonに以下を追加して自動実行を有効化：

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

## Benefits

- 🚀 **自動化**: ファイル変更後の手動テスト実行が不要
- 🔄 **連続実行**: テスト失敗時に自動修正を試みる
- 📊 **効率的**: 開発サイクルの高速化

## Notes

- SlashCommandツールが利用可能であることを前提とする
- テストコマンドは環境に応じて自動検出
- 修正が必要な場合は `/fix` コマンドが自動的に呼び出される
