# optimizing-performanceの評価

## 選択基準

このスキルをトリガーするキーワードとコンテキスト:

- **キーワード**: performance, パフォーマンス, slow, 遅い, optimization, 最適化, rendering, レンダリング, bundle size, バンドルサイズ, Web Vitals, LCP, FID, CLS, Core Web Vitals, re-rendering, 再レンダリング, memoization, メモ化, useMemo, useCallback, React.memo, heavy, 重い, speed, 高速化, lazy loading, code splitting, tree shaking
- **コンテキスト**: パフォーマンスデバッグ、Web Vitals改善、React最適化、バンドル分析

## 評価シナリオ

### シナリオ1: データ駆動分析

```json
{
  "skills": ["optimizing-performance"],
  "query": "このページが遅い。どこから手をつけるべき？",
  "files": [],
  "expected_behavior": [
    "スキルが'遅い'キーワードでトリガーされる",
    "'計測してから最適化'哲学を強調",
    "まずLighthouseまたはChrome DevToolsプロファイリングを提案",
    "データなしでソリューションに飛びつかない",
    "Core Web Vitals（LCP、FID、CLS）を目標として参照"
  ]
}
```

### シナリオ2: React再レンダリング最適化

```json
{
  "skills": ["optimizing-performance"],
  "query": "Reactコンポーネントが頻繁に再レンダリングされて重い",
  "files": ["src/components/DataGrid.tsx"],
  "expected_behavior": [
    "スキルが'再レンダリング'と'重い'でトリガーされる",
    "references/react-optimization.mdセクションをロード",
    "React.memo、useMemo、useCallbackの使い方を説明",
    "React DevTools Profilerの使用方法を示す",
    "早すぎるメモ化に警告（YAGNI）"
  ]
}
```

### シナリオ3: Web Vitals改善

```json
{
  "skills": ["optimizing-performance"],
  "query": "LCPスコアが悪い。改善方法を教えて",
  "files": [],
  "expected_behavior": [
    "スキルが'LCP'キーワードでトリガーされる",
    "references/web-vitals.mdセクションをロード",
    "LCP（Largest Contentful Paint）メトリクスを説明",
    "具体的なLCP最適化テクニックをリスト",
    "Chrome DevToolsでLCP要素を特定することを提案"
  ]
}
```

### シナリオ4: バンドルサイズ削減

```json
{
  "skills": ["optimizing-performance"],
  "query": "バンドルサイズが大きすぎる。どう減らせばいい？",
  "files": ["package.json", "webpack.config.js"],
  "expected_behavior": [
    "スキルが'バンドルサイズ'でトリガーされる",
    "references/bundle-optimization.mdセクションをロード",
    "まずバンドルアナライザーを推奨（計測！）",
    "code splittingとlazy loadingを説明",
    "tree shaking検証方法を示す"
  ]
}
```

### シナリオ5: パフォーマンスレビュー統合

```json
{
  "skills": ["optimizing-performance"],
  "query": "/audit でパフォーマンスレビューをしたい",
  "files": ["src/pages/Dashboard.tsx"],
  "expected_behavior": [
    "スキルが'/audit'と'パフォーマンス'でトリガーされる",
    "performance-reviewerエージェントと統合",
    "体系的なパフォーマンスチェックリストを提供",
    "行参照付きで具体的なボトルネックを特定",
    "影響度で問題を優先順位付け"
  ]
}
```

## プログレッシブ開示の検証

このスキルはセクションベースのコンテンツを使用。正しいセクションロードを検証:

| クエリに含まれる | 期待されるロードセクション |
| --- | --- |
| LCP, FID, CLS, Web Vitals | references/web-vitals.md |
| React, useMemo, useCallback, re-render | references/react-optimization.md |
| bundle, code splitting, lazy | references/bundle-optimization.md |

## 手動検証チェックリスト

各シナリオ実行後:

- [ ] スキルがパフォーマンス関連キーワードで正しくトリガーされた
- [ ] "計測が先"哲学が強調された（Knuthの警告）
- [ ] 適切なリファレンスセクションがロードされた（プログレッシブ開示）
- [ ] 具体的で実行可能な最適化テクニックが提供された
- [ ] 早すぎる最適化アドバイスがなかった（YAGNIを遵守）
- [ ] Chrome DevTools / Lighthouseの使用が言及された

## ベースライン比較

### スキルなし

- 計測の強調がない一般的な最適化アドバイス
- データなしで最適化を提案する可能性
- 体系的なWeb Vitalsフォーカスの欠如
- プログレッシブ開示なし（すべての情報を一度にロード）

### スキルあり

- データ駆動アプローチ（「早すぎる最適化は諸悪の根源」）
- 体系的なCore Web Vitals方法論
- セクションベースロードでコンテキスト使用量を削減
- performance-reviewerエージェントとの統合
- 関連時にReact固有のパターン
