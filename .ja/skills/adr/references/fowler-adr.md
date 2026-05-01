# Fowler on Architecture Decision Records

Martin Fowler の bliki エントリで ADR プラクティスを要約したもの。元のコンセプトは Michael Nygard (2011)。

## 中核定義

> An ADR is a short document that captures and explains a single decision relevant to a product or ecosystem.

通常は 1 ページ、最大でも 2 ページ。決定、その文脈、重要な波及効果を記録する。

## 2 つの目的

| 目的         | 価値                                                               |
| ------------ | ------------------------------------------------------------------ |
| 歴史的記録   | 将来の読み手が、なぜシステムが現状の形で構築されているかを理解する |
| 思考の明確化 | 書くこと自体が意見の不一致を浮き彫りにし、解決を促す               |

## 文章スタイル

| 観点         | プラクティス                                       |
| ------------ | -------------------------------------------------- |
| 逆ピラミッド | 重要な情報を先頭に。補足は後ろに                   |
| 簡潔さ       | 1 ページが望ましい。補助資料は外部リンクで         |
| Markdown     | source repo に置き、コードと並べて diff 可能にする |

## ファイル名と配置

| 項目         | 規約                                                   |
| ------------ | ------------------------------------------------------ |
| ディレクトリ | `docs/decisions/`                                      |
| ファイル名   | `NNNN-short-title.md`. 単調増加の連番、内容を表す slug |
| 例           | `0001-HTMX-for-active-web-pages`                       |

## 必須コンテンツ要素

| 要素         | 詳細                                                 |
| ------------ | ---------------------------------------------------- |
| Decision     | 採用した選択                                         |
| Rationale    | この結論に至った問題とトレードオフ                   |
| Alternatives | 真剣に検討した選択肢、それぞれ pros / cons 付き      |
| Consequences | rationale から自明でない場合は明示セクションを設ける |
| Confidence   | 決定が下された時点の確信度                           |
| Triggers     | 再評価を促す可能性のある状況変化                     |

## Advice Process

ADR は Advice Process の中心にある。書く行為自体が、単なる選択の記録ではなく、チーム横断の専門知識引き出しと合意形成に使われる。

## 重要引用

> The most important thing to bear in mind here is brevity. Keep the ADR short and to the point, typically a single page. If there's supporting material, link to it.
