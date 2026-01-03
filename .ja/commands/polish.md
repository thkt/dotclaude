---
description: AI生成スロップの除去とコード簡素化による明確性・保守性の向上
allowed-tools: Bash(git diff:*), Bash(git log:*), Bash(git status:*), Read, Edit, MultiEdit, Grep, Glob
model: opus
---

# /polish - コード簡素化 & AIスロップ除去

## 目的

以下の方法でコードをクリーンアップ・簡素化:

1. AI生成スロップの除去（不要な追加）
2. 明確性のためのコード構造簡素化（code-simplifier統合）
3. プロジェクト標準との一貫性確保

コミット前に実行して、クリーンで保守しやすいコードを確保。

## 使用タイミング

```text
/audit → 問題発見
   ↓
/polish → 簡素化 & スロップ除去 ← ここ
   ↓
/commit → クリーンな状態で
```

## 除去対象

### 1. 不要なコメント

```typescript
// Bad: AIが追加する自明なコメント
// ユーザーオブジェクトからユーザー名を取得
const name = user.name

// Good: 自明なコードにコメント不要
const name = user.name
```

- コードの「何を」するかを説明するコメント（「なぜ」ではなく）
- ファイルの他の部分と一貫性のないコメント
- シンプルな関数への冗長なJSDoc

### 2. 過剰な防御的コード

```typescript
// Bad: 信頼できるコンテキストでの過剰防御
function processUser(user: User) {
  if (!user) throw new Error('User is required')
  if (!user.name) throw new Error('Name is required')
  if (typeof user.name !== 'string') throw new Error('Name must be string')
  // ... 呼び出し元で既に検証済みなのに
}

// Good: 内部呼び出し元を信頼
function processUser(user: User) {
  return { ...user, processed: true }
}
```

- 検証済みデータへの不要なnullチェック
- 例外を投げないコードへのtry-catchブロック
- 既に型付けされたパラメータへの型ガード

### 3. 過剰設計パターン

参照: [@~/.claude/skills/reviewing-readability/references/ai-antipatterns.md](~/.claude/skills/reviewing-readability/references/ai-antipatterns.md)

- 単一実装のインターフェース → インターフェースを削除
- 関数1つをラップするクラス → 関数に変換
- 単純な生成のためのファクトリパターン → 直接関数に
- 1回だけ使用されるヘルパー関数 → インライン化

### 4. スタイルの不一致

- ファイルの他の部分と異なるフォーマット
- プロジェクトに合わない命名規則
- ファイルと一貫性のないインポート順序

### 5. コードの複雑さ（code-simplifierより）

```typescript
// Bad: ネストされた三項演算子
const status = isActive ? (isPremium ? 'vip' : 'active') : 'inactive'

// Good: 明示的なswitch/if-else
function getStatus(isActive: boolean, isPremium: boolean): string {
  if (!isActive) return 'inactive'
  return isPremium ? 'vip' : 'active'
}
```

- ネストされた三項演算子 → Switch/if-elseチェーン
- 深いネスト → 早期リターン
- 過度にコンパクトな1行 → 読みやすい明示的コード
- 冗長な抽象化 → 直接的な実装

## プロセス

1. **ブランチのdiffを取得**

   ```bash
   git diff main...HEAD
   ```

2. **AIパターンの変更を分析**
   - 上記パターンをスキャン
   - 周囲のコードスタイルと比較
   - 不一致を特定

3. **修正を適用**
   - 不要な追加を削除
   - 過剰設計コードを簡素化
   - ファイルの既存スタイルに合わせる

4. **サマリーを報告**

   ```markdown
   ## Polish サマリー

   除去:
   - 不要なコメント 3件
   - 冗長なtry-catch 1件
   - シングルユースヘルパーのインライン化 2件

   ファイル: src/api.ts, src/utils.ts
   ```

## 簡素化ガイドライン（code-simplifierより）

簡素化時の優先事項:

1. **機能を維持**: コードの動作は変えない、方法だけを変える
2. **明確性 > 簡潔性**: 明示的コード > 過度にコンパクトなコード
3. **プロジェクト標準**: CLAUDE.mdの規約に従う
4. **バランス**: 保守性を損なう過度な簡素化を避ける

## 適用原則

- **オッカムの剃刀**: 最もシンプルな解決策が勝つ
- **TIDYINGS**: 変更したコードのみクリーンに
- **一貫性**: 既存のファイルスタイルに合わせる
- **可読性**: 1分以内に理解できる

## やってはいけないこと

- このブランチで変更されていないコードをリファクタリングしない
- 新機能や改善を追加しない
- 動作するロジックを変更しない
- diff外のファイルに触らない

## 出力フォーマット

サマリーは簡潔に（1-3文）:

```text
✨ Polished: src/api.tsで5件の不要なコメントを削除、2件のシングルユースヘルパーをインライン化
```
