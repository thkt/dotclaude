---
name: glossary
description:
  Slackからユビキタス言語を抽出し、ドメイン用語集を生成。 用語集, glossary,
  ユビキタス言語, ドメイン用語, Slackから用語 に言及した時に使用。
allowed-tools: Bash, Read, Write, Glob, Grep, AskUserQuestion
model: opus
argument-hint: "[#チャンネル名 または 検索キーワード]"
user-invocable: true
---

# /glossary - ユビキタス言語エクストラクター

Slackの会話からドメイン用語を抽出し、用語集を生成。

## 入力

- `$1`（任意）: Slackチャンネル名または検索キーワード
- `--refs`（任意）: 参考資料（mdパス、Google Docs/SheetsのURL）
- 空の場合 → Phase 1でAskUserQuestionにより確認

## 実行

| Phase | アクション     | 説明                                 |
| ----- | -------------- | ------------------------------------ |
| 1     | スコープ定義   | チャンネル、期間、キーワード、出力先 |
| 2     | 会話収集       | Slackメッセージとスレッドの取得      |
| 3     | 用語抽出       | 会話からドメイン用語を分析           |
| 4     | コード相互参照 | 用語をコード識別子にマッチング       |
| 5     | 用語集生成     | 構造化された用語集markdownを書き出し |

詳細な手順は `extracting-ubiquitous-language` スキルに従う。

## クイックスタート例

```
/glossary #dev #product
/glossary #dev --refs docs/design.md,https://docs.google.com/document/d/xxx
/glossary 決済 注文 ユーザー
/glossary
```

## 出力

ファイル: `docs/domain/glossary.md`（デフォルト、Phase 1で変更可能）

## 検証

| チェック                              | 必須 |
| ------------------------------------- | ---- |
| 全用語に確信度マーカーが付いている?   | Yes  |
| 曖昧な用語が別セクションに記載?       | Yes  |
| 定義にSlackソースが引用されている?    | Yes  |
| 最終書き込み前にユーザーレビュー済み? | Yes  |
