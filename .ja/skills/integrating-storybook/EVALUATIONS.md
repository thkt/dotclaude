# integrating-storybookの評価

## 選択基準

このスキルをトリガーするキーワードとコンテキスト:

- **キーワード**: Storybook, Stories, component API, component specification, props, argTypes, variants, CSF, CSF3, autodocs, frontend component, コンポーネント仕様, ストーリー
- **コンテキスト**: コンポーネント開発、デザインシステム、spec.md生成、/thinkコマンド、/codeコマンド

## 評価シナリオ

### シナリオ1: Component APIからStoriesへ

```json
{
  "skills": ["integrating-storybook"],
  "query": "spec.mdのComponent APIからStoriesを自動生成したい",
  "files": [".claude/workspace/planning/spec.md"],
  "expected_behavior": [
    "スキルが'Stories'と'spec.md'でトリガーされる",
    "spec.mdからComponent APIセクションを読み取る",
    "CSF3形式のStoriesスケルトンを生成",
    "PropsをargTypesに正しくマッピング",
    "autodocs設定を含める"
  ]
}
```

### シナリオ2: Component APIテンプレート

```json
{
  "skills": ["integrating-storybook"],
  "query": "/thinkでButtonコンポーネントの仕様を作成したい",
  "files": [],
  "expected_behavior": [
    "スキルが'/think'と'コンポーネント'でトリガーされる",
    "spec.md用のComponent APIテンプレートを提供",
    "Props、Variants、Statesセクションを含める",
    "Props表形式の例を示す",
    "Stories生成の準備をする"
  ]
}
```

### シナリオ3: CSF3ベストプラクティス

```json
{
  "skills": ["integrating-storybook"],
  "query": "Storybookのベストプラクティスを教えて",
  "files": [],
  "expected_behavior": [
    "スキルが'Storybook'と'ベストプラクティス'でトリガーされる",
    "CSF3形式の利点を説明",
    "meta/args/renderパターンを示す",
    "autodocs統合を推奨",
    "play関数の使用方法をデモ"
  ]
}
```

### シナリオ4: PropsからargTypesへのマッピング

```json
{
  "skills": ["integrating-storybook"],
  "query": "TypeScriptのPropsをStorybookのargTypesに変換したい",
  "files": ["src/components/Button/Button.tsx"],
  "expected_behavior": [
    "スキルが'Props'と'argTypes'でトリガーされる",
    "TypeScript Propsインターフェースを分析",
    "対応するargTypesを生成",
    "union型をselectコントロールとして処理",
    "適切なコントロールタイプを設定"
  ]
}
```

### シナリオ5: バリアントStoriesの生成

```json
{
  "skills": ["integrating-storybook"],
  "query": "コンポーネントの各バリアントのStoriesを作成して",
  "files": ["src/components/Alert/Alert.tsx"],
  "expected_behavior": [
    "スキルが'バリアント'と'Stories'でトリガーされる",
    "Propsからコンポーネントバリアントを特定",
    "各バリアント用のStoryを作成",
    "argsスプレッドパターンを使用",
    "命名規則に従う（Primary、Secondary等）"
  ]
}
```

## 手動検証チェックリスト

各シナリオ実行後:

- [ ] スキルがStorybook関連キーワードで正しくトリガーされた
- [ ] CSF3形式が使用された（CSF2ではなく）
- [ ] Props → argTypesマッピングが正確だった
- [ ] autodocs統合が含まれた
- [ ] 関連時にComponent APIテンプレートが提供された
- [ ] 生成されたコードがすぐに使用可能だった

## ベースライン比較

### スキルなし

- 古いCSF2形式を使用する可能性
- 手動でProps → argTypesマッピング
- spec.md統合なし
- autodocsセットアップの欠落

### スキルあり

- ベストプラクティスに基づくCSF3形式
- 自動Props → argTypesマッピング
- spec.md → Storiesワークフロー
- autodocs統合
- /thinkと/codeコマンドとの連携
