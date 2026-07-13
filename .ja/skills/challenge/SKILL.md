---
name: challenge
description: 発見した問題が本物か、提案したアイデアが使えるかを 2 フェーズで判定する。Phase 1 は OUTCOME.md と subagent 検証と advisor 判断をループで回して証拠から分岐を自力解決し、残差は不可逆分岐だけ最小限聞き他は仮定明記で進める grill。Phase 2 は引き出した素材を critic-design 2 体 (内部攻撃 / OUTCOME.md 攻撃) に渡して devil's advocate spawn する。判定は GO / NO-GO を最上段に出す。コードレビュー findings には使わない (/audit を使用)。outcome assertion にも使わない (/assert に組み込み adversarial testing がある)。
when_to_use: devils advocate, 反論, チャレンジ, challenge, 叩いて, 穴探し, grill me, 壁打ち
allowed-tools: Read LS Task AskUserQuestion
model: opus
argument-hint: "[proposal file | description]"
---

# /challenge - 提案の GO / NO-GO 判定

発見した問題が本物か、提案した案が使えるかを 2 フェーズで判定し、次の意思決定を検証済みの GO / NO-GO から始めさせる。

## 入力

`$ARGUMENTS` に対象 (提案のファイルパスまたは記述) を受け取る。空なら停止して対象の指定をユーザーに求め、会話から推測しない。複数行のときは先頭行を対象のタイトルとして扱い、critic-design の起動プロンプトへ言い換えずそのまま渡す。

## Phase 1: Grill

証拠で提案を自力で締め上げ、解けなかった残差だけを可逆性で振り分けてユーザーに返す。

1. OUTCOME.md があれば読む。無ければ `$ARGUMENTS` と会話から outcome を推定し、AskUserQuestion で確認する。確定した outcome は Phase 2 の outcome 攻撃の評価軸になる
2. 提案の論点を洗い出し、事実 (証拠で答えが一つに決まる) と判断 (優先順位 / スコープ / トレードオフの選択が要る) に振り分ける。振り分けは論点の性質で決め、advisor の自信度では決めない
3. 検証ループを回す。subagent が事実を並列で確かめ、advisor が振り分けを見直して次に確かめる証拠を指し、メインセッションが継続を決める。証拠を足しても振り分けが変わらなくなったら打ち切る (上限 3 周)。確かめきれなかった論点は残差へ持ち越す
4. 確かめた事実が提案の中核を覆したら (狙う状態が既に成立している、または事実と矛盾)、Phase 2 を飛ばして覆した根拠を Why に据える。advisor の見解だけでは止めない。一部の主張だけ崩れたなら、生きている部分で続ける
5. 残った論点が残差。advisor が各残差に仮説と可逆性 / 影響度を付け、後戻りできないか影響の大きいものだけ AskUserQuestion で聞く (上限 7 問)。残りは仮説を仮定として進める。仮定で進めた残差と subagent に委ねた論点は Why に全件残す

### Phase 2 への入力

Phase 1 の発見を critic-design の入力スキーマに集約してから起動する。

| 項目             | ソース                                                                                             |
| ---------------- | -------------------------------------------------------------------------------------------------- |
| source           | user-grill                                                                                         |
| artifact_type    | `$ARGUMENTS` から推定 (spec / plan / design / ADR / doc)                                           |
| approach         | 提案の中核の 1 行要約                                                                              |
| decisions        | Phase 1 で固まったアーキテクチャ水準の判断 (用語確認やスコープ細部は除く)                          |
| trade-offs       | Phase 1 で表面化したトレードオフ                                                                   |
| referenced_files | Phase 1 で参照したファイル                                                                         |
| outcome_ref      | OUTCOME.md のパスと done 状態 / non-goal / constraint の要約 (無ければ Phase 1 で確認した outcome) |

## Phase 2: Devil

Phase 1 の素材を critic-design 2 体 (内部攻撃 / OUTCOME.md 攻撃) に敵対的に当て、穴を探す。

| Pass                    | 役割                                                             |
| ----------------------- | ---------------------------------------------------------------- |
| advisor                 | 証拠統合 / 自己整合チェック / 振り分け監査                       |
| critic-design (内部)    | 提案そのものを攻撃する (隠れた弱点と破綻の経路)                  |
| critic-design (Outcome) | outcome に届くかを攻撃する (適合 / non-goal / constraint の侵害) |

1. Phase 1 の集約と元の `$ARGUMENTS` から入力を組み立てる
2. critic-design を Task で 2 体並列に起動する (subagent_type: critic-design、run_in_background: false)。一方は内部攻撃、もう一方に `outcome_ref` を渡して outcome 攻撃 (outcome を確定できなければ省略)。`ARCHITECTURE.md` 等があれば言及する。起動プロンプトに対象のタイトルをそのまま含め、結果は `{ verdict: "GO" | "NO-GO", weaknesses: string[] }` の JSON 1 object で返させる
3. 両者の完了を待ち、判定と弱点を突き合わせて重複を除く
4. 総合判定と Phase 1 の残差を VERDICT_SCHEMA (`{ verdict, assumptions: [{ text, irreversible, underspecified }] }`) に集約する。不可逆な仮定が残る / 仮定が 7 件を超える / underspecified な仮定があるときは、内容の出来に関わらず NO-GO へ降格し、手動で GO に戻さない

## 出力

判定を最上段に、裏付けを Why に、次手を Actionable items に置く。

| セクション       | 内容                                                                                            |
| ---------------- | ----------------------------------------------------------------------------------------------- |
| Verdict          | GO / NO-GO を 1 行で先頭に置く。条件付きなら条件を、降格時は理由を併記する                      |
| Why              | 事実検証の結果、critic-design 2 体 (内部 / outcome) の判定、仮定で進めた残差の全件 (可逆性付き) |
| Actionable items | 具体アクションのトップ 3 (keep / remove / revise)                                               |
