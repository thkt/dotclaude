# Web Vitals

## コア指標

| 指標 | 目標   | 計測内容               |
| ---- | ------ | ---------------------- |
| LCP  | <2.5s  | 最大コンテンツ描画時間 |
| FID  | <100ms | 最初の入力遅延         |
| CLS  | <0.1   | 累積レイアウトシフト   |

## LCP 最適化

| 手法                   | 実装                                  |
| ---------------------- | ------------------------------------- |
| 優先ロード             | hero 画像に `fetchpriority="high"`    |
| プリロード             | `<link rel="preload" as="image">`     |
| LCP 要素は lazy しない | above-fold の `loading="lazy"` を削除 |
| コード分割             | 重要でないルートに `lazy()`           |

## CLS 防止

| 原因               | 解決策                                      |
| ------------------ | ------------------------------------------- |
| サイズ未指定の画像 | `width`/`height` または `aspect-ratio` 追加 |
| 動的コンテンツ     | `min-height` でスペースを確保               |
| Web フォント       | `font-display: swap`                        |
| 広告 / 埋め込み    | 固定コンテナ                                |

## FID 最適化

| 手法                         | 効果                       |
| ---------------------------- | -------------------------- |
| コード分割                   | 初期 JS を削減             |
| Long task                    | <50ms チャンクに分割       |
| Web Worker                   | 重い計算をオフロード       |
| 非クリティカルなものは defer | `defer`/`async` スクリプト |

## 計測

```typescript
import { getCLS, getFID, getLCP } from "web-vitals";

getCLS(console.log);
getFID(console.log);
getLCP(console.log);
```

## チェックリスト

| 項目              | 目標                                |
| ----------------- | ----------------------------------- |
| Lighthouse スコア | ≥90                                |
| LCP 要素          | 優先ロード                          |
| 画像              | サイズ指定、WebP、lazy (below fold) |
| 動的コンテンツ    | スペース確保済み                    |
