---
name: enhancing-progressively
description: >
  CSS優先アプローチ - JavaScriptの前にCSSを使用。トリガー: レイアウト, スタイル,
  位置, アニメーション, 表示/非表示, トグル, レスポンシブ, CSS Grid, Flexbox,
  transforms, transitions, CSSのみ, JavaScript不要, シンプル
allowed-tools: Read, Write, Edit, Grep, Glob
---

# プログレッシブエンハンスメント

## 目的

JavaScriptよりCSSソリューションを優先。「最良のコードはコードがないこと。」

## クイック判断

JSを書く前に確認:

1. **「CSSで解決できる？」** → Grid, Flexbox, :has(), transforms
2. **「今必要？」**（YAGNI） → 証拠なし = 実装しない
3. **「最もシンプルな解決は？」**（オッカムの剃刀） → CSS3行 > JS50行

## 参照

詳細ガイドは以下を参照:
[@../../../rules/development/PROGRESSIVE_ENHANCEMENT.md](../../../rules/development/PROGRESSIVE_ENHANCEMENT.md)

## 関連

- `applying-code-principles` - SOLID, DRY, オッカムの剃刀
- `optimizing-performance` - パフォーマンス最適化

## 使用コマンド

- `/code --frontend` - フロントエンド実装
- `/audit` - CSS優先アプローチ検証
