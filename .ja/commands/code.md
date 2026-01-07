---
description: TDD/RGRCサイクルとリアルタイムテストフィードバックでコードを実装
allowed-tools: Bash(npm run), Bash(npm run:*), Bash(yarn run), Bash(yarn run:*), Bash(yarn:*), Bash(pnpm run), Bash(pnpm run:*), Bash(pnpm:*), Bash(bun run), Bash(bun run:*), Bash(bun:*), Bash(make:*), Bash(git status:*), Bash(git log:*), Bash(ls:*), Bash(cat:*), Edit, MultiEdit, Write, Read, Glob, Grep, LS, Task
model: opus
argument-hint: "[実装の説明] [--frontend] [--principles] [--storybook]"
dependencies:
  [
    generating-tdd-tests,
    applying-frontend-patterns,
    applying-code-principles,
    integrating-storybook,
    ralph-wiggum,
  ]
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

- [@../../skills/generating-tdd-tests/SKILL.md] - TDD/RGRCサイクル、ベビーステップ

## 条件付きコンテキスト（フラグベース）

必要に応じてフラグでロード:

| フラグ         | コンテキスト                                        | 使用タイミング             |
| -------------- | --------------------------------------------------- | -------------------------- |
| `--frontend`   | [@../../skills/applying-frontend-patterns/SKILL.md] | React/UIコンポーネント     |
| `--principles` | [@../../skills/applying-code-principles/SKILL.md]   | 設計決定、リファクタリング |
| `--storybook`  | [@../../skills/integrating-storybook/SKILL.md]      | コンポーネントStories      |

## プロジェクトコンテキスト（自動検出）

```bash
!`git status --porcelain 2>/dev/null | head -5 || echo "(no git)"`
!`ls package.json 2>/dev/null && echo "package.json found" || echo "(no package.json)"`
```

## 仕様コンテキスト

spec.md検出: [@../../references/commands/code/spec-context.md](../../references/commands/code/spec-context.md)

## 実装サイクル

### TDD/RGRC（主要）

1. **Red**: 失敗するテストを書く
2. **Green**: 通すための最小限のコード（ralph-wiggumで自動反復）
3. **Refactor**: 原則を適用（クイック判断質問）
4. **Commit**: 安定状態を保存

### フェーズ0: テスト準備

spec駆動テスト生成: [@../../references/commands/code/test-preparation.md](../../references/commands/code/test-preparation.md)

### RGRCサイクル詳細

詳細なサイクル: [@../../references/commands/code/rgrc-cycle.md](../../references/commands/code/rgrc-cycle.md)

## 品質ゲート

品質チェックと検証: [@../../references/commands/code/quality-gates.md](../../references/commands/code/quality-gates.md)

## 完了基準

完了定義: [@../../references/commands/code/completion.md](../../references/commands/code/completion.md)

## クイック判断質問（常時適用）

コードを書く前に尋ねる:

1. **最もシンプルな解決策？** - もっとシンプルな方法はある？
2. **既に存在する？** - 知識を重複させていない？
3. **単一責任？** - 変更の理由が1つ？
4. **理解可能？** - 1分以内に誰かが理解できる？
5. **今必要？** - 実際の問題を解決している？

## IDR生成

実装完了後、実装判断を記録するIDR（Implementation Decision Record）を生成します。

### IDR要件チェック

IDRを生成する前に、必要かどうかを確認:

1. **spec.md** の `idr_required` フィールドを確認（セクション11）
2. **specが存在し `idr_required: false`** → IDR生成をスキップ
3. **specが存在し `idr_required: true`** → IDRを生成
4. **specが存在しない場合** → デフォルトロジックを適用（SOWが存在すれば生成）

```text
Specチェック: ~/.claude/workspace/planning/**/spec.md → セクション11
```

### IDR検出と生成

詳細ロジック: [@../../references/commands/shared/idr-generation.md](../../references/commands/shared/idr-generation.md)

1. **SOW検索**:

   ```text
   Globパターン: ~/.claude/workspace/planning/**/sow.md
   ```

2. **SOWが見つかった場合**:
   - IDRパス: `[SOWディレクトリ]/idr.md`
   - IDRを作成または更新

3. **SOWが見つからない場合（スタンドアロンモード）**:
   - IDRパス: `~/.claude/workspace/idr/[feature-name]/idr.md`
   - スタンドアロンIDRを作成

### IDRコンテンツ生成

`/code`セクションを生成:

- **Changed Files**: git diffまたはツール結果から
- **Implementation Decisions**: 行った主要な判断
- **Attention Points**: 落とし穴、エッジケース、レビュー時の注意
- **Applied Principles**: TDD、オッカムの剃刀、SOLIDなど
- **信頼度スコア**

### IDR出力形式

```markdown
## /code - [YYYY-MM-DD HH:MM]

### Changed Files

| File            | Change Type      | Description |
| --------------- | ---------------- | ----------- |
| path/to/file.ts | Created/Modified | [概要]      |

### Implementation Decisions

| Decision   | Rationale | Alternatives Considered |
| ---------- | --------- | ----------------------- |
| [判断内容] | [根拠]    | [検討した代替案]        |

### Attention Points

- [注意点]

### Applied Principles

- [適用した原則]

### Confidence: [C: 0.XX]
```

### SOW更新

SOWが存在する場合、Implementation RecordsセクションをIDRリンクとステータスで更新します。

## 次のステップ

- **すべてのテスト合格** → `/test` または `/audit` の準備完了
- **品質問題** → 進める前に修正
- **要件が不明確** → まず `/research` を使用
