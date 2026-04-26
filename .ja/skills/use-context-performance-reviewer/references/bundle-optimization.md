# バンドル最適化

## サイズ目標

| カテゴリ        | 目標   | 最大  |
| --------------- | ------ | ----- |
| 初期（gzipped） | <200KB | 350KB |
| ルートチャンク  | <100KB | 200KB |
| アプリ全体      | <1MB   | 2MB   |

## コード分割

| パターン       | ユースケース                             |
| -------------- | ---------------------------------------- |
| ルートベース   | `lazy(() => import('./Page'))`           |
| コンポーネント | 重いコンポーネント（チャート、エディタ） |
| 機能ベース     | ユーザーアクションで動的インポート       |

```tsx
const Dashboard = lazy(() => import('./Dashboard'))

<Suspense fallback={<Loading />}>
  <Dashboard />
</Suspense>
```

## Tree Shaking

| Bad                                      | Good                                        |
| ---------------------------------------- | ------------------------------------------- |
| `import _ from 'lodash'`                 | `import debounce from 'lodash/debounce'`    |
| `import { Button } from '@mui/material'` | `import Button from '@mui/material/Button'` |
| `import * as utils from './utils'`       | `import { specific } from './utils'`        |

## 画像最適化

| フォーマット | ユースケース                     |
| ------------ | -------------------------------- |
| WebP         | 写真、複雑な画像                 |
| SVG          | アイコン、シンプルなグラフィック |
| AVIF         | 次世代（フォールバック付き）     |

```html
<picture>
  <source srcset="image.webp" type="image/webp" />
  <img src="image.jpg" alt="" />
</picture>
```

## 分析ツール

| ツール  | コマンド                   |
| ------- | -------------------------- |
| Webpack | `webpack-bundle-analyzer`  |
| Vite    | `rollup-plugin-visualizer` |
| Next.js | `@next/bundle-analyzer`    |

## チェックリスト

| チェック           | アクション               |
| ------------------ | ------------------------ |
| ルート分割         | 全ルート遅延読み込み     |
| 重いコンポーネント | 遅延読み込み             |
| インポート         | 具体的に、barrelでなく   |
| 画像               | WebP、レスポンシブ、遅延 |
| 未使用依存関係     | 削除                     |
| バンドル分析       | 定期チェック             |
