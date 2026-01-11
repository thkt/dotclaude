---
description: TDD/RGRCサイクルでリアルタイムテストフィードバック付きコード実装
allowed-tools: Bash(npm run), Bash(npm run:*), Bash(yarn run), Bash(yarn run:*), Bash(yarn:*), Bash(pnpm run), Bash(pnpm run:*), Bash(pnpm:*), Bash(bun run), Bash(bun run:*), Bash(bun:*), Bash(make:*), Bash(git status:*), Bash(git log:*), Bash(ls:*), Bash(cat:*), Edit, MultiEdit, Write, Read, Glob, Grep, LS, Task
model: opus
argument-hint: "[実装内容] [--frontend] [--principles] [--storybook]"
dependencies:
  [
    generating-tdd-tests,
    applying-frontend-patterns,
    applying-code-principles,
    integrating-storybook,
    orchestrating-workflows,
    ralph-wiggum,
  ]
---

# /code - TDD実装

TDD/RGRCサイクルと品質チェックによるコード実装。

## ワークフロー参照

**完全ワークフロー**: [@../skills/orchestrating-workflows/references/code-workflow.md](../skills/orchestrating-workflows/references/code-workflow.md)

## 使用方法

```bash
/code "ユーザー検証を実装"              # デフォルトモード
/code --frontend "LoginFormを実装"     # + フロントエンドパターン
/code --principles "認証モジュールをリファクタ"  # + 完全原則
/code --storybook "Buttonを実装"       # + Storybook統合
```

## 条件付きコンテキスト

| フラグ         | コンテキスト               | 使用時           |
| -------------- | -------------------------- | ---------------- |
| `--frontend`   | applying-frontend-patterns | React/UI         |
| `--principles` | applying-code-principles   | リファクタリング |
| `--storybook`  | integrating-storybook      | Stories          |

## クイック判断質問

コード記述前に:

1. **最もシンプルな解決策?** - より簡単な方法はある?
2. **既に存在する?** - 知識を重複させていない?
3. **単一責任?** - 変更理由は一つ?
4. **理解できる?** - 1分以内に理解可能?

## RGRCサイクル

```text
1. Red    - 失敗するテストを作成
2. Green  - 最小限のコードで通過 (ralph-wiggum自動イテレーション)
3. Refactor - 原則を適用
4. Commit - 安定状態を保存
```

**詳細**: [@../skills/orchestrating-workflows/references/shared/tdd-cycle.md](../skills/orchestrating-workflows/references/shared/tdd-cycle.md)

## IDR生成

実装後、SOWが存在する場合はIDRを生成。

**IDRロジック**: [@../skills/orchestrating-workflows/references/shared/idr-generation.md](../skills/orchestrating-workflows/references/shared/idr-generation.md)

## 次のステップ

- **全テスト通過** → `/test` または `/audit`
- **品質問題** → 先に修正
- **不明確** → まず `/research`
