---
name: think
description: critic-design による adversarial challenge を伴う設計探索。生き残ったアプローチから SOW と Spec を生成する。計画意図のないコードベース調査には使わない (代わりに /research)。
when_to_use: 計画して, 設計して, アプローチ検討, 方針決め, planning, design exploration
allowed-tools: Read Write LS Task AskUserQuestion Bash(ugrep:*) Bash(bfs:*) Bash(python3:*)
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

adversarial challenge を伴う深い設計探索。2 つ以上のアプローチを比較し、`critic-design` による批判にかけ、生き残ったアプローチだけを Spec に到達させる。アプローチは単に選ぶ選択肢ではなく、批判に耐えるか検証する対象として扱う。

## 入力

`$ARGUMENTS` でタスク説明、調査コンテキストを受け取る。空なら AskUserQuestion でユーザーに確認する。$ARGUMENTS の先頭行がタスクの title。verbatim title が要る箇所 (critic-design の spawn prompt と plan-gate の `--title`) には、この先頭行をそのまま言い換えずに渡す。

## Phase 1: アウトカム参照

`.claude/OUTCOME.md` を読む。存在しない場合は `/outcome` で stub を生成する。

## Phase 2: 成果探索

### Why

最初に達成すべき成果を確立する。以下の各質問の回答が、`${CLAUDE_SKILL_DIR}/templates/sow.md` の Why セクションの対応フィールドにあたる。

| 質問                               | フィールド    |
| ---------------------------------- | ------------- |
| 誰がこれを必要としている？         | For           |
| どんな痛みが存在する？その根拠は？ | Problem       |
| 計測可能な結果、成功とは何？       | Outcome       |
| なぜ今やる？                       | Urgency       |
| やらないとどうなる？               | Inaction cost |

5 フィールドが明確になるまで次のステップへ進まない。曖昧または仮定の項目があるときは AskUserQuestion で詰める。

- 1 メッセージにつき 1 質問し、推奨回答とその根拠を添える
- コードベースで解決できるなら、問う前に探索する
- 別の解釈を対比的に提示し、ユーザーが意図を言語化する手助けをする
- 抽象度の高い曖昧な outcome は、対象と測定方法を詰めて具体化する

### スコープとリスク

`.claude/OUTCOME.md` と Why で未確定なら、スコープ / 優先度 / 制約 / リスクを AskUserQuestion で詰める。答えは `${CLAUDE_SKILL_DIR}/templates/sow.md` の Scope と Risks にあたる。確定済みなら省略する。

## Phase 3: 設計探索

最初に関連コードを読み、パターン / 制約 / アーキテクチャ / 先行例を把握する。`.claude/workspace/research/` をタスクのキーワードで `bfs` 検索し、該当する調査出力があれば読んで過去のコンテキストを引き継ぐ。

### アプローチ生成

以下の視点から異なる 2 つ以上のアプローチを生成する。アプローチが独立した技術判断を含むときは、各判断を推奨とトレードオフを添えて別の選択質問として提示する。密に結合した判断のみまとめる。

| 視点        | 質問                                    |
| ----------- | --------------------------------------- |
| Pragmatist  | 動く中で最も単純な解は？                |
| Architect   | 拡張性があり構造が良いものは？          |
| DX Advocate | 開発者 / ユーザー体験に最も良いものは？ |

### 設計

1. 生成したアプローチに `critic-design` を起動し (run_in_background: false)、判定テーブルと実行可能項目を受け取る。spawn prompt にはタスク title を verbatim で含める。結果は `{ verdict: "GO" | "NO-GO", weaknesses: string[], actionable: string[] }` の JSON 1 object で返すよう指示する
2. verdict が NO-GO なら blocker を inline で解消してから進む (アプローチを直すか critic を再起動する)。発見事項でフィルタした設計を、トレードオフの根拠とともにユーザーに提示し、承認を待つ
3. 承認後、技術判断に ADR が必要か問う。単純な機能では省略する

## Phase 4: SOW / Spec 生成

### SOW

- テンプレート `${CLAUDE_SKILL_DIR}/templates/sow.md` を設計コンテキストから埋め、`.claude/workspace/planning/YYYY-MM-DD-{feature}/sow.md` に出力する
- ID は AC-N 形式。セクション固有のルールはテンプレート内の注記に従う

### Spec

- テンプレート `${CLAUDE_SKILL_DIR}/templates/spec.md` を SOW から生成し、`.claude/workspace/planning/{same-dir}/spec.md` に出力する
- ID は FR-001 / T-001 / NFR-001 形式。セクション固有のルールはテンプレート内の注記に従う
- multi-phase では Implementation テーブルの Depends を埋める。後続セッションの並行スケジューリングの handoff になる

### Plan 検証

Spec の Implementation テーブルを plan-gate の PLAN_SCHEMA 相当 JSON (`{ test_command, units: [{ id, goal, contract, files: string[], depends_on: string[], tests: [{ id, name, given, when, then }] }] }`) に直列化し、`python3 ${CLAUDE_SKILL_DIR}/../../hooks/veto/veto.py plan-gate --title "<タスク title を verbatim>"` に stdin で pipe する。ready が false なら errors (空 units / test_command 空 / dangling depends_on / cycle / 空フィールド) を解消してから完了へ進む。title はタスク title を言い換えず literal で渡す (正規化は script が行う)。

### 文章精査

生成後、`${CLAUDE_SKILL_DIR}/references/prose-review.md` と本文言語に対応する空句ファイル (日本語なら `${CLAUDE_SKILL_DIR}/references/phrases.ja.md`、英語なら `${CLAUDE_SKILL_DIR}/references/phrases.en.md`) の基準で `sow.md` と `spec.md` をインライン精査する。

## Phase 5: スコープ調整

各 Phase のユニークファイル数を数え、5 以上なら独立 Unit (独自の SOW / Spec) に分割する。これは実装スライスではなく AC をより小さな outcome ユニットへ再分解することにあたり、contract の変更なので新しい AC はユーザーと確認する。

## 完了条件

全項目を満たすまで終了しない。満たせない項目は、理由をユーザーに提示する。

- [ ] OUTCOME.md が存在
- [ ] Why Statement を確立
- [ ] 2 つ以上のアプローチを比較
- [ ] adversarial challenge (critic-design) を適用
- [ ] 設計をユーザーがレビューし承認
- [ ] sow.md と spec.md が生成
