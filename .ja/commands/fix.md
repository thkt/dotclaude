---
description: 開発環境で小さなバグや軽微な改善を迅速に修正
allowed-tools: Bash(git diff:*), Bash(git ls-files:*), Bash(npm test:*), Bash(npm run), Bash(npm run:*), Bash(yarn run:*), Bash(pnpm run:*), Bash(bun run:*), Bash(ls:*), Edit, MultiEdit, Read, Grep, Glob, Task
model: inherit
argument-hint: "[バグまたは問題の説明]"
dependencies:
  [Explore, test-generator, generating-tdd-tests, orchestrating-workflows]
---

# /fix - クイックバグ修正

根本原因分析とTDD検証による迅速なバグ修正。

## ワークフロー参照

**完全ワークフロー**: [@../skills/orchestrating-workflows/references/fix-workflow.md](../skills/orchestrating-workflows/references/fix-workflow.md)

## 使用時期

| `/fix`を使用           | 他コマンドを使用       |
| ---------------------- | ---------------------- |
| 小さく理解しやすい問題 | 原因不明 → `/research` |
| 単一または2-3ファイル  | 複数ファイル → `/code` |
| 信頼度≥80%             | 新機能 → `/think`      |

## 修正プロセス

```text
フェーズ1: 根本原因分析 (5 Whys)
    ↓
フェーズ1.5: リグレッションテスト先行
    ↓
フェーズ2: 実装 (信頼度ベース)
    ↓
フェーズ3: 検証
    ↓
フェーズ3.5: 追加テスト (オプション)
    ↓
完了定義
```

## 信頼度ベースアプローチ

| 信頼度  | 戦略                       |
| ------- | -------------------------- |
| >0.9    | 直接修正                   |
| 0.7-0.9 | 防御的修正 (ガード追加)    |
| <0.7    | エスカレート → `/research` |

## 適用原則

- **オッカムの剃刀**: 最もシンプルな解決策
- **TIDYINGS**: 触れた部分のみ整理
- **CSS-first**: UI問題には
- **TDD**: バグにはテスト先行

## IDR

`/fix`はIDRを生成しない - 決定追跡が必要な機能には`/code`を使用。

## 次のステップ

- **成功** → 変更をコミット
- **部分的** → フォローアップの`/fix`
- **エスカレーション** → `/think` → `/code`
