---
name: think
description: critic-design による敵対的批判を伴う設計探索。生き残ったアプローチを構造化 plan にまとめ、自己点検して呼び出し元に返す。plan の永続先は issue の Plan 節が唯一。計画意図のないコードベース調査には使わない (代わりに /research)。
when_to_use: 計画して, 設計して, アプローチ検討, 方針決め, planning, design exploration
allowed-tools: Read LS Task AskUserQuestion Bash(ugrep:*) Bash(bfs:*)
model: opus
argument-hint: "[task description]"
---

# /think - 設計探索

`critic-design` の敵対的批判を伴う深い設計探索。2 つ以上のアプローチを比較して批判にかけ、生き残ったアプローチだけを構造化 plan に到達させる。アプローチは単に選ぶ選択肢ではなく、批判に耐えるか検証する対象として扱う。plan はファイルに書かず会話で呼び出し元に返す。永続する置き場は `/issue` が書き下ろす issue の `## Plan` 節が唯一。

## 入力

`$ARGUMENTS` でタスク説明、調査コンテキストを受け取る。空なら AskUserQuestion でユーザーに確認する。$ARGUMENTS の先頭行がタスクのタイトル。`critic-design` の起動プロンプトには、この先頭行を言い換えずに渡す。

## Phase 1: 成果探索

`.claude/OUTCOME.md` を読む。存在しない場合は `/outcome` で生成する。

設計の前に Why を確立する。誰が必要とし、どんな痛みがあり (根拠は何か)、何が成功で、なぜ今やり、やらないとどうなるか。この 5 点が $ARGUMENTS と会話から読めるまで AskUserQuestion で詰める。スコープ / 優先度 / 制約 / リスクも未確定なら同時に詰め、確定済みなら省略する。

## Phase 2: 設計探索

最初に関連コードを読み、パターン / 制約 / アーキテクチャ / 先行例を把握する。`.claude/workspace/research/` をタスクのキーワードで `bfs` 検索し、該当する調査出力があれば読んで過去のコンテキストを引き継ぐ。

### アプローチ生成

以下の視点から異なる 2 つ以上のアプローチを生成する。アプローチが独立した技術判断を含むときは、各判断を推奨とトレードオフを添えて別の選択質問として提示する。密に結合した判断のみまとめる。

- Pragmatist で動く中で最も単純な解を問う
- Architect で拡張性と構造の良さを問う
- DX Advocate で開発者 / ユーザー体験に最も良いものを問う

### 設計

1. 生成したアプローチに `critic-design` を起動し、判定テーブルと実行可能項目を受け取る。起動プロンプトにはタスクのタイトルを一字一句そのまま含める。結果は `{ verdict: "GO" | "NO-GO", weaknesses: string[], actionable: string[] }` の JSON オブジェクト 1 つで返すよう指示する
2. verdict が NO-GO なら blocker をその場で解消してから進む (アプローチを直すか critic を再起動する)。発見事項でフィルタした設計を、トレードオフの根拠とともにユーザーに提示し、承認を待つ
3. 承認後、技術判断に ADR が必要か問う。単純な機能では省略する

## Phase 3: Plan 生成

1. 承認された設計を unit (独立して実装可能な成果の束) に分解し、実装順に並べて PLAN_SCHEMA 相当 JSON (`{ test_command, units: [{ id, goal, contract, files: string[], tests: [{ id, name }] }] }`) に直列化する。並び順がそのまま実装順。id は U-001 / T-001 形式の連番で、T-NNN は plan 全体で一意にする
2. contract は生成でなく選択で書く。実在する出典の引用 (コードの path + 公開シンボル > docs/wiki > pinned version の公式 docs deep link) + やりたいこと 1 行。出典が無い新規の形は signature を発明せず、やりたいこと 1 行に留めて形の決定は実装に委ねる
3. tests[].name は条件と期待結果を 1 行で言い切る言明にする (そのままテスト名になる)。given / when / then の詳述はしない。振る舞いの固定はこの言明が担う
4. 各 unit のユニークファイル数が 5 以上なら、成果を軸により小さな unit へ再分解し、新しい unit 構成をユーザーと確認する。スコープ外へ切り出した候補は plan に入れず backlog candidates に回す
5. 直列化した plan を自己点検する (必須フィールドの欠落、id の重複、空の units / tests / goal / contract)。最終検証は build の Load validate が行う

## 出力

以下を会話で呼び出し元に返す。

| 項目               | 内容                                                                                            |
| ------------------ | ----------------------------------------------------------------------------------------------- |
| ready              | plan が自己点検を通過し、かつ未決着の論点なしで true                                            |
| plan               | 検証済みの構造化 plan (PLAN_SCHEMA JSON)                                                        |
| blockers           | ready = false の原因のうちユーザー判断が要る論点。呼び出し元が AskUserQuestion で決着させる対象 |
| backlog candidates | スコープ外へ切り出した候補 (issue の `## Backlog candidates` の材料)。無ければ `なし`           |
| 設計要約           | 採用アプローチ、比較したアプローチ、`critic-design` の判定、ADR 要否                            |
