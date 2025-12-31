# reviewing-readabilityの評価

## 選択基準

このスキルをトリガーするキーワードとコンテキスト:

- **キーワード**: readability, 可読性, understandable, 理解しやすい, わかりやすい, clarity, 明確, naming, 命名, variable name, 変数名, function name, 関数名, nesting, ネスト, 深い, function design, 関数設計, comments, コメント, complexity, 複雑, confusing, 難しい, 難読, Miller's Law, ミラーの法則, cognitive load, 認知負荷, over-engineering, 過剰設計, unnecessary abstraction, 不要な抽象化
- **コンテキスト**: コードレビュー、リファクタリング、命名の決定、複雑さの軽減

## 評価シナリオ

### シナリオ1: ミラーの法則違反検出

```json
{
  "skills": ["reviewing-readability"],
  "query": "この関数の引数が多すぎる気がする。どうすべき？",
  "files": ["src/services/OrderService.ts"],
  "expected_behavior": [
    "スキルが'引数が多すぎる'でトリガーされる",
    "ミラーの法則（7±2の認知限界）を参照",
    "具体的なパラメータ数を特定",
    "オブジェクト/型へのグループ化を提案",
    "具体的なリファクタリング例を提供"
  ]
}
```

### シナリオ2: 命名の改善

```json
{
  "skills": ["reviewing-readability"],
  "query": "変数名や関数名の付け方をレビューしてほしい",
  "files": ["src/utils/helpers.ts"],
  "expected_behavior": [
    "スキルが'変数名'と'関数名'でトリガーされる",
    "'誤解されない名前'原則を適用",
    "曖昧で不明確な名前を特定",
    "具体的で明確な代替案を提案",
    "'具体的 > 一般的'ガイドラインを説明"
  ]
}
```

### シナリオ3: 深いネスト

```json
{
  "skills": ["reviewing-readability"],
  "query": "ifのネストが深くて読みにくい。どう直す？",
  "files": ["src/handlers/validation.ts"],
  "expected_behavior": [
    "スキルが'ネスト'と'読みにくい'でトリガーされる",
    "早期リターン/ガード節を推奨",
    "ビフォー/アフターのリファクタリング例を示す",
    "'制御フローを明確に'原則を適用",
    "認知負荷を軽減"
  ]
}
```

### シナリオ4: AIコード臭検出

```json
{
  "skills": ["reviewing-readability"],
  "query": "AI生成コードが過剰に抽象化されている気がする",
  "files": ["src/services/UserService.ts"],
  "expected_behavior": [
    "スキルが'AI'と'抽象化'でトリガーされる",
    "早すぎる抽象化パターンを特定",
    "不要なインターフェース/クラスを検出",
    "オッカムの剃刀を適用",
    "よりシンプルな直接実装を提案"
  ]
}
```

### シナリオ5: 包括的可読性レビュー

```json
{
  "skills": ["reviewing-readability"],
  "query": "このコードの可読性をチェックして",
  "files": ["src/components/Dashboard.tsx"],
  "expected_behavior": [
    "スキルが'可読性'でトリガーされる",
    "'リーダブルコード'原則を適用",
    "チェック項目: 命名、ネスト、関数サイズ、コメント",
    "ミラーの法則遵守を検証（7±2）",
    "優先順位付きの改善提案を提供"
  ]
}
```

## 手動検証チェックリスト

各シナリオ実行後:

- [ ] スキルが可読性関連キーワードで正しくトリガーされた
- [ ] ミラーの法則（7±2）が適切に参照された
- [ ] '理解時間 > 記述時間'原則が適用された
- [ ] 具体的なリファクタリング例が提供された
- [ ] AIコード臭パターンが関連時に検出された
- [ ] 新メンバーテスト: "1分以内に理解できる?"

## ベースライン比較

### スキルなし

- 一般的な可読性アドバイス
- ミラーの法則の限界を見逃す可能性
- AIコード臭検出なし
- 体系的アプローチの欠如

### スキルあり

- 科学的基盤（ミラーの法則）
- 具体的な数値限界（引数≤5、メソッド≤7）
- AI生成コード分析
- 「リーダブルコード」方法論
- 認知負荷の計測
