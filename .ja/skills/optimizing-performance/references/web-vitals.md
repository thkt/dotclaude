# Web Vitals最適化

## GoogleのCore Web Vitals

### 3つのコア指標

1. **LCP（Largest Contentful Paint）** - 読み込み速度
   - 目標: 2.5秒以内
   - 最大のコンテンツが表示されるまでの時間

2. **FID（First Input Delay）** - インタラクティブ性
   - 目標: 100ms以内
   - 最初のユーザー操作への応答時間

3. **CLS（Cumulative Layout Shift）** - 視覚的安定性
   - 目標: 0.1未満
   - レイアウトシフトの総量

### 測定方法

```typescript
// web-vitalsライブラリを使用
import { getCLS, getFID, getLCP } from 'web-vitals';

getCLS(console.log);  // CLSを測定
getFID(console.log);  // FIDを測定
getLCP(console.log);  // LCPを測定

// またはChrome DevTools
// 1. DevTools → Lighthouseタブ
// 2. 「レポートを生成」をクリック
// 3. PerformanceセクションでWeb Vitalsを確認
```

---

## LCP（Largest Contentful Paint）の改善

### LCP要素の優先読み込み

```tsx
// Bad: LCP要素を遅延読み込み
function Hero() {
  return (
    <img
      src="hero.jpg"
      loading="lazy"  // LCP要素にlazyは使わない
      alt="Hero"
    />
  );
}

// Good: LCP要素を優先読み込み
function Hero() {
  return (
    <img
      src="hero.jpg"
      loading="eager"  // または省略
      fetchpriority="high"  // 優先度を上げる
      alt="Hero"
    />
  );
}

// Good: プリロード（さらに高速）
// HTML <head>に追加
<link rel="preload" as="image" href="hero.jpg" />
```

### コード分割によるFCPの改善

```tsx
// Bad: すべてのモジュールが初期読み込みに含まれる
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

## 📏 CLS（Cumulative Layout Shift）の改善

### レイアウトシフトの原因と解決策

```tsx
// Bad: サイズのない画像 → レイアウトシフト
function Article() {
  return (
    <>
      <h1>タイトル</h1>
      <img src="article.jpg" alt="記事" />
      {/* 画像が読み込まれるとテキストが下にずれる */}
      <p>コンテンツ...</p>
    </>
  );
}

// Good: 画像サイズを指定
function Article() {
  return (
    <>
      <h1>タイトル</h1>
      <img
        src="article.jpg"
        alt="記事"
        width={800}
        height={600}
        style={{ maxWidth: '100%', height: 'auto' }}
      />
      {/* スペースが確保され、シフトなし */}
      <p>コンテンツ...</p>
    </>
  );
}

// Good: アスペクト比を維持
function Article() {
  return (
    <>
      <h1>タイトル</h1>
      <div style={{ aspectRatio: '16 / 9' }}>
        <img
          src="article.jpg"
          alt="記事"
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </div>
      <p>コンテンツ...</p>
    </>
  );
}

// Bad: 動的コンテンツの挿入 → レイアウトシフト
function Header() {
  const [banner, setBanner] = useState(null);

  useEffect(() => {
    fetchBanner().then(setBanner);  // バナーを取得
  }, []);

  return (
    <>
      {banner && <div className="banner">{banner}</div>}
      {/* バナーが表示されるとコンテンツが下にずれる */}
      <nav>...</nav>
    </>
  );
}

// Good: スペースを確保
function Header() {
  const [banner, setBanner] = useState(null);

  useEffect(() => {
    fetchBanner().then(setBanner);
  }, []);

  return (
    <>
      <div className="banner" style={{ minHeight: banner ? 'auto' : '100px' }}>
        {banner || <div>読み込み中...</div>}
      </div>
      {/* 高さが確保され、シフトなし */}
      <nav>...</nav>
    </>
  );
}
```

---

## プロファイリングツール

### Chrome DevTools Performanceタブ

```markdown
1. **記録を開始**
   - DevTools → Performanceタブ
   - 🔴 Recordボタンをクリック
   - 操作を実行
   - Stopボタンをクリック

2. **分析ポイント**
   - **FPS**: 60fpsを維持しているか？
   - **メインスレッド**: 長いタスク（>50ms）は？
   - **ネットワーク**: リソース読み込み時間
   - **レンダリング**: レイアウト/ペイント頻度

3. **ボトルネックの特定**
   - Summaryタブで時間内訳を確認
   - Scripting（JavaScript実行）
   - Rendering（レイアウト/ペイント）
   - Painting（描画）
```

---

## Web Vitalsチェックリスト

### 初期読み込みの最適化

- [ ] LCP要素を優先読み込み（`fetchpriority="high"`）
- [ ] 重要でないJSを遅延読み込み（`lazy()`）
- [ ] 画像を最適化（WebP、適切なサイズ）
- [ ] 使用していないライブラリを削除
- [ ] バンドルサイズを測定（Webpack Bundle Analyzer）

### レイアウトシフトの防止

- [ ] 画像にwidth/heightを指定
- [ ] 動的コンテンツのスペースを確保
- [ ] フォント読み込みを最適化（`font-display: swap`）

### 測定と監視

- [ ] Lighthouseスコア90以上を維持
- [ ] Web Vitalsを測定（LCP < 2.5s, FID < 100ms, CLS < 0.1）
- [ ] Chrome DevToolsで定期的にプロファイリング

---

## キーポイント

1. **LCP**: 重要なリソースを優先読み込み、ヒーロー画像をプリロード
2. **FID**: JavaScript実行時間を削減、コード分割
3. **CLS**: 動的コンテンツのスペースを確保、画像サイズを指定
4. **常にまず測定** - LighthouseとChrome DevToolsを使用
