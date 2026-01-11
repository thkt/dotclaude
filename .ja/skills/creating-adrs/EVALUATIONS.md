# creating-adrsの評価

## 選択基準

このスキルをトリガーするキーワードとコンテキスト:

- **キーワード**: ADR, Architecture Decision, 決定記録, 技術選定, アーキテクチャ決定, design decision, 技術的決定, 設計判断, create ADR, document decision, 非推奨化, deprecation, プロセス変更, process change
- **コンテキスト**: アーキテクチャ決定、技術選定、設計ドキュメント、/adrコマンド

## 評価シナリオ

### シナリオ1: 技術選定ADR

```json
{
  "skills": ["creating-adrs"],
  "query": "Reactを採用する決定をADRとして記録したい",
  "files": [],
  "expected_behavior": [
    "スキルが'ADR'と'決定'でトリガーされる",
    "MADR形式テンプレートを提供",
    "6フェーズプロセスを実行（事前チェック → テンプレート → 参照 → 校正 → インデックス → 確認）",
    "Status, Context, Decision, Consequencesセクションを含む",
    "重複検出のためpre-checkスクリプトを実行"
  ]
}
```

### シナリオ2: 代替案比較付きADR

```json
{
  "skills": ["creating-adrs"],
  "query": "データベース選定のADRを作成。PostgreSQLとMongoDBを比較した",
  "files": [],
  "expected_behavior": [
    "スキルが'ADR'と'選定'でトリガーされる",
    "両オプションをConsidered Optionsセクションにリスト",
    "各オプションのPros/Consを整理",
    "決定理由を明確に示す",
    "technology-selectionテンプレートを使用"
  ]
}
```

### シナリオ3: プロセス変更ADR

```json
{
  "skills": ["creating-adrs"],
  "query": "CI/CDパイプラインの変更についてADRを書きたい",
  "files": [],
  "expected_behavior": [
    "スキルが'ADR'と'変更'でトリガーされる",
    "process-changeテンプレートを選択",
    "変更前/後の状態を文書化",
    "移行計画を含む",
    "存在する場合は関連ADRを参照"
  ]
}
```

### シナリオ4: 非推奨化ADR

```json
{
  "skills": ["creating-adrs"],
  "query": "古いAPIバージョンを非推奨にするADRを作成",
  "files": [],
  "expected_behavior": [
    "スキルが'非推奨'キーワードでトリガーされる",
    "deprecationテンプレートを選択",
    "非推奨のタイムラインを含む",
    "ユーザー向けの移行パスを文書化",
    "該当する場合は置換ADRにリンク"
  ]
}
```

### シナリオ5: ステータス変更を伴うADR更新

```json
{
  "skills": ["creating-adrs"],
  "query": "既存のADRを更新してステータスを変更したい",
  "files": ["adr/0001-use-typescript.md"],
  "expected_behavior": [
    "スキルが'ADR'と'更新'でトリガーされる",
    "ADR更新のベストプラクティスを説明",
    "Superseded/Deprecatedステータスオプションを示す",
    "関連ADRへのリンク方法をデモ",
    "ADRインデックスを自動更新"
  ]
}
```

## 手動検証チェックリスト

各シナリオ実行後:

- [ ] スキルがADR関連キーワードで正しくトリガーされた
- [ ] MADR形式が正しく従われた
- [ ] 6フェーズプロセスが実行された
- [ ] 重複検出のためpre-check.shが実行された
- [ ] 適切なテンプレートが選択された
- [ ] ADRインデックスが更新された

## ベースライン比較

### スキルなし

- 構造のない手動ADR作成
- 必須セクションを見逃す可能性
- 重複検出なし
- フォーマットが一貫しない

### スキルあり

- 構造化された6フェーズプロセス
- テンプレートベースの作成（technology-selection, process-change, deprecation）
- pre-check.shによる自動重複検出
- MADR形式準拠
- インデックス自動更新
