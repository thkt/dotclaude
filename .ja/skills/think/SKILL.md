---
name: think
description: critic-design による敵対的批判を伴う設計探索。生き残った案を構造化 plan にまとめ、自己点検して呼び出し元に返す。plan の永続先は issue の Plan 節が唯一。計画意図のないコードベース調査には使わない (代わりに /research)。
when_to_use: 計画して, 設計して, アプローチ検討, 方針決め, planning, design exploration
allowed-tools: Read Write LS Task AskUserQuestion Bash(ugrep:*) Bash(bfs:*) Bash(test:*)
model: opus
argument-hint: "[task description]"
---

# /think - 設計探索

2 つ以上の案を比較して `critic-design` の批判にかけ、生き残った案だけを構造化 plan に到達させる。plan は templates/plan.md の骨格で下書きファイルに書き出し、会話でも返す。永続化は `/issue` が issue の Plan 節へ移設して行う。

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
2. contract と tests[].name の書き方は下の authoring 規則に従う
3. 1 つの unit が触るファイルが 5 つ以上なら、成果を軸により小さな unit へ再分解し、新しい unit 構成をユーザーと確認する。スコープ外へ切り出した候補は plan に入れず backlog candidates に回す
4. 直列化した plan を自己点検する。必須フィールドの欠落、id の重複、空の units / tests / goal / contract を確認して直す。最終検証は build の Load validate が行う
5. 書き出し前検証を実行し、通った plan を `${CLAUDE_SKILL_DIR}/templates/plan.md` の骨格で `.claude/workspace/planning/YYYY-MM-DD-<slug>.plan.md` に書き出す。slug はタスクのタイトルから小文字ハイフン区切りで作る。`## Plan` と `## Backlog candidates` の両節を含める

### contract の authoring 規則

生成でなく選択で書く。prose で振る舞いを素描したり、コード片を新造したりせず、contract は引用 + やりたいことのセットで書く。引用は検証可能で、生成した素描は検証不能なため。

1. 引用は次の優先順で選ぶ。コードベースの既存の形 > docs/wiki のページ > pinned version の公式 docs の該当 API への deep link。コードの形は path + 公開シンボルで書き、前提と同じ stable anchor 規則に従う。外部ライブラリの引用は SOURCING.md の規律に従う
2. 引用に従う点と変える点を、やりたいことの 1 行として添える。引用できる出典が無い新規の形は、signature を発明せずやりたいことの 1 行に留め、形の決定は実装に委ねる。振る舞いは受け入れテストが固定する
3. 引用した path + シンボルは `### 前提` にも載せ、書き出し前検証と build の Revalidate の対象にする

### 前提 (preconditions) の authoring 規則

`### 前提` には次の 5 規則を適用する。

1. 既存の依存先のみを載せる。unit が作る新規作成ファイルは前提に載せない
2. anchor は公開シンボル名の stable anchor を 1 つだけ書き、`ugrep -F` が固定文字列としてそのまま一致するものに限る。private な実装詳細・コメント文字列・行番号・スラッシュで連結したシンボル列は `ugrep -F` で一致しないため anchor にしない
3. 安定したシンボルが無ければ path のみの行にする
4. 各行は path 単独、または path + stable anchor の 2 形式のどちらかにする
5. path はリポジトリルート起点で書く。`workspace/` などリポジトリ接頭辞を落とした path は検証に失敗する

### 書き出し前検証

下書きの書き出し前に、build workflow の Revalidate と同じリポジトリルートで検証する。

1. `### 前提` の各行を検証する。path は `test -f <path>`、anchor は `ugrep -F '<pattern>' <path>` で確認し、失敗した行は修正するか落とす
2. `units[].files` のうち既存ファイルを指す行を `test -f <path>` で検証し、失敗したパスを直す
3. `files` に既存ファイルを載せる unit が 1 つでもあれば、`### 前提` 節に最低 1 行が必要。空 / 不在の節は失敗とみなし、要となる依存を anchor する前提行を 1 つ足す
4. templates/plan.md の行数規則の超過が無いか確認する

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
