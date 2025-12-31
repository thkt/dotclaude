---
description: テストを自動実行し、テスト失敗時に/fixを呼び出す
allowed-tools: SlashCommand, Bash(npm test:*), Bash(yarn test:*), Bash(pnpm test:*)
model: inherit
---

# /auto-test - SlashCommand統合による自動テストランナー

## 目的

ファイル変更後に体系的にテストを実行し、問題が検出された場合は自動ワークフローオーケストレーションを通じて `/fix` コマンドを明示的に呼び出します。

## ワークフロー手順

呼び出し時は以下の順序に従ってください:

### ステップ1: テスト実行

プロジェクトのテストコマンドを実行:

```bash
# 自動検出してテストを実行
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

### ステップ2: テスト結果を分析

テスト実行後:

- 出力からテスト失敗を解析
- 失敗したテストをカウント
- エラーメッセージとスタックトレースを抽出

### ステップ3: テスト失敗時に/fixを呼び出し

**重要**: テストが失敗した場合、SlashCommandツールを使用して `/fix` を呼び出す必要があります:

1. /fix用のコンテキストを準備:
   - 失敗したテスト名
   - エラーメッセージ
   - 関連ファイルパス

2. **SlashCommandツールを以下の形式で使用**:

    ```markdown
    Use the SlashCommand tool to execute: /fix

    Context to pass to /fix:
    - Failed tests: [list test names]
    - Error messages: [specific error details]
    - Affected files: [file paths from stack traces]
    ```

3. /fixコマンドの完了を待機

4. 修正を確認するためにテストを再実行

## 実行例

```markdown
User: /auto-test

Claude: テストを実行中...
[実行: npm test]

結果: 15件中3件のテストが失敗

Claude: テストが失敗しました。SlashCommandツールで/fixを呼び出します...
[SlashCommandツールで/fixを呼び出し]

Context passed to /fix:
- Failed tests: auth.test.ts::login, auth.test.ts::logout, user.test.ts::profile
- Error messages:
  - Expected 200, got 401 in auth.test.ts:42
  - Undefined user object in user.test.ts:28
- Affected files: src/auth.ts, src/user.ts

[/fixコマンドが実行され修正を適用]

Claude: テストを再実行中...
[実行: npm test]

結果: 15件すべてのテストがパス ✓
```

## SlashCommandツールの要件

- `/fix` コマンドが `.claude/commands/` に存在する必要があります
- `/fix` に適切な `allowed-tools` が設定されている必要があります
- このコマンドは settings.json の permissions で `SlashCommand` が許可リストに含まれている必要があります

## 使用パターン

```bash
# 手動実行
/auto-test

# ファイル変更後の自動トリガー（フック経由）
# settings.jsonで明示的に有効化
```

## フック統合設定

settings.json に追加して自動実行を明示的に有効化:

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

## 主なメリット

- 🚀 **完全自動化**: ファイル変更後の手動テスト実行を排除
- 🔄 **継続実行**: テスト失敗時に自動的に修正を試行
- 📊 **効率最大化**: 開発サイクルを大幅に加速

## 重要な注意事項

- SlashCommandツールの利用可能性が必須です
- テストコマンドは環境に基づいてインテリジェントに自動検出されます
- `/fix` コマンドは修正が必要な場合に明示的に呼び出されます
