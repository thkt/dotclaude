---
description: AI生成スロップの除去とコード簡素化による明確性・保守性の向上
allowed-tools: Bash(git diff:*), Bash(git log:*), Bash(git status:*), Read, Edit, MultiEdit, Grep, Glob
model: opus
dependencies: [orchestrating-workflows]
---

# /polish - コード簡素化 & AIスロップ除去

コミット前にAI生成スロップを除去しコードを簡素化。

## 除去対象

### 1. 不要なコメント

```typescript
// Bad: AIが追加する自明なコメント
// ユーザー名を取得
const name = user.name;

// Good: 自明なコードにコメント不要
const name = user.name;
```

### 2. 過剰な防御的コード

```typescript
// Bad: 過剰防御
if (!user) throw new Error("...");
if (!user.name) throw new Error("...");

// Good: 内部呼び出し元を信頼
return { ...user, processed: true };
```

### 3. 過剰設計

**参照**: [@../skills/reviewing-readability/references/ai-antipatterns.md](../skills/reviewing-readability/references/ai-antipatterns.md)

- 単一実装のインターフェース → 削除
- 関数1つをラップするクラス → 関数に変換
- 1回だけ使用されるヘルパー → インライン化

### 4. コードの複雑さ

- ネストされた三項演算子 → switch/if-else
- 深いネスト → 早期リターン

## プロセス

```text
1. Get diff: git diff main...HEAD
2. AIパターンを分析
3. 修正を適用
4. サマリーを報告
```

## 原則

- **オッカムの剃刀**: 最もシンプルな解決策
- **TIDYINGS**: 変更したコードのみ整理
- **一貫性**: 既存スタイルに合わせる

## 出力

```text
Polished: 5件のコメント削除、2件のヘルパーをインライン化
```

## IDR更新

削除と簡素化を含む`/polish`セクションをIDRに追記。

## 次のステップ

- **準備完了** → `/commit`
- **更にクリーンアップ** → `/audit`
