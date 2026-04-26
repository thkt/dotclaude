# Web Vitals

## コア指標

| 指標 | 目標   | 測定内容               |
| ---- | ------ | ---------------------- |
| LCP  | <2.5s  | 最大コンテンツ描画時間 |
| FID  | <100ms | 最初の入力遅延         |
| CLS  | <0.1   | 累積レイアウトシフト   |

## LCP最適化

| テクニック    | 実装                                 |
| ------------- | ------------------------------------ |
| 優先読み込み  | ヒーロー画像に`fetchpriority="high"` |
| プリロード    | `<link rel="preload" as="image">`    |
| LCPでlazy禁止 | above-foldから`loading="lazy"`削除   |
| コード分割    | 非クリティカルルートに`lazy()`       |

## CLS防止

| 原因           | 解決策                               |
| -------------- | ------------------------------------ |
| サイズなし画像 | `width`/`height`か`aspect-ratio`追加 |
| 動的コンテンツ | `min-height`でスペース確保           |
| Webフォント    | `font-display: swap`                 |
| 広告/埋め込み  | 固定コンテナ                         |

## FID最適化

| テクニック         | 効果                        |
| ------------------ | --------------------------- |
| コード分割         | 初期JS削減                  |
| 長いタスク         | <50msチャンクに分割         |
| Web Workers        | 重い計算をオフロード        |
| 非クリティカル遅延 | スクリプトを`defer`/`async` |

## 測定

```typescript
import { getCLS, getFID, getLCP } from "web-vitals";

getCLS(console.log);
getFID(console.log);
getLCP(console.log);
```

## チェックリスト

| チェック         | 目標                                 |
| ---------------- | ------------------------------------ |
| Lighthouseスコア | ≥90                                  |
| LCP要素          | 優先読み込み                         |
| 画像             | サイズ指定、WebP、遅延（below fold） |
| 動的コンテンツ   | スペース確保                         |
