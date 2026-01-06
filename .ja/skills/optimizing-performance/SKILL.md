---
name: optimizing-performance
description: >
  データ駆動アプローチによるフロントエンドパフォーマンス最適化。トリガー: パフォーマンス,
  遅い, 最適化, レンダリング, バンドルサイズ, Web Vitals, LCP, FID, CLS, 再レンダリング,
  メモ化, useMemo, useCallback, React.memo, 重い, 高速化, lazy loading, code splitting
allowed-tools: Read, Grep, Glob, Task, mcp__claude-in-chrome__*, mcp__mdn__*
---

# パフォーマンス最適化

## 目的

データ駆動のフロントエンド最適化。**「最適化する前に計測せよ」** - Donald Knuth

## セクションベースのロード

| セクション | ファイル | フォーカス | ロードタイミング |
| --- | --- | --- | --- |
| Web Vitals | `references/web-vitals.md` | LCP, FID, CLS | ロード速度、レイアウトシフト |
| React | `references/react-optimization.md` | memo, useMemo, useCallback | 再レンダリング |
| バンドル | `references/bundle-optimization.md` | コード分割、Tree shaking | バンドルサイズ |

## Core Web Vitalsターゲット

| メトリクス | ターゲット | 測定対象 |
| --- | --- | --- |
| LCP | <2.5秒 | 最大コンテンツの描画 |
| FID | <100ms | 初回入力遅延 |
| CLS | <0.1 | 累積レイアウトシフト |

## 最適化ワークフロー

```markdown
- [ ] 1. 現状測定（Lighthouse/DevTools）
- [ ] 2. ボトルネック特定（Network/Performanceタブ）
- [ ] 3. 優先順位付け（Impact vs Effort）
- [ ] 4. 改善実施（一度に一つの変更）
- [ ] 5. 再測定・比較
```

## 優先順序

1. **最初に計測** - Lighthouse, Chrome DevTools
2. **ユーザー中心メトリクス** - Web Vitalsにフォーカス
3. **プログレッシブエンハンスメント** - データに基づいて最適化
4. **早すぎる最適化を避ける** - 問題のある箇所のみ最適化

## 詳細参照

| 参照 | 目的 |
| --- | --- |
| [@./references/web-vitals.md](./references/web-vitals.md) | LCP, FID, CLS最適化 |
| [@./references/react-optimization.md](./references/react-optimization.md) | memo, useMemo, useCallback |
| [@./references/bundle-optimization.md](./references/bundle-optimization.md) | コード分割、Tree shaking |

## 参照

### 原則（rules/）

- [@../../../skills/applying-code-principles/SKILL.md](~/.claude/skills/applying-code-principles/SKILL.md) - 早すぎる最適化を避ける

### 関連スキル

- `enhancing-progressively` - CSS優先プログレッシブエンハンスメント
- `applying-code-principles` - SOLID, DRY, YAGNI原則

### 使用エージェント

- `performance-reviewer` - パフォーマンスコードレビューエージェント
