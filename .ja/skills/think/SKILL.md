---
name: think
description: critic-design による敵対的批判を伴う設計探索。生き残った案を構造化 plan にまとめ、自己点検して呼び出し元に返す。plan の永続先は issue の Plan 節が唯一。計画意図のないコードベース調査には使わない (代わりに /research)。
when_to_use: 計画して, 設計して, アプローチ検討, 方針決め, planning, design exploration
allowed-tools: Read Write LS Task AskUserQuestion Bash(ugrep:*) Bash(bfs:*) Bash(test:*)
model: opus
argument-hint: "[task description]"
---

# /think - 設計探索

2 つ以上の案を比較して `critic-design` の批判にかけ、生き残った案だけを構造化 plan に到達させる。plan は plan-section 書式の下書きファイルに書き出して会話でも返す。永続化は `/issue` が issue の Plan 節へ貼り付けて行う。

## 入力

`$ARGUMENTS` でタスク説明と調査の文脈を受け取る。空なら AskUserQuestion でユーザーに確認する。先頭行がタスクのタイトル。

## Phase 1: 成果探索

`.claude/OUTCOME.md` を読む。存在しない場合は `/outcome` で生成する。

設計の前に Why を確立する。誰が必要とし、どんな痛みがあってその根拠は何か、何が成功で、なぜ今やり、やらないとどうなるか。この 5 点が $ARGUMENTS と会話から読めるまで AskUserQuestion で詰める。スコープ / 優先度 / 制約 / リスクも未確定なら同時に詰め、確定済みなら省略する。

## Phase 2: 設計探索

最初に関連コードを読み、パターン / 制約 / アーキテクチャ / 先行例を把握する。`.claude/workspace/research/` をタスクのキーワードで `bfs` 検索し、該当する調査出力があれば読む。

### 案の生成

以下の視点から異なる 2 つ以上の案を生成する。案が独立した技術判断を含むときは、各判断を推奨とトレードオフを添えて別の選択質問として提示する。密に結合した判断のみまとめる。

- 実務家の視点で、動く中で最も単純な解を問う
- 設計家の視点で、拡張性と構造の良さを問う
- 開発体験の視点で、開発者とユーザーに最も良いものを問う

### 設計

1. 生成した案に `critic-design` を起動する。起動プロンプトにはタスクのタイトルを一字一句そのまま含め、結果は `{ verdict: "GO" | "NO-GO", weaknesses: string[], actionable: string[] }` の JSON オブジェクト 1 つで返させる
2. 判定が NO-GO なら blocker をその場で解消してから進む。案を直すか、critic を再起動する。弱点を潰した設計を、トレードオフの根拠とともにユーザーに提示し、承認を待つ
3. 承認後、技術判断に ADR が必要か問う。単純な機能では省略する

## Phase 3: Plan 生成

1. 承認された設計を unit に分解する。unit は独立して実装可能な成果の束。実装順に並べて PLAN_SCHEMA 相当の JSON `{ test_command, units: [{ id, goal, contract, files: string[], tests: [{ id, name }] }] }` に直列化する。id は U-001 / T-001 形式の連番で、T-NNN は plan 全体で一意にする
2. contract と tests[].name の書き方は `${CLAUDE_SKILL_DIR}/references/plan-section.md` の authoring 規則に従う
3. 1 つの unit が触るファイルが 5 つ以上なら、成果を軸により小さな unit へ再分解し、新しい unit 構成をユーザーと確認する。スコープ外へ切り出した候補は plan に入れず backlog candidates に回す
4. 直列化した plan を自己点検する。必須フィールドの欠落、id の重複、空の units / tests / goal / contract を確認して直す。最終検証は build の Load validate が行う
5. plan-section.md § 書き出し前検証 を実行し、通った plan を plan-section.md の書式で `.claude/workspace/planning/YYYY-MM-DD-<slug>.plan.md` に書き出す。slug はタスクのタイトルから小文字ハイフン区切りで作る。`## Plan` と `## Backlog candidates` の両節を含める

## 出力

以下を会話で呼び出し元に返す。

| 項目               | 内容                                                     |
| ------------------ | -------------------------------------------------------- |
| ready              | plan が自己点検を通過し、かつ未決着の論点なしで true     |
| plan               | 自己点検済みの構造化 plan                                |
| plan file          | 書き出した `.plan.md` のパス                             |
| blockers           | ready = false の原因のうちユーザー判断が要る論点         |
| backlog candidates | スコープ外へ切り出した候補。無ければ「なし」             |
| 設計要約           | 採用した案、比較した案、`critic-design` の判定、ADR 要否 |
