---
description: >
  CSS優先アプローチ - JavaScriptよりCSSを優先。トリガー: レイアウト, スタイル,
  位置, アニメーション, 表示/非表示, トグル, レスポンシブ, CSS Grid, Flexbox,
  transforms, transitions, CSSのみ, JavaScript不要, シンプル
allowed-tools: Read, Write, Edit, Grep, Glob
---

# Progressive Enhancement

## 目的

JavaScriptよりCSSソリューションを優先。「最良のコードは存在しないコード」

## クイック判断

JSを書く前に確認:

1. **「CSSで解決できる？」** → Grid, Flexbox, :has(), transforms
2. **「今必要？」** (YAGNI) → 証拠がなければ実装しない
3. **「最もシンプル？」** (オッカムの剃刀) → CSS 3行 > JS 50行

## 参照

詳細ガイド:
[@~/.claude/rules/development/PROGRESSIVE_ENHANCEMENT.md](~/.claude/rules/development/PROGRESSIVE_ENHANCEMENT.md)

## 関連

- `applying-code-principles` - SOLID, DRY, オッカムの剃刀
- `optimizing-performance` - パフォーマンス最適化

## 使用コマンド

- `/code --frontend` - フロントエンド実装
- `/audit` - CSS-first アプローチ確認
