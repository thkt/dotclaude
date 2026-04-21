# Fowler の ADR 記事

Martin Fowler が bliki でまとめた ADR プラクティス。元々の概念は Michael Nygard (2011) が提唱。

## 出典

| トピック              | URL                                                                        |
| --------------------- | -------------------------------------------------------------------------- |
| Fowler bliki          | <https://martinfowler.com/bliki/ArchitectureDecisionRecord.html>           |
| Nygard 2011 (原典)    | <https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions> |
| adr-tools (Pryce CLI) | <https://github.com/npryce/adr-tools>                                      |

## コアな定義

> ADR は、プロダクトやエコシステムに関する single な決定を記録し説明する短いドキュメント。

基本 1 ページ、最大でも 2 ページ。記載する内容は決定本体、そのコンテキスト、重要な波及効果。

## 2 つの目的

| 目的         | 価値                                                       |
| ------------ | ---------------------------------------------------------- |
| 歴史的記録   | 数ヶ月〜数年後に「なぜこう作られているか」を理解可能にする |
| 思考の明確化 | 書く過程で意見の相違が表面化し、議論と解決を促す           |

## 書き方

| 観点         | 実践                                             |
| ------------ | ------------------------------------------------ |
| 逆ピラミッド | 重要な情報を先に。詳細は後に                     |
| 簡潔さ       | 1 ページ推奨。補足は外部リンクで                 |
| Markdown     | コードと同じリポジトリに置き、diff 可能な形式で  |

## ファイル名と配置

| 項目         | 慣例                                          |
| ------------ | --------------------------------------------- |
| ディレクトリ | `doc/adr` が一般的 (プロジェクト規約次第)     |
| ファイル名   | `NNNN-short-title.md`。連番 + 記述的スラッグ  |
| 例           | `0001-HTMX-for-active-web-pages`              |

## ステータス値

| Status     | 意味                                              |
| ---------- | ------------------------------------------------- |
| proposed   | 議論中                                            |
| accepted   | チームが受け入れ、現在 active                     |
| superseded | 後続の ADR に置き換えられた (後継へのリンク必須)  |

accepted 後は再開も改修もしない。変更したい場合は必ず新規 ADR で supersede。

## 必須コンテンツ要素

| 要素         | 内容                                         |
| ------------ | -------------------------------------------- |
| Decision     | 選択した内容                                 |
| Rationale    | そこに至った問題とトレードオフ               |
| Alternatives | 検討した代替案、それぞれの pros / cons       |
| Consequences | Rationale から自明でないなら明示セクションに |
| Confidence   | 決定時の確信度                               |
| Triggers     | 再評価のきっかけとなるコンテキスト変化       |

## Advice Process

ADR は Advice Process の中核でもある。書くこと自体が、チーム横断で専門知と合意を引き出す手段になる。単なる記録ではない。

## Key Quote

> The most important thing to bear in mind here is brevity. Keep the ADR short and to the point, typically a single page. If there's supporting material, link to it.
