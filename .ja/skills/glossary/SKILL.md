---
name: glossary
description:
  Slackからユビキタス言語を抽出し、ドメイン用語集を生成。 用語集, glossary,
  ユビキタス言語, ドメイン用語, Slackから用語 に言及した時に使用。
allowed-tools: [Bash, Read, Write, Glob, Grep, AskUserQuestion]
model: opus
argument-hint: "[#チャンネル名 または 検索キーワード]"
user-invocable: true
---

# /glossary - ユビキタス言語エクストラクター

Slackの会話からドメイン用語を抽出し、用語集を生成。

## 前提条件

| 変数              | 説明                                    |
| ----------------- | --------------------------------------- |
| `SLACK_TOKEN`     | User OAuth Token (`xoxp-...`)           |
| `SLACK_WORKSPACE` | ワークスペースサブドメイン (`.slack.com` 前) |

API 呼び出し前に `SLACK_TOKEN` が設定されていることを確認。

## 入力

- `$1`（任意）: Slackチャンネル名または検索キーワード
- `--refs`（任意）: 参考資料（mdパス、Google Docs/SheetsのURL）
- 空の場合 → Phase 1でAskUserQuestionにより確認

## 実行

### Phase 1: スコープ定義

AskUserQuestion で確認:

| 質問           | 選択肢 / 入力                                           |
| -------------- | ------------------------------------------------------- |
| Slackチャンネル | チャンネル名またはID（カンマ区切り）                    |
| 期間           | 1週間 / 1ヶ月 / 3ヶ月 / 6ヶ月                           |
| 検索キーワード | 抽出を絞り込む任意のドメインキーワード                  |
| 参考資料       | md パス、Google Docs/Sheets URL（カンマ区切りまたは無し）|
| 出力先         | デフォルト: `docs/domain/glossary.md`                   |
| 既存用語集?    | 既存ファイルパス（マージモード）または無し（新規）      |

### Phase 2: 会話収集

Slack API でチャンネル履歴、キーワード検索、スレッド返信を取得。
`next_cursor` でページング（チャンネル毎 最大5ページ）。

→ curl 例: [reference.md](../../../skills/glossary/reference.md#slack-api-examples)

### Phase 2.5: 参考資料ロード

参考資料が指定されている場合、用語抽出の追加コンテキストとしてロード。

| ソース        | ロード方法                              |
| ------------- | --------------------------------------- |
| ローカル md   | Read tool                               |
| Google Docs   | `use-cli-gcloud` skill (gcloud CLI)   |
| Google Sheets | `use-cli-gcloud` skill (gcloud CLI)   |

参考資料は kiku の DB に埋め込まず、Phase 3 の用語抽出時にクロスリファレンスの文脈として機能する。

### Phase 3: 用語抽出

収集した会話をバッチ単位で解析。各バッチで抽出:

| 抽出対象     | シグナルパターン                                                      |
| ------------ | --------------------------------------------------------------------- |
| 用語候補     | 複数メッセージで繰り返される名詞/フレーズ                             |
| 定義         | "X means Y", "X は Y", "X = Y", "X って Y のこと"                     |
| 同義語       | "X (or Y)", "X aka Y", "X とも言う"                                   |
| 訂正         | "X じゃなくて Y", "not X but Y" — どちらが正規か示すシグナル          |
| コード参照   | バックティック付き識別子でビジネス用語にマップされるもの              |
| 曖昧シグナル | "X って何？", "what do you mean by X" — 明確化が必要な用語            |

各バッチで表を生成: Term, Definition, Code Mapping, Confidence, Evidence, Ref Mapping, Synonyms。参考資料があればクロスリファレンス。

→ 出力テンプレート: [reference.md](../../../skills/glossary/reference.md#extraction-output-template)

#### 確信度レベル

| レベル | 基準                                        |
| ------ | ------------------------------------------- |
| high   | 会話内に明示的な定義あり                    |
| medium | 2件以上のメッセージ文脈から推論             |
| low    | 単一言及、定義は推測的                      |

### Phase 4: コードクロスリファレンス（任意）

プロジェクトのコードベースがある場合、抽出用語をクロスリファレンス:

1. 型名、インターフェース、enum、定数で用語候補を検索
2. Slack 用語をコード識別子にマッチ
3. 抽出出力の `code_mapping` フィールドを埋める

厳密一致には Grep を使用。

### Phase 5: 用語集生成

出力先に用語集を書き出す。用語表、同義語表、曖昧用語セクションを含む。
マージモード: 既存用語集と差分を取ってから書き込み。

→ テンプレート: [reference.md](../../../skills/glossary/reference.md#glossary-template)

## クイックスタート例

```
/glossary #dev #product
/glossary #dev --refs docs/design.md,https://docs.google.com/document/d/xxx
/glossary 決済 注文 ユーザー
/glossary
```

## 出力検証

| フィールド | 基準                                              |
| ---------- | ------------------------------------------------- |
| 定義       | Slack ソース引用: `slack:#{channel}/p{ts}`        |
| 確信度     | 確信度レベル表に従ってマーク                      |
| 曖昧       | 別セクションに列挙、推測で定義しない              |

## エラーハンドリング

| エラー                       | アクション                                        |
| ---------------------------- | ------------------------------------------------- |
| `SLACK_TOKEN` 未設定         | 報告して停止                                      |
| チャンネルアクセス不可       | チャンネル報告、権限確認を提案                    |
| 用語抽出ゼロ                 | 「範囲内にドメイン用語なし」を報告                |
| メッセージ過多 (>1000)       | 期間を絞るかキーワード追加を提案                  |

## 検証

| チェック                              | 必須 |
| ------------------------------------- | ---- |
| 全用語に確信度マーカーが付いている?   | Yes  |
| 曖昧な用語が別セクションに記載?       | Yes  |
| 定義にSlackソースが引用されている?    | Yes  |
| 最終書き込み前にユーザーレビュー済み? | Yes  |
