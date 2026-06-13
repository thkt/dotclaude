# MADR: Markdown Architectural Decision Records

MADR は、アーキテクチャ決定を記録するための簡潔な markdown テンプレート。このファイルは v4 を前提とする。

## 重要ポイント

| 観点       | 規約                                                                 |
| ---------- | -------------------------------------------------------------------- |
| 粒度       | アーキテクチャ決定 1 件につき 1 つの markdown ファイル               |
| ファイル名 | `nnnn-title-with-dashes.md` (4 桁番号、小文字ハイフン区切りタイトル) |
| 配置       | `docs/decisions/` (MADR デフォルトかつこの skill で固定するパス)     |

## 必須セクション

Confirmation は upstream MADR v4 では任意だが、このスキルでは必須として扱う。

| セクション                    | 目的                             |
| ----------------------------- | -------------------------------- |
| Title                         | `# {title}` (短い宣言文)         |
| Context and Problem Statement | 決定の理由                       |
| Considered Options            | 検討した代替案を箇条書きで挙げる |
| Decision Outcome              | 選択した選択肢と端的な根拠       |
| Confirmation (under Outcome)  | 実装が決定と一致するかの検証方法 |

## 任意セクション

| セクション                   | 含める基準                                     |
| ---------------------------- | ---------------------------------------------- |
| Decision Drivers             | 選択を導いた基準                               |
| Consequences (under Outcome) | `Good, because ...` / `Bad, because ...`       |
| Pros and Cons of the Options | 選択肢ごとの詳細を `### {option}` 見出しで示す |
| More Information             | 移行計画、トリガー、関連リンク                 |

## Status ライフサイクル

| Status                 | 意味                           |
| ---------------------- | ------------------------------ |
| proposed               | レビュー待ち                   |
| accepted               | 承認済み、実装中または完了     |
| rejected               | 検討したが採用せず             |
| deprecated             | 後継 ADR なしで廃止            |
| superseded by ADR-NNNN | ID を記録して別 ADR に置き換え |
