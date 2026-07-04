---
name: challenge
description: 発見した問題が本物か、提案したアイデアが使えるかを 2 フェーズで判定する。Phase 1 は OUTCOME.md と subagent 検証と advisor 判断をループで回して証拠から分岐を自力解決し、残差は不可逆分岐だけ最小限聞き他は仮定明記で進める grill。Phase 2 は引き出した素材を critic-design 2 体 (内部攻撃 / OUTCOME.md 攻撃) に渡して devil's advocate spawn する。判定は GO / NO-GO を最上段に出す。コードレビュー findings には使わない (/audit を使用)。outcome assertion にも使わない (/assert に組み込み adversarial testing がある)。
when_to_use: devils advocate, 反論, チャレンジ, challenge, 叩いて, 穴探し, grill me, 壁打ち
allowed-tools: Read LS Task AskUserQuestion Bash(node:*)
model: opus
argument-hint: "[proposal file | description]"
hooks:
  PostToolUse:
    - matcher: "Bash"
      hooks:
        - type: command
          command: "~/.claude/hooks/issue-gate/record.sh bash"
---

# /challenge - 提案の GO / NO-GO 判定

発見した問題が本物か、提案したアイデアが使えるかを 2 フェーズで判定し、次の意思決定が検証済みの GO / NO-GO から進むようにする。

## 入力

`$ARGUMENTS` には challenge 対象 (proposal のファイルパスまたは記述) を渡せる。空の場合、会話からの暗黙的な推論は誤判定のリスクが高いため、停止して対象の指定をユーザーに求める。非空なら、その内容を challenge 対象として扱う。$ARGUMENTS が複数行の記述のとき、その先頭行が challenge 対象の title。verbatim title が要る箇所 (critic-design の spawn prompt と verdict-gate の `--title`) には、この先頭行をそのまま言い換えずに渡す。

## Phase 1: Grill

証拠で proposal を自力で grill し、解けない残差だけを可逆性で振り分けてユーザーに返す。提案内の論点はそれぞれ事実か判断に分かれ、事実は検証して中核を覆しうる。検証後に残った判断が残差で、可逆性でユーザーへ振り分ける。

1. OUTCOME.md があれば読む。done 状態 / non-goal / constraint がユーザー intent の一部を担う。無ければ `$ARGUMENTS` と会話から outcome を推定し、AskUserQuestion で確認する。確定した outcome は、Phase 2 の outcome critic に評価軸として渡す
2. 提案内の論点を洗い出し、各論点を事実か判断に振り分ける。事実は証拠で答えが一つに決まる論点、判断は優先順位 / scope / trade-off のように選択が要る論点。振り分けは論点の性質で機械的に決め、advisor の自信度では決めない。判断を事実扱いしない
3. 事実を確かめるループを回す。subagent が事実を並列で検証し、advisor が結果をまとめて振り分けの妥当性を見直し、次に確かめるべき証拠を指す。メインセッションがそれを整理して続けるか決める。証拠を足しても振り分けが変わらなくなったら打ち切る。上限 3 round、確かめきれなかった論点は残差に持ち越す
4. 確かめた事実が提案の中核を覆したら、止めて Phase 2 をスキップする。覆すとは、中核が既に成立済みの状態を狙っている、または確かめた事実と矛盾していること。中核は生きていて一部の主張だけ崩れた場合は、生きている部分で続ける。止めるのは事実の証拠に裏付くときだけで、advisor の見解だけでは止めない。覆した根拠は Why に据える
5. 打ち切り時点で残った論点が残差で、検証を経て証明済みの本物の判断となる。advisor が各残差に best-guess と可逆性 / 影響度を付け、後戻りできない、または影響が大きいものだけ AskUserQuestion で聞く (上限 7 問)。残りは best-guess を仮定として進め、Why に明記する。subagent で飛ばした論点と仮定で進めた残差も Why に残し、ユーザーが後から覆せるようにする

### Phase 2 への出力

grill findings を critic-design 入力スキーマに集約してから起動する。

| 項目             | ソース                                                                                             |
| ---------------- | -------------------------------------------------------------------------------------------------- |
| source           | user-grill                                                                                         |
| artifact_type    | `$ARGUMENTS` から推定 (spec / plan / design / ADR / doc)                                           |
| approach         | 提案の中核の 1 行要約                                                                              |
| decisions        | grill 中に固まったアーキテクチャレベルの判断 (用語確認やスコープ細部は除外)                        |
| trade-offs       | grill 中に表面化した trade-off                                                                     |
| referenced_files | grill 中に参照または読まれたファイル                                                               |
| outcome_ref      | OUTCOME.md のパスと done 状態 / non-goal / constraint の要約 (無ければ Phase 1 で確認した outcome) |

## Phase 2: Devil

Phase 1 で引き出した素材を critic-design 2 体 (内部攻撃 / OUTCOME.md 攻撃) に敵対的に当て、穴を探す。

| Pass                    | 役割                                                           |
| ----------------------- | -------------------------------------------------------------- |
| advisor                 | 証拠統合 / 自己整合チェック / 振り分け監査                     |
| critic-design (内部)    | 提案そのものを攻撃する (隠れた弱点、failure mode)              |
| critic-design (outcome) | outcome に届くかを攻撃する (適合 / non-goal / constraint 侵害) |

1. Phase 1 の集約と元の `$ARGUMENTS` コンテキストから Phase 2 入力を組み立てる
2. critic-design を 2 体、Task で並列に起動する (subagent_type: critic-design、run_in_background: false)。一方は内部攻撃、もう一方は outcome_ref を渡して outcome 攻撃 (outcome を確定できなければスキップ)。ARCHITECTURE.md 等があれば言及する。各 critic-design の spawn prompt には challenge 対象の title を verbatim で含める (言い換えない)。各 critic-design には結果を `{ verdict: "GO" | "NO-GO", weaknesses: string[] }` の JSON 1 object で返すよう指示する
3. 両者の完了を待ち、verdict と weaknesses を突き合わせて重複を除去する
4. 突き合わせた総合 verdict と Phase 1 の残差 (best-guess で進めた仮定。可逆性で irreversible / underspecified を付与) を `{ verdict, assumptions: [{ text, irreversible, underspecified }] }` の VERDICT_SCHEMA 相当 JSON に集約し、`node ${CLAUDE_SKILL_DIR}/../../hooks/issue-gate/verdict-gate.mjs --title "<challenge 対象の title を verbatim>"` に stdin で pipe する。title は challenge 対象の title を言い換えず literal で渡す (正規化は script が行う)。返った verdict を最終判定として採用し、手動で GO に上書きしない。gate は GO を不可逆仮定 / 仮定 7 超 / underspecified のいずれかで NO-GO へ一方向降格する

## 出力

Verdict を最上段に据え、Why に裏付けを集約し、Actionable items で次手を出す。

| セクション       | 内容                                                                                                                                                                                                                                                                                              |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Verdict          | GO / NO-GO。条件付きなら条件を併記。1 行で先頭に                                                                                                                                                                                                                                                  |
| Why              | 事実検証の証拠 (再現 / 反証)、critic-design 2 体 (内部 / outcome) の判定、verdict-gate が降格したなら reasons (irreversible-assumption / max-assumptions / underspecified)、best-guess で進めた残差と可逆性 (ユーザーが覆せる対象) を示す。末尾に verdict が証拠範囲内の判定である旨を 1 行添える |
| Actionable items | 具体アクションのトップ 3 (keep / remove / revise)                                                                                                                                                                                                                                                 |
