---
name: use-context-performance-reviewer
description: >
  データ駆動アプローチによるフロントエンドパフォーマンス最適化。
  ページロード時間の最適化、Web Vitalsの改善、または performance, Web Vitals,
  LCP, FID, CLS, パフォーマンス最適化, 速度改善, bundle size
  に言及した時に使用。
allowed-tools: [Read, Grep, Glob, Task, Bash(agent-browser:*), mcp__mdn__*]
agent: performance-reviewer
context: fork
user-invocable: false
---

# パフォーマンス最適化

## Core Web Vitals

| メトリクス | ターゲット | 測定対象                 |
| ---------- | ---------- | ------------------------ |
| LCP        | <2.5秒     | Largest Contentful Paint |
| FID        | <100ms     | First Input Delay        |
| CLS        | <0.1       | Cumulative Layout Shift  |

## ワークフロー

1. 測定 (Lighthouse/DevTools)
2. ボトルネック特定
3. 一度に1つの変更
4. 再測定

## 参照

| トピック | ファイル                                                |
| -------- | ------------------------------------------------------- |
| Vitals   | `${CLAUDE_SKILL_DIR}/references/web-vitals.md`          |
| React    | `${CLAUDE_SKILL_DIR}/references/react-optimization.md`  |
| バンドル | `${CLAUDE_SKILL_DIR}/references/bundle-optimization.md` |
