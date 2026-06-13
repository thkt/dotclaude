<!-- /census の判定基準。Step 6.2 で critic-design に渡す。 -->

## incomplete-contract の例

finding が `incomplete-contract` となるのは、コードの comment が「何が真か」を述べる一方で「何が真であり続けるべきか」を述べていないとき。例: SSRF-safe な HTTP client の field に「redirect disabled for SSRF」と注記があるが、「user URL を扱う future の command はこの client を MUST 使用」という rule が無い場合。security invariant や設計 rationale で頻出するパターンで、reader が「この状態は維持すべき」と推測することに依存している。このような finding は `documented?` の値に関わらず強い ADR 候補となる。欠けている forward-looking な rule こそ、ADR が唯一提供できるものだから。

## ADR worth ヒューリスティック

scout 試運転 2026-05-13 で経験的に導出した heuristic。既存の enforcement mechanism (lint 設定、型システム、自動 test) は、機械的な決定については ADR の文章より強い。ADR は mechanism が役に立たない以下の 2 カテゴリに限定する。

1. tool で強制できない不変条件 (例: 「field X は Y と同時に使ってはいけない」が両方同型のとき)
2. 公開 API 互換性のコミットメント (例: exit code 規約、JSON 出力 schema)

事実宣言型 config (deny.toml, Cargo.toml `[lints.*]`) はそれ自体が source of truth であり、ADR への複製は drift リスクを生む。config block への 1-2 行の policy コメントで通常は十分。
