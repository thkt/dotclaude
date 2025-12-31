# applying-frontend-patternsの評価

## 選択基準

このスキルをトリガーするキーワードとコンテキスト:

- **キーワード**: React, component, コンポーネント, pattern, パターン, hooks, custom hook, カスタムフック, container, presentational, 分離, state management, 状態管理, composition, HOC, render props, useEffect, useMemo, useCallback
- **コンテキスト**: コンポーネント設計、React開発、フロントエンドアーキテクチャ、パターンレビュー

## 評価シナリオ

### シナリオ1: Container/Presentational分離

```json
{
  "skills": ["applying-frontend-patterns"],
  "query": "このコンポーネントのロジックとUIを分離したい",
  "files": ["src/components/UserList.tsx"],
  "expected_behavior": [
    "スキルが'コンポーネント'と'分離'でトリガーされる",
    "Container/Presentationalパターンを説明",
    "ロジック（Container）とUI（Presentational）部分を特定",
    "リファクタリング例を提供",
    "デメテルの法則準拠のメリットを示す"
  ]
}
```

### シナリオ2: カスタムフック設計

```json
{
  "skills": ["applying-frontend-patterns"],
  "query": "データフェッチのロジックをカスタムフックに切り出したい",
  "files": ["src/components/Dashboard.tsx"],
  "expected_behavior": [
    "スキルが'カスタムフック'でトリガーされる",
    "カスタムフック命名規則を提供（use~プレフィックス）",
    "データフェッチフックパターンを示す",
    "loading/errorステート処理を含める",
    "フックのコンポジションをデモ"
  ]
}
```

### シナリオ3: useMemo/useCallback判断

```json
{
  "skills": ["applying-frontend-patterns"],
  "query": "useMemoとuseCallbackをどこで使うべき？",
  "files": [],
  "expected_behavior": [
    "スキルが'useMemo'と'useCallback'でトリガーされる",
    "各フックの使用タイミングを説明",
    "時期尚早な最適化に対して警告（YAGNI）",
    "パフォーマンス測定アプローチを示す",
    "明確な判断基準を提供"
  ]
}
```

### シナリオ4: 状態管理戦略

```json
{
  "skills": ["applying-frontend-patterns"],
  "query": "状態管理をどう設計すべき？Contextを使うべき？",
  "files": [],
  "expected_behavior": [
    "スキルが'状態管理'と'Context'でトリガーされる",
    "状態の配置判断を説明（ローカル vs グローバル）",
    "Context vs props drillingのトレードオフを示す",
    "状態リフティング vs Contextを推奨",
    "Contextの過剰使用に対して警告"
  ]
}
```

### シナリオ5: コンポーネントコンポジション

```json
{
  "skills": ["applying-frontend-patterns"],
  "query": "コンポーネントの再利用性を高めるパターンは？",
  "files": [],
  "expected_behavior": [
    "スキルが'コンポーネント'と'再利用'でトリガーされる",
    "コンポジションパターンを説明（children, render props, HOC）",
    "継承よりコンポジションを推奨",
    "コンパウンドコンポーネントパターンを示す",
    "props数にミラーの法則（7±2）を適用"
  ]
}
```

## 手動検証チェックリスト

各シナリオ実行後:

- [ ] スキルがフロントエンドパターンキーワードで正しくトリガーされた
- [ ] フレームワーク非依存の概念がReact例で説明された
- [ ] 関連する場合にContainer/Presentationalパターンが適用された
- [ ] コンポーネントの複雑さにミラーの法則（7±2）が参照された
- [ ] 最適化判断にYAGNI原則が適用された
- [ ] コンポーネント結合にデメテルの法則が参照された

## ベースライン比較

### スキルなし

- 一般的なReactアドバイス
- パターンのトレードオフを見逃す可能性
- コンポーネント設計への体系的アプローチなし
- 認知負荷の考慮なし

### スキルあり

- 構造化されたパターン推奨
- Container/Presentational分離ガイダンス
- カスタムフック設計パターン
- 複雑さ制限にミラーの法則
- 最適化判断にYAGNI
