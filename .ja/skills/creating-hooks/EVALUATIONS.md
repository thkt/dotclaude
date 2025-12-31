# creating-hooksの評価

## 選択基準

このスキルをトリガーするキーワードとコンテキスト:

- **キーワード**: hook, hookify, rule, block, warn, prevent, pattern, detect, unwanted behavior, dangerous command, coding standards, フック, ルール, ブロック, 警告, 防止, パターン, 検出, コーディング規約
- **コンテキスト**: フック作成、動作防止、/hookifyコマンド

## 評価シナリオ

### シナリオ1: 危険なコマンドの防止

```json
{
  "skills": ["creating-hooks"],
  "query": "rm -rf / のような危険なコマンドをブロックするフックを作りたい",
  "files": [],
  "expected_behavior": [
    "スキルが'ブロック'と'フック'でトリガーされる",
    "パターンマッチングでblockルールを作成",
    "危険なコマンドパターンを定義",
    "settings.jsonへの追加方法を示す",
    "デプロイ前にルールをテスト"
  ]
}
```

### シナリオ2: コーディング規約の適用

```json
{
  "skills": ["creating-hooks"],
  "query": "console.log を使ったら警告を出すフックを作成して",
  "files": [],
  "expected_behavior": [
    "スキルが'警告'と'フック'でトリガーされる",
    "warnルールを作成（blockではない）",
    "console.log検出パターンを定義",
    "ユーザーフレンドリーな警告メッセージを示す",
    "必要に応じてオーバーライドを許可"
  ]
}
```

### シナリオ3: パターン検出ルール

```json
{
  "skills": ["creating-hooks"],
  "query": "特定のパターンを検出してフィードバックするフックを作りたい",
  "files": [],
  "expected_behavior": [
    "スキルが'パターン'と'検出'でトリガーされる",
    "パターンマッチングルールを作成",
    "正規表現またはglobパターン構文を示す",
    "フィードバックメッセージを設定",
    "ルールファイルの場所を文書化"
  ]
}
```

### シナリオ4: タスク完了チェック（Stopイベント）

```json
{
  "skills": ["creating-hooks"],
  "query": "タスク完了前にテストを実行したか確認するフックを作りたい",
  "files": [],
  "expected_behavior": [
    "スキルが'フック'と'タスク完了'でトリガーされる",
    "stopイベントタイプ設定を使用",
    "トランスクリプトベースの条件チェックを作成",
    "テストがない場合のblockアクションを示す",
    "stopイベントフィールドを文書化（会話履歴のためのtranscript）"
  ]
}
```

### シナリオ5: /hookifyコマンドでのカスタムルール

```json
{
  "skills": ["creating-hooks"],
  "query": "/hookify APIキーをハードコードしたら警告を出すルール",
  "files": [],
  "expected_behavior": [
    "スキルが'/hookify [説明]'コマンド形式でトリガーされる",
    "YAML frontmatter付きMarkdownルールファイルを生成",
    "APIキー検出パターンを作成（KEY|SECRET|TOKEN）",
    "非クリティカルな問題のためwarnアクションを設定（blockではない）",
    "ルールを.claude/hookify.[name].local.mdに保存"
  ]
}
```

## ルールタイプリファレンス

| タイプ | アクション | ユースケース |
| --- | --- | --- |
| block | 操作を防止 | 危険なコマンド、セキュリティ違反 |
| warn | 警告を表示、続行を許可 | コードスタイル、ベストプラクティス |

## 手動検証チェックリスト

各シナリオ実行後:

- [ ] スキルがフックキーワードで正しくトリガーされた
- [ ] 正しいイベントタイプ（file/bash/stop/prompt/all）が選択された
- [ ] 正しいアクションタイプ（block/warn）が選択された
- [ ] パターンマッチング構文が正しい（Python正規表現）
- [ ] ルールが正しい場所に保存された（.claude/hookify.*.local.md）
- [ ] 明確なフィードバックメッセージが定義された
- [ ] 必要に応じて条件が適切に設定された

## ベースライン比較

### スキルなし

- 手動でのsettings.jsonフック設定が必要
- Pythonの正規表現エスケープ文字を忘れやすい（例: `\.`でリテラルドット）
- イベントタイプ選択のガイダンスなし（file vs bash vs stop）
- ルールファイルの命名と場所が一貫しない
- パターンの試行錯誤テスト

### スキルあり

- YAML frontmatter付きの宣言的Markdownルール定義
- 例付きのパターン構文ガイダンス（例: `rm\s+-rf`, `console\.log\(`）
- 重大度に基づく明確なblock vs warnアクション選択
- `.claude/hookify.*.local.md`への自動ルールファイル生成
- Anthropicの公式hookifyプラグイン例からの検証済みパターン
