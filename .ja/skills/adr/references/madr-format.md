# MADR: Markdown Architectural Decision Records

MADR (「matter」と発音) はアーキテクチャ決定を markdown で記録する合理化テンプレート。元々は "Markdown Architectural Decision Records"。v3.0 以降は "Markdown Any Decision Records" の意味もカバー。

## 出典

| トピック         | URL                                                                 |
| ---------------- | ------------------------------------------------------------------- |
| 公式サイト       | <https://adr.github.io/madr/>                                       |
| リポジトリ       | <https://github.com/adr/madr>                                       |
| 完全テンプレート | <https://github.com/adr/madr/blob/develop/template/adr-template.md> |
| 最新リリース     | MADR 4.0.0 (2024-09-17)                                             |

## 要点

| 観点           | 慣例                                                                      |
| -------------- | ------------------------------------------------------------------------- |
| 粒度           | アーキテクチャ決定 1 件につき markdown 1 ファイル                         |
| ファイル名     | `NNNN-title-with-dashes.md`。4 桁連番 + 小文字ダッシュ区切り              |
| 配置場所       | `docs/decisions/` (MADR デフォルト)。`doc/adr/` や `adr/` も一般的        |
| テンプレート   | v4.0 は `bare` (最小) と `minimal` (推奨) の 2 種類                       |

## 必須セクション

| セクション                    | 目的                             |
| ----------------------------- | -------------------------------- |
| Title                         | `# {タイトル}`。短い宣言文       |
| Context and Problem Statement | 決定の背景                       |
| Considered Options            | 検討した選択肢                   |
| Decision Outcome              | 採用した選択肢と直接的な理由     |

## 任意セクション

| セクション                       | 使う場面                   |
| -------------------------------- | -------------------------- |
| Decision Drivers                 | 判断を導く基準             |
| Positive / Negative Consequences | 決定の波及効果             |
| Pros and Cons of the Options     | 選択肢ごとの詳細評価       |
| Reassessment Triggers            | 再評価のきっかけになる状況 |

## ステータス遷移

`proposed` → `accepted` → `superseded` (新しい ADR が旧を置き換え)。他にも `deprecated`、`rejected` が使われる。

## 例

```markdown
# Use Plain JUnit5 for advanced test assertions

## Context and Problem Statement

How to write readable test assertions for advanced tests?

## Considered Options

- Plain JUnit5
- Hamcrest
- AssertJ

## Decision Outcome

Chosen option: "Plain JUnit5", because it is a standard framework and the features of the other frameworks do not outweigh the drawback of adding a new dependency.
```

## 本リポジトリでの関連

| パス                        | 役割                                   |
| --------------------------- | -------------------------------------- |
| `../../adr/README.md`       | ADR 全体のインデックス (自動生成)      |
| `../templates/`             | この skill 用の MADR 準拠テンプレート  |
