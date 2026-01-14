---
name: optimizing-performance
description: データ駆動アプローチによるフロントエンドパフォーマンス最適化。
allowed-tools: [Read, Grep, Glob, Task, mcp__claude-in-chrome__*, mcp__mdn__*]
agent: performance-reviewer
user-invocable: false
---

# パフォーマンス最適化

データ駆動のフロントエンド最適化。「最適化する前に計測せよ」 - Knuth

## セクションベースのロード

| セクション | ファイル                            | フォーカス    |
| ---------- | ----------------------------------- | ------------- |
| Web Vitals | `references/web-vitals.md`          | LCP, FID, CLS |
| React      | `references/react-optimization.md`  | memo, useMemo |
| バンドル   | `references/bundle-optimization.md` | コード分割    |

## Core Web Vitalsターゲット

| メトリクス | ターゲット | 測定対象             |
| ---------- | ---------- | -------------------- |
| LCP        | <2.5秒     | 最大コンテンツの描画 |
| FID        | <100ms     | 初回入力遅延         |
| CLS        | <0.1       | 累積レイアウトシフト |

## ワークフロー

1. 測定（Lighthouse/DevTools）
2. ボトルネック特定
3. 優先順位付け（Impact vs Effort）
4. 一度に一つの変更
5. 再測定

## 優先順序

1. **最初に計測** - 盲目的に最適化しない
2. **ユーザー中心** - Web Vitalsにフォーカス
3. **プログレッシブ** - データに基づいて最適化
4. **早すぎる最適化を避ける** - 問題箇所のみ
