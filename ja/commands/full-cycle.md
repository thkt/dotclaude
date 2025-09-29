---
name: full-cycle
description: 完全な開発サイクルを包括的に調整
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

# /full-cycle - 完全な開発サイクル自動化

## 目的

SlashCommandツール統合を通じて完全な開発サイクルを体系的に調整し、調査から実装、テスト、検証フェーズまでを厳密に実行します。

## SlashCommandチェーン実行アーキテクチャ

```yaml
workflow_sequence:
  - name: "調査フェーズ"
    command: "/research"
    on_success: "続行"
    on_failure: "終了"

  - name: "計画フェーズ"
    command: "/think"
    on_success: "続行"
    on_failure: "一度再試行"

  - name: "実装フェーズ"
    command: "/code"
    on_success: "続行"
    on_failure: "明示的にfixを呼び出し"

  - name: "テストフェーズ"
    command: "/test"
    on_success: "続行"
    on_failure: "明示的にfixを呼び出し"

  - name: "レビューフェーズ"
    command: "/review"
    on_success: "続行"
    on_failure: "問題を文書化"

  - name: "検証フェーズ"
    command: "/validate"
    on_success: "完了"
    on_failure: "失敗を精査"
```

## SlashCommandによる実装アーキテクチャ

```typescript
// SlashCommandツールによる厳密に調整された実行
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
      console.log(`実行中: ${cmd}`);

      // SlashCommandツールを通じて各コマンドを明示的に呼び出し
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

      // TodoWriteを介して進捗を体系的に更新
      await updateProgress(cmd, 'completed');

    } catch (error) {
      executionResults.push({
        command: cmd,
        status: 'failed',
        error
      });

      // インテリジェントなエラーハンドリング
      if (shouldRetry(cmd, error)) {
        await SlashCommand({ command: '/fix' });
      } else {
        break; // 致命的エラーで終了
      }
    }
  }

  return executionResults;
}
```

## 高度な機能

### 条件付き実行ロジック

```typescript
// テストカバレッジに基づいて条件付きで強化
if (testResults.coverage < 80) {
  await SlashCommand({ command: '/code --add-tests' });
}

// レビューからの重大な問題を優先
if (reviewResults.issues.critical > 0) {
  await SlashCommand({ command: '/fix --priority=critical' });
}
```

### 並列実行アーキテクチャ

```typescript
// 独立したタスクを同時実行
const parallelResults = await Promise.all([
  SlashCommand({ command: '/test --unit' }),
  SlashCommand({ command: '/test --integration' }),
  SlashCommand({ command: '/review --style' })
]);
```

## 使用仕様

```bash
# 標準実行
/full-cycle

# フェーズを選択的にスキップ
/full-cycle --skip=research,think

# 特定のフェーズから開始
/full-cycle --start-from=code

# ドライランモード（実行せずに計画を表示）
/full-cycle --dry-run
```

## 統合の利点

1. **🔄 完全な自動化**: ワークフロー全体で手動介入を最小限に
2. **📊 進捗の可視性**: TodoWriteとシームレスに統合し透明な追跡を実現
3. **🛡️ エラー耐性**: 自動修正を伴うインテリジェントな再試行メカニズム
4. **⚡ 最適化された実行**: 最適なコマンドシーケンスとタイミングを保証

## 設定仕様

settings.jsonで動作をカスタマイズ：

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

## 重要要件

- SlashCommandツール（v1.0.123+）を厳格に要求
- 各コマンドの実行権限を明示的に設定する必要がある
- 自動修正は`/fix`が利用可能な場合のみ実行
- 完了時に包括的なサマリーレポートを生成
