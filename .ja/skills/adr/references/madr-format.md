# MADR: Markdown Architectural Decision Records

MADR ("matter" と発音する) は、アーキテクチャ決定を記録するための合理化された markdown テンプレート。v3.0 から略称は "Markdown Any Decision Records" もカバーする。

## 重要ポイント

| 観点       | 規約                                                                |
| ---------- | ------------------------------------------------------------------- |
| 粒度       | アーキテクチャ決定 1 件につき 1 つの markdown ファイル              |
| ファイル名 | `nnnn-title-with-dashes.md`. 4 桁番号、小文字ハイフン区切りタイトル |
| 配置       | `docs/decisions/` (MADR デフォルトかつこの skill で固定するパス)    |
| Templates  | v4 は full, minimal, bare, bare-minimal を提供                      |

## 必須セクション (v4)

| セクション                    | 目的                            |
| ----------------------------- | ------------------------------- |
| Title                         | `# {title}`. 短い宣言文         |
| Context and Problem Statement | なぜ決定するのか                |
| Considered Options            | 検討した代替案を bullet list で |
| Decision Outcome              | 選択した選択肢と直接の正当化    |

## 任意セクション (v4)

| セクション                   | 含める基準                                   |
| ---------------------------- | -------------------------------------------- |
| Decision Drivers             | 選択を導いた基準                             |
| Consequences (under Outcome) | `Good, because ...` / `Bad, because ...`     |
| Confirmation (under Outcome) | 実装が決定と一致するかの検証方法             |
| Pros and Cons of the Options | 選択肢ごとの詳細を `### {option}` の見出しで |
| More Information             | 移行計画、トリガー、関連リンク               |

## YAML Frontmatter (v4, すべて任意)

```yaml
---
status: "proposed | rejected | accepted | deprecated | superseded by ADR-NNNN"
date: 2026-04-25
decision-makers: list everyone involved
consulted: subject-matter experts (two-way comms)
informed: kept up-to-date (one-way comms)
---
```

| フィールド      | 備考                                    |
| --------------- | --------------------------------------- |
| status          | YAML quote 必須。識別子のみ、リンク不可 |
| date            | 決定が最後に更新された日付 YYYY-MM-DD   |
| decision-makers | v4 で `deciders` から改名               |
| consulted       | RACI ベース、双方向                     |
| informed        | RACI ベース、片方向                     |

## Status ライフサイクル

| Status                 | 意味                            |
| ---------------------- | ------------------------------- |
| proposed               | レビュー待ち                    |
| accepted               | 承認済み、実装中または完了      |
| rejected               | 検討したが採用せず              |
| deprecated             | 後継 ADR なしで廃止             |
| superseded by ADR-NNNN | 別の ADR で置き換え (ID を記録) |

## 例 (Minimal)

```markdown
---
status: "accepted"
date: 2026-04-25
---

# Use Plain JUnit5 for advanced test assertions

## Context and Problem Statement

How to write readable test assertions for advanced tests?

## Considered Options

* Plain JUnit5
* Hamcrest
* AssertJ

## Decision Outcome

Chosen option: "Plain JUnit5", because it is a standard framework and the features of the other frameworks do not outweigh the drawback of adding a new dependency.
```
