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

# /auto-test - SlashCommand統合による自動テストランナー

## 目的

ファイル変更後にテストを体系的に実行し、問題が検出された場合には自動化されたワークフロー調整を通じて`/fix`コマンドを明示的に呼び出します。

## SlashCommand統合

このコマンドはSlashCommandツールを厳密に活用し、テスト結果に基づいて他のコマンドを条件付きで実行します。

## ワークフロー仕様

```yaml
workflow:
  - step: "包括的なテストの実行"
    command: "npm test || yarn test || pnpm test"
    on_success: "続行"
    on_failure: "明示的にfixを呼び出し"

  - step: "条件付きで修正メカニズムを呼び出し"
    condition: "テスト失敗を検出"
    action:
      type: "SlashCommand"
      command: "/fix"
      context: "完全なテスト失敗情報を保持"
```

## 自動実行パターン

```typescript
// SlashCommandツールによる体系的な調整された実行
async function executeAutoTest() {
  const testResult = await rigorouslyExecuteTests();

  if (!testResult.success) {
    // SlashCommandツールを通じて/fixを明示的に呼び出し
    await SlashCommand({
      command: "/fix",
      context: testResult.errors
    });
  }

  return testResult;
}
```

## 使用パターン

```bash
# 手動実行
/auto-test

# ファイル変更後の自動トリガー（フック経由）
# settings.jsonの設定により明示的に有効化
```

## フック統合設定

settings.jsonに以下を追加して自動実行を明示的に有効化：

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

## 主要な利点

- 🚀 **完全な自動化**: ファイル変更後の手動テスト実行を排除
- 🔄 **継続的実行**: テスト失敗時に自動的に修正を試みる
- 📊 **効率の最大化**: 開発サイクルを大幅に加速

## 重要事項

- SlashCommandツールの利用可能性を厳格に要求
- テストコマンドは環境に基づいてインテリジェントに自動検出
- 修正が必要な場合は`/fix`コマンドが明示的に呼び出される
