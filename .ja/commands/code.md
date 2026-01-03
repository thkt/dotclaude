---
description: TDD/RGRCサイクルとリアルタイムテストフィードバックでコードを実装
allowed-tools: Bash(npm run), Bash(npm run:*), Bash(yarn run), Bash(yarn run:*), Bash(yarn:*), Bash(pnpm run), Bash(pnpm run:*), Bash(pnpm:*), Bash(bun run), Bash(bun run:*), Bash(bun:*), Bash(make:*), Bash(git status:*), Bash(git log:*), Bash(ls:*), Bash(cat:*), Edit, MultiEdit, Write, Read, Glob, Grep, LS, Task
model: opus
argument-hint: "[実装の説明] [--frontend] [--principles] [--storybook]"
dependencies: [generating-tdd-tests, applying-frontend-patterns, applying-code-principles, integrating-storybook, ralph-wiggum]
---

# /code - TDD実装

## 目的

TDD/RGRCサイクルと品質チェックでコードを実装。

## 使い方

```bash
/code "ユーザーバリデーションを実装"           # デフォルトモード
/code --frontend "LoginFormを実装"            # + フロントエンドパターン
/code --principles "認証モジュールをリファクタ" # + 完全な原則適用
/code --storybook "Buttonを実装"              # + Storybook統合
```

## 必須コンテキスト（常時ロード）

- [@~/.claude/skills/generating-tdd-tests/SKILL.md] - TDD/RGRCサイクル、ベビーステップ

## 条件付きコンテキスト（フラグベース）

必要に応じてフラグでロード:

| フラグ | コンテキスト | 使用タイミング |
| --- | --- | --- |
| `--frontend` | [@~/.claude/skills/applying-frontend-patterns/SKILL.md] | React/UIコンポーネント |
| `--principles` | [@~/.claude/skills/applying-code-principles/SKILL.md] | 設計決定、リファクタリング |
| `--storybook` | [@~/.claude/skills/integrating-storybook/SKILL.md] | コンポーネントStories |

## プロジェクトコンテキスト（自動検出）

```bash
!`git status --porcelain 2>/dev/null | head -5 || echo "(no git)"`
!`ls package.json 2>/dev/null && echo "package.json found" || echo "(no package.json)"`
```

## 仕様コンテキスト

spec.md検出: [@~/.claude/references/commands/code/spec-context.md](~/.claude/references/commands/code/spec-context.md)

## 実装サイクル

### TDD/RGRC（主要）

1. **Red**: 失敗するテストを書く
2. **Green**: 通すための最小限のコード（ralph-wiggumで自動反復）
3. **Refactor**: 原則を適用（クイック判断質問）
4. **Commit**: 安定状態を保存

### フェーズ0: テスト準備

spec駆動テスト生成: [@~/.claude/references/commands/code/test-preparation.md](~/.claude/references/commands/code/test-preparation.md)

### RGRCサイクル詳細

詳細なサイクル: [@~/.claude/references/commands/code/rgrc-cycle.md](~/.claude/references/commands/code/rgrc-cycle.md)

## 品質ゲート

品質チェックと検証: [@~/.claude/references/commands/code/quality-gates.md](~/.claude/references/commands/code/quality-gates.md)

## 完了基準

完了定義: [@~/.claude/references/commands/code/completion.md](~/.claude/references/commands/code/completion.md)

## クイック判断質問（常時適用）

コードを書く前に尋ねる:

1. **最もシンプルな解決策？** - もっとシンプルな方法はある？
2. **既に存在する？** - 知識を重複させていない？
3. **単一責任？** - 変更の理由が1つ？
4. **理解可能？** - 1分以内に誰かが理解できる？
5. **今必要？** - 実際の問題を解決している？

## 次のステップ

- **すべてのテスト合格** → `/test` または `/audit` の準備完了
- **品質問題** → 進める前に修正
- **要件が不明確** → まず `/research` を使用
