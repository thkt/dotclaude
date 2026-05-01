---
name: use-context-reviewer-performance
description: フロントエンドのパフォーマンス最適化。
when_to_use: performance, Web Vitals, LCP, FID, CLS, パフォーマンス最適化, 速度改善, bundle size
allowed-tools: Read Grep Glob Task Bash(agent-browser:*) mcp__mdn__*
agent: reviewer-performance
context: fork
user-invocable: false
---

# パフォーマンス最適化

## Core Web Vitals

| 指標 | 目標   | 計測対象                 |
| ---- | ------ | ------------------------ |
| LCP  | <2.5s  | Largest Contentful Paint |
| FID  | <100ms | First Input Delay        |
| CLS  | <0.1   | Cumulative Layout Shift  |

## ワークフロー

1. 計測 (Lighthouse/DevTools)
2. ボトルネック特定
3. 一度に 1 つだけ変更
4. 再計測

## 参照ファイル

| トピック | ファイル                                              |
| -------- | ----------------------------------------------------- |
| Vitals   | ${CLAUDE_SKILL_DIR}/references/web-vitals.md          |
| React    | ${CLAUDE_SKILL_DIR}/references/react-optimization.md  |
| Bundle   | ${CLAUDE_SKILL_DIR}/references/bundle-optimization.md |
