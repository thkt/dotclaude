# バンドルサイズ最適化

## コード分割

### コンポーネントの遅延読み込み

```tsx
// Bad: すべてがmain.jsに含まれる
import HeavyComponent from './HeavyComponent';

function App() {
  const [show, setShow] = useState(false);

  return (
    <>
      <button onClick={() => setShow(true)}>表示</button>
      {show && <HeavyComponent />}
    </>
  );
}
// main.jsにHeavyComponentが含まれる（使用しなくても）

// Good: 遅延読み込み
import { lazy, Suspense } from 'react';

const HeavyComponent = lazy(() => import('./HeavyComponent'));

function App() {
  const [show, setShow] = useState(false);

  return (
    <>
      <button onClick={() => setShow(true)}>表示</button>
      {show && (
        <Suspense fallback={<div>読み込み中...</div>}>
          <HeavyComponent />
        </Suspense>
      )}
    </>
  );
}
// HeavyComponentは必要時に読み込み
```

### ルートベースのコード分割

```tsx
// Bad: すべてのルートが初期バンドルに含まれる
import Dashboard from './Dashboard';
import Settings from './Settings';
import Profile from './Profile';

function App() {
  return (
    <Routes>
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="/profile" element={<Profile />} />
    </Routes>
  );
}

// Good: ルートで分割
import { lazy, Suspense } from 'react';

const Dashboard = lazy(() => import('./Dashboard'));
const Settings = lazy(() => import('./Settings'));
const Profile = lazy(() => import('./Profile'));

function App() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/profile" element={<Profile />} />
      </Routes>
    </Suspense>
  );
}
```

---

## 🌳 Tree Shaking

### 必要なものだけをインポート

```typescript
// Bad: すべてをインポート
import _ from 'lodash';  // ライブラリ全体が含まれる（数百KB）

const result = _.debounce(fn, 300);

// Good: 必要な関数のみをインポート
import debounce from 'lodash/debounce';  // debounceのみ

const result = debounce(fn, 300);

// または
import { debounce } from 'lodash-es';  // ESモジュール版
```

### ライブラリ固有のパターン

```typescript
// Bad: Material-UI全体
import { Button, TextField, Select } from '@mui/material';

// Good: 個別インポート
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Select from '@mui/material/Select';

// Bad: date-fns全体
import { format, parse, addDays } from 'date-fns';

// Good: 個別関数
import format from 'date-fns/format';
import parse from 'date-fns/parse';
import addDays from 'date-fns/addDays';
```

---

## 📊 バンドルサイズの測定

### Webpack Bundle Analyzer

```bash
# インストール
npm install --save-dev webpack-bundle-analyzer

# webpack.config.jsに追加
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');

module.exports = {
  plugins: [
    new BundleAnalyzerPlugin()
  ]
};

# またはpackage.jsonに追加
"scripts": {
  "analyze": "webpack-bundle-analyzer build/stats.json"
}
```

### Vite Bundle Analyzer

```bash
# インストール
npm install --save-dev rollup-plugin-visualizer

# vite.config.ts
import { visualizer } from 'rollup-plugin-visualizer';

export default {
  plugins: [
    visualizer({ open: true })
  ]
}
```

### バンドル分析の読み方

```markdown
確認すべき主要メトリクス:
1. **最大の依存関係** - より軽い代替品に置き換えられるか？
2. **重複した依存関係** - 同じライブラリの複数バージョンがあるか？
3. **未使用コード** - 使用されていないインポートがあるか？
4. **総バンドルサイズ** - 許容範囲内か（クリティカルパスで<200KB）？
```

---

## 画像最適化

### 適切なフォーマットの選択

```html
<!-- Bad: 非効率: 大きなPNG -->
<img src="photo.png" alt="写真" />
<!-- 5MBのPNG -->

<!-- Good: WebP + フォールバック -->
<picture>
  <source srcset="photo.webp" type="image/webp" />
  <img src="photo.jpg" alt="写真" />
</picture>
<!-- 500KBのWebP -->

<!-- Good: Next.js Imageコンポーネント -->
<Image
  src="/photo.jpg"
  alt="写真"
  width={800}
  height={600}
  loading="lazy"  // 遅延読み込み
/>
<!-- 自動最適化 + WebP変換 -->
```

### レスポンシブ画像

```html
<!-- Bad: 固定サイズ: モバイルでも大きな画像 -->
<img src="large-image.jpg" alt="写真" />

<!-- Good: srcsetで複数サイズ -->
<img
  src="photo-800.jpg"
  srcset="
    photo-400.jpg 400w,
    photo-800.jpg 800w,
    photo-1200.jpg 1200w
  "
  sizes="(max-width: 600px) 400px, 800px"
  alt="写真"
/>
<!-- ブラウザが適切なサイズを選択 -->
```

---

## バンドル最適化チェックリスト

### コード分割

- [ ] SPAのルートベース分割
- [ ] 重いコンポーネントの遅延読み込み
- [ ] 条件付き機能の動的インポート
- [ ] ベンダーバンドルの分離

### Tree Shaking

- [ ] ライブラリ全体ではなく特定の関数をインポート
- [ ] CommonJSよりESモジュール（`import/export`）を使用
- [ ] 未使用の依存関係を削除
- [ ] 重複した依存関係をチェック

### 画像最適化

- [ ] フォールバック付きでWebPフォーマットを使用
- [ ] レスポンシブ画像を実装（`srcset`）
- [ ] フォールド下の画像を遅延読み込み
- [ ] デプロイ前に画像を圧縮

### 監視

- [ ] 定期的なバンドルサイズ分析
- [ ] バジェットアラートを設定（バンドル > 閾値で警告）
- [ ] CI/CDでバンドルサイズを追跡
- [ ] 時間の経過を監視（バンドル膨張を防止）

---

## バンドルサイズ目標

### 一般的なガイドライン

```markdown
**初期読み込み（クリティカルパス）**
- 目標: < 200KB（gzipped）
- 最大: < 350KB（gzipped）

**総バンドル**
- 小規模アプリ: < 500KB（gzipped）
- 中規模アプリ: < 1MB（gzipped）
- 大規模アプリ: < 2MB（gzipped）

**個別ルート（遅延読み込み）**
- 目標: < 100KB（gzipped）/ルート
- 最大: < 200KB（gzipped）/ルート
```

### バジェット設定

```json
// package.json
{
  "budget": {
    "main.js": "200kb",
    "vendor.js": "300kb",
    "*.chunk.js": "100kb"
  }
}
```

---

## 高度なテクニック

### 機能の動的インポート

```tsx
// Good: 必要時のみ機能を読み込み
async function enableAnalytics() {
  const analytics = await import('./analytics');
  analytics.init();
}

// ユーザーがクッキーを受け入れた場合のみ読み込み
if (userAcceptedCookies) {
  enableAnalytics();
}
```

### リソースのプリフェッチ

```tsx
// Good: 次に訪問しそうなルートをプリフェッチ
<Link
  to="/dashboard"
  onMouseEnter={() => {
    import('./Dashboard');  // ホバーでプリフェッチ
  }}
>
  ダッシュボード
</Link>
```

---

## キーポイント

1. **コード分割**: ルートと重いコンポーネントで分割
2. **Tree Shaking**: 必要なものだけをインポート
3. **画像最適化**: モダンなフォーマットとレスポンシブ画像を使用
4. **定期的に測定**: バンドルアナライザでサイズを追跡
5. **バジェットを設定**: サイズ制限でバンドル膨張を防止

---

## よくあるミス

### 分割しすぎ

```tsx
// Bad: 小さなコンポーネントを過度に分割
const Button = lazy(() => import('./Button'));  // Buttonは小さい！

// Good: 重いコンポーネントのみ分割
const ChartDashboard = lazy(() => import('./ChartDashboard'));
```

### ベンダーバンドルを無視

```tsx
// Bad: すべてのベンダーが1つの巨大なバンドルに
// vendor.js: 2MB（すべてを含む）

// Good: 使用状況でベンダーを分割
// common.js: React, ReactDOM（どこでも使用）
// charts.js: Chart.js（分析用のみ）
// editor.js: Monaco Editor（コードエディター用のみ）
```

### 測定しない

```tsx
// Bad: 盲目的に最適化
「念のため至る所で遅延読み込みを使おう」

// Good: まず測定、次に最適化
「Bundle analyzerでChartComponentが500KBと判明 → 遅延読み込みする」
```

---

**覚えておく**: 「時期尚早な最適化は諸悪の根源」 - まず測定、次にデータに基づいて最適化。
