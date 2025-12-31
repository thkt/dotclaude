# generating-tdd-testsの評価

## 選択基準

このスキルをトリガーするキーワードとコンテキスト:

- **キーワード**: TDD, Test-Driven Development, テスト駆動開発, RGRC, Red-Green-Refactor, Baby Steps, test generation, テスト生成, test design, テスト設計, test cases, テストケース, equivalence partitioning, 同値分割, boundary value, 境界値分析, decision table, coverage, カバレッジ, unit test, ユニットテスト
- **コンテキスト**: /codeでの機能実装、テスト計画、カバレッジ戦略、テスト付きリファクタリング

## 評価シナリオ

### シナリオ1: RGRCサイクル実装

```json
{
  "skills": ["generating-tdd-tests"],
  "query": "ユーザー登録機能をTDDで実装したい",
  "files": ["src/services/UserService.ts"],
  "expected_behavior": [
    "スキルが'TDD'キーワードでトリガーされる",
    "Red-Green-Refactor-Commitサイクルを説明",
    "最もシンプルな失敗するテストで開始（Baby Steps）",
    "t_wadaの2分サイクルアプローチを提案",
    "書くべき具体的な最初のテストケースを提供"
  ]
}
```

### シナリオ2: 体系的テスト設計

```json
{
  "skills": ["generating-tdd-tests"],
  "query": "このバリデーション関数のテストケースを網羅的に考えたい",
  "files": ["src/utils/validators.ts"],
  "expected_behavior": [
    "スキルが'テストケース'と'網羅'でトリガーされる",
    "同値分割技法を適用",
    "境界値を体系的に特定",
    "複雑な条件にはデシジョンテーブルを作成",
    "根拠付きの構造化されたテストケースリストを作成"
  ]
}
```

### シナリオ3: Baby Stepsアプローチ

```json
{
  "skills": ["generating-tdd-tests"],
  "query": "テストを書きながら少しずつ実装を進めたい。どう進めるべき？",
  "files": [],
  "expected_behavior": [
    "スキルが'テスト'と'少しずつ'でトリガーされる",
    "Baby Steps哲学を説明（可能な限り小さな変更）",
    "2分サイクル目標を推奨",
    "進行を示す: シンプル → 複雑なテストケース",
    "一度に実装しすぎることに警告"
  ]
}
```

### シナリオ4: SOW駆動テスト生成

```json
{
  "skills": ["generating-tdd-tests"],
  "query": "SOWの受け入れ基準からテストケースを生成したい",
  "files": [".claude/workspace/planning/sow.md"],
  "expected_behavior": [
    "スキルが'SOW'と'テストケース'でトリガーされる",
    "SOWから受け入れ基準を読み取る",
    "各基準をテストシナリオにマッピング",
    "体系的テスト設計技法を適用",
    "実行可能なテスト構造を生成"
  ]
}
```

### シナリオ5: レガシーコードの特徴テスト

```json
{
  "skills": ["generating-tdd-tests"],
  "query": "既存コードにテストを追加してからリファクタリングしたい",
  "files": ["src/legacy/OldModule.ts"],
  "expected_behavior": [
    "スキルが'既存コード'と'リファクタリング'でトリガーされる",
    "特徴テストの概念を説明",
    "まず現在の動作を記録するようアドバイス",
    "セーフティネットテストの作成方法を示す",
    "安全なリファクタリングのためのTIDYINGS原則にリンク"
  ]
}
```

## 手動検証チェックリスト

各シナリオ実行後:

- [ ] スキルがTDD関連キーワードで正しくトリガーされた
- [ ] RGRCサイクルが適切に参照された
- [ ] Baby Stepsアプローチが強調された（2分サイクル）
- [ ] 体系的テスト設計技法が適用された
- [ ] AAA（Arrange-Act-Assert）パターンが言及された
- [ ] 具体的で実行可能なテスト例が提供された

## ベースライン比較

### スキルなし

- TDD方法論のない一般的なテストアドバイス
- 体系的テスト設計技法を見逃す可能性
- Baby Steps規律の欠如
- SOW統合なし

### スキルあり

- 構造化されたRGRCサイクルガイダンス
- 体系的テストケース生成（同値分割、境界値、デシジョンテーブル）
- t_wada方法論からのBaby Steps規律
- SOW → テスト → 実装フロー
- テスト例で一貫したAAAパターン
