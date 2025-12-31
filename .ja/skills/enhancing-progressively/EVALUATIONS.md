# enhancing-progressivelyの評価

## 選択基準

このスキルをトリガーするキーワードとコンテキスト:

- **キーワード**: layout, レイアウト, styling, スタイル, position, 位置, animation, アニメーション, show/hide, 表示/非表示, toggle, トグル, responsive, レスポンシブ, CSS Grid, Flexbox, transform, transition, CSS-only, CSSのみ, JavaScript不要, シンプル
- **コンテキスト**: レイアウト実装、ビジュアルデザイン、CSS vs JS判断、パフォーマンス最適化

## 評価シナリオ

### シナリオ1: CSSファースト判断

```json
{
  "skills": ["enhancing-progressively"],
  "query": "モーダルの表示/非表示をJavaScriptで実装しようとしています",
  "files": [],
  "expected_behavior": [
    "スキルが'表示/非表示'キーワードでトリガーされる",
    "まずCSSのみのソリューションを提案（dialog要素、:target、checkboxハック）",
    "'最良のコードは存在しないコード'哲学を説明",
    "HTML → CSS → JSの優先順位を示す",
    "具体的なCSSのみモーダル例を提供"
  ]
}
```

### シナリオ2: JavaScriptなしのレイアウト

```json
{
  "skills": ["enhancing-progressively"],
  "query": "オーバーレイ表示をどう実装するのがいい？",
  "files": [],
  "expected_behavior": [
    "スキルが'オーバーレイ'でトリガーされる",
    "CSS Gridスタッキング技術を推奨",
    "grid-column/grid-rowオーバーレイパターンを示す",
    "必要でない場合はposition:absoluteを避ける",
    "JavaScriptが不要であることを強調"
  ]
}
```

### シナリオ3: アニメーション実装

```json
{
  "skills": ["enhancing-progressively"],
  "query": "ボタンホバー時にアニメーションをつけたい",
  "files": ["src/components/Button.tsx"],
  "expected_behavior": [
    "スキルが'アニメーション'でトリガーされる",
    "CSS transition/animationを推奨",
    "transformベースのアニメーションを示す（GPUアクセラレーション）",
    "シンプルなエフェクトにはJSベースアニメーションに警告",
    "パフォーマンスの良いCSS例を提供"
  ]
}
```

### シナリオ4: レスポンシブデザイン

```json
{
  "skills": ["enhancing-progressively"],
  "query": "レスポンシブ対応でブレークポイント処理をどうすべき？",
  "files": [],
  "expected_behavior": [
    "スキルが'レスポンシブ'でトリガーされる",
    "CSSメディアクエリ/コンテナクエリを推奨",
    "レイアウトにJavaScriptのresizeリスナーを非推奨",
    "モバイルファーストCSSアプローチを示す",
    "JSより先にCSSのみソリューションに言及"
  ]
}
```

### シナリオ5: 状態ベースのスタイリング

```json
{
  "skills": ["enhancing-progressively"],
  "query": "タブの選択状態に応じてスタイルを変えたい",
  "files": [],
  "expected_behavior": [
    "スキルが'選択状態'と'スタイル'でトリガーされる",
    ":checked, :has(), :target疑似クラスを提案",
    "CSSのみタブ実装を示す",
    "プログレッシブエンハンスメントアプローチを説明",
    "複雑な状態管理の場合のみJS"
  ]
}
```

## 手動検証チェックリスト

各シナリオ実行後:

- [ ] スキルがCSS/レイアウトキーワードで正しくトリガーされた
- [ ] CSSファーストアプローチが推奨された
- [ ] '最良のコードは存在しないコード'哲学が適用された
- [ ] HTML → CSS → JSの優先順位に従った
- [ ] 具体的なCSS例が提供された
- [ ] JavaScriptは必要な場合のみ提案された

## ベースライン比較

### スキルなし

- JavaScriptソリューションをデフォルトにする可能性
- CSSのみの代替を見逃す
- プログレッシブエンハンスメントのマインドセットなし

### スキルあり

- CSSファースト推奨
- モダンCSS技術（Grid, :has(), コンテナクエリ）
- 明確な優先順位: HTML → CSS → JS
- コード選択にYAGNI哲学を適用
