# バンドル最適化

## サイズ目標

| カテゴリ           | 目標   | 上限  |
| ------------------ | ------ | ----- |
| Initial (gzipped)  | <200KB | 350KB |
| ルートごとの chunk | <100KB | 200KB |
| アプリ全体         | <1MB   | 2MB   |

## コード分割

| パターン       | ユースケース                            |
| -------------- | --------------------------------------- |
| ルート単位     | `lazy(() => import('./Page'))`          |
| コンポーネント | 重いコンポーネント (チャート、エディタ) |
| 機能単位       | ユーザー操作時の動的 import             |

```tsx
const Dashboard = lazy(() => import('./Dashboard'))

<Suspense fallback={<Loading />}>
  <Dashboard />
</Suspense>
```

## ツリーシェイキング

| 悪い例                                   | 良い例                                      |
| ---------------------------------------- | ------------------------------------------- |
| `import _ from 'lodash'`                 | `import debounce from 'lodash/debounce'`    |
| `import { Button } from '@mui/material'` | `import Button from '@mui/material/Button'` |
| `import * as utils from './utils'`       | `import { specific } from './utils'`        |

## 画像最適化

| フォーマット | ユースケース                     |
| ------------ | -------------------------------- |
| WebP         | 写真、複雑な画像                 |
| SVG          | アイコン、シンプルなグラフィック |
| AVIF         | 次世代 (フォールバックと併用)    |

```html
<picture>
  <source srcset="image.webp" type="image/webp" />
  <img src="image.jpg" alt="" />
</picture>
```

## 解析ツール

| ツール  | コマンド                   |
| ------- | -------------------------- |
| Webpack | `webpack-bundle-analyzer`  |
| Vite    | `rollup-plugin-visualizer` |
| Next.js | `@next/bundle-analyzer`    |

## チェックリスト

| 項目               | アクション               |
| ------------------ | ------------------------ |
| ルート分割         | 全ルートを lazy ロード   |
| 重いコンポーネント | lazy ロード              |
| imports            | barrel ではなく個別      |
| 画像               | WebP、レスポンシブ、lazy |
| 未使用依存         | 削除                     |
| バンドル解析       | 定期的にチェック         |
