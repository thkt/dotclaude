---
name: optimizing-performance
description: >
  Frontend performance optimization with data-driven approach.
  Triggers: performance, Web Vitals, LCP, FID, CLS, パフォーマンス最適化, 速度改善, bundle size.
allowed-tools: [Read, Grep, Glob, Task, Bash(agent-browser:*), mcp__mdn__*]
agent: performance-reviewer
user-invocable: false
---

# パフォーマンス最適化

## Core Web Vitals

| メトリクス | ターゲット | 測定対象             |
| ---------- | ---------- | -------------------- |
| LCP        | <2.5秒     | 最大コンテンツの描画 |
| FID        | <100ms     | 初回入力遅延         |
| CLS        | <0.1       | 累積レイアウトシフト |

## ワークフロー

1. 測定 (Lighthouse/DevTools)
2. ボトルネック特定
3. 一度に一つの変更
4. 再測定

## 参考

| トピック | ファイル                            |
| -------- | ----------------------------------- |
| Vitals   | `references/web-vitals.md`          |
| React    | `references/react-optimization.md`  |
| バンドル | `references/bundle-optimization.md` |
