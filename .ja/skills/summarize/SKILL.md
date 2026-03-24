---
name: summarize
description: URL記事を要約。要点5つ + プロジェクト関連性 + 一行所感。
  URLを共有して要約を求めたとき、または 要約, まとめて, summarize と言ったときに使用。
allowed-tools: Bash(scout:*), Read, AskUserQuestion
model: sonnet
context: fork
argument-hint: "<url>"
user-invocable: true
---

# /summarize - URL記事要約

URLから記事を取得して要約する。

## 入力

- URL: `$1` (必須)
- `$1` が空ならAskUserQuestionで確認

## 実行

1. 記事取得: `scout fetch "$1"`
2. 要約を生成

## 出力フォーマット

会話に直接出力（ファイル保存なし）。

```
## {{Title}}

Author: {{Author or "N/A"}}

### Key Points

- {{要点 1}}
- {{要点 2}}
- {{要点 3}}
- {{要点 4}}
- {{要点 5}}

### Relevance

| Project | Relevance |
| ------- | --------- |
| gates   | {{一行 or "---"}} |
| shields | {{一行 or "---"}} |
| yomu    | {{一行 or "---"}} |
| mado    | {{一行 or "---"}} |

### Verdict

{{一行の総括}}
```

## ルール

| ルール | 内容 |
| ------ | ---- |
| 情報源 | scout fetchの出力のみから要約する。会話コンテキスト、CLAUDE.md、URLパターンからの推測禁止 |
| 取得失敗 | fetchで記事本文が得られなかった場合、その旨を報告して終了。要約を生成しない |
| 要点 | 5つ。具体的に。曖昧な表現禁止 |
| 関連性 | 具体的な機能との接点を書く。「参考になりそう」は禁止 |
| 所感 | 一文。意見を持って書く |
| 前置き不要 | 「この記事は〜について述べています」禁止 |
