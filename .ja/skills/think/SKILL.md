---
name: think
description: critic-design による敵対的批判を伴う設計探索。生き残ったアプローチを構造化 plan にまとめ、plan-gate で検証して呼び出し元に返す。plan の永続先は issue の Plan 節が唯一。計画意図のないコードベース調査には使わない (代わりに /research)。
when_to_use: 計画して, 設計して, アプローチ検討, 方針決め, planning, design exploration
allowed-tools: Read LS Task AskUserQuestion Bash(ugrep:*) Bash(bfs:*) Bash(python3:*)
model: opus
argument-hint: "[task description]"
hooks:
  PostToolUse:
    - matcher: "Bash"
      hooks:
        - type: command
          command: "~/.claude/hooks/veto/veto.py record bash"
---

# /think - 設計探索

`critic-design` の敵対的批判を伴う深い設計探索。2 つ以上のアプローチを比較して批判にかけ、生き残ったアプローチだけを構造化 plan に到達させる。アプローチは単に選ぶ選択肢ではなく、批判に耐えるか検証する対象として扱う。plan はファイルに書かず会話で呼び出し元に返す。永続する置き場は `/issue` が書き下ろす issue の `## Plan` 節が唯一。

## 入力

`$ARGUMENTS` でタスク説明、調査コンテキストを受け取る。空なら AskUserQuestion でユーザーに確認する。$ARGUMENTS の先頭行がタスクのタイトル。タイトルをそのまま要求する箇所 (`critic-design` の起動プロンプトと plan-gate の `--title`) には、この先頭行を言い換えずに渡す。

## Phase 1: 成果探索

`.claude/OUTCOME.md` を読む。存在しない場合は `/outcome` で生成する。

### Why

最初に達成すべき成果を確立する。以下の 5 つの質問に答え、Why として確定する。5 つ全てが明確になるまで次のステップへ進まない。曖昧または仮定の項目があるときは AskUserQuestion で詰める。

- 誰がこれを必要としている？
- どんな痛みが存在する？その根拠は？
- 計測可能な結果、成功とは何？
- なぜ今やる？
- やらないとどうなる？

### スコープとリスク

`.claude/OUTCOME.md` と Why で未確定なら、スコープ / 優先度 / 制約 / リスクを AskUserQuestion で詰める。確定済みなら省略する。

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

1. 承認された設計を unit (独立して実装可能な成果の束) に分解し、PLAN_SCHEMA 相当 JSON (`{ test_command, units: [{ id, goal, contract, files: string[], depends_on: string[], tests: [{ id, name, given, when, then }] }] }`) に直列化する
2. id は U-001 / T-001 形式の連番を振る。T-NNN は plan 全体で一意にする。unit 間に依存があるときは depends_on を埋める。後続セッションはこれを材料に実装順と並行実行を判断する
3. 各 unit のユニークファイル数を数え、5 以上ならより小さな unit へ再分解する。切り直しは実装手順ではなく成果を軸に行う。contract の変更にあたるため、新しい unit 構成はユーザーと確認する
4. スコープ外へ切り出した候補は plan に入れず backlog candidates に回す
5. JSON を標準入力で `python3 ${CLAUDE_SKILL_DIR}/../../hooks/veto/veto.py plan-gate --title "<タスクのタイトルをそのまま>"` に渡す。タイトルは言い換えず一字一句そのまま渡す。正規化はスクリプト側が行う
6. gate が返した errors は自力で解消して再実行する

## 出力

以下を会話で呼び出し元に返す。

| 項目               | 内容                                                                                            |
| ------------------ | ----------------------------------------------------------------------------------------------- |
| ready              | plan-gate 通過かつ未決着の論点なしで true                                                       |
| plan               | 検証済みの構造化 plan (PLAN_SCHEMA JSON)                                                        |
| blockers           | ready = false の原因のうちユーザー判断が要る論点。呼び出し元が AskUserQuestion で決着させる対象 |
| backlog candidates | スコープ外へ切り出した候補 (issue の `## Backlog candidates` の材料)。無ければ `なし`           |
| 設計要約           | 採用アプローチ、比較したアプローチ、`critic-design` の判定、ADR 要否                            |

## 完了条件

全項目を満たすまで終了しない。満たせない項目は、理由をユーザーに提示する。

- [ ] OUTCOME.md が存在
- [ ] Why を確立
- [ ] 2 つ以上のアプローチを比較
- [ ] 敵対的批判 (critic-design) を適用
- [ ] 設計をユーザーがレビューし承認
- [ ] 構造化 plan が plan-gate を通過し、呼び出し元に返された
