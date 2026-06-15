---
name: challenge
description: 発見した問題が本物か、提案したアイデアが使えるかを 2 フェーズで判定する。Phase 1 は OUTCOME.md と subagent 検証と advisor 判断をループで回して証拠から分岐を自力解決し、残差は不可逆分岐だけ最小限聞き他は仮定明記で進める grill。Phase 2 は引き出した素材を critic-design 2 体 (内部攻撃 / OUTCOME.md 攻撃) に渡して devil's advocate spawn する。判定は GO / NO-GO を最上段に出す。コードレビュー findings には使わない (/audit を使用)。outcome assertion にも使わない (/assert に組み込み adversarial testing がある)。
when_to_use: devils advocate, 反論, チャレンジ, challenge, 叩いて, 穴探し, grill me, 壁打ち
allowed-tools: Read LS Task AskUserQuestion
model: opus
argument-hint: "[proposal file | description]"
---

# /challenge - 提案の GO / NO-GO 判定

発見した問題が本物か、提案したアイデアが使えるかを 2 フェーズで判定し、次の意思決定が検証済みの GO / NO-GO から進むようにする。

## 入力

`$ARGUMENTS` は challenge 対象 (proposal ファイルパスまたは記述) を含み得る。空なら会話からの暗黙的推論は誤射リスクが高いため、停止して対象指定をユーザーに求める。非空ならそれを challenge 対象として扱う。

## Phase 1 Grill

証拠で proposal を自力で grill し、解けない残差だけを可逆性で振り分けてユーザーに返す。

1. OUTCOME.md があれば読む。done 状態 / non-goal / constraint がユーザー intent の一部を肩代わりする。無ければ `$ARGUMENTS` と会話から outcome を推定し、AskUserQuestion で確認する。確定した outcome は、Phase 2 の outcome critic に評価軸として渡す
2. 設計ツリーの分岐を列挙し、各分岐を事実 (証拠で一意に定まる) か判断 (優先順位 / scope 意図 / trade-off) に分類する。分類は質問種別で機械的に切り、advisor の自信度では切らない。判断を事実扱いすると grill の核が潰れる
3. ループを回す。subagent が事実分岐を並列検証し、advisor が統合 / 分類監査 / 次に解くべき証拠 gap の提示を行い、メインセッションが結果を整理して継続を判断する。証拠を足しても分類が変わらなくなったら打ち切る。上限は 3 round で、解けない分岐は残差に落とす
4. 検証済みの事実分岐が提案の中核主張を反証したら、停止して Phase 2 をスキップする。反証とは、中核がすでに成立済みの状態を対象にしている、または検証済み事実と矛盾していること。中核が生きていて一部の sub-claim だけ死んでいる場合は、生存部分で続行する。反証は事実分岐の証拠に裏付くものに限り、advisor の見解だけでは停止しない。死んだ提案への critic-design は無駄打ちになる。出力では Why に反証を据える
5. 打ち切り時点の残差が、証明済みの真の判断となる。advisor が各残差に best-guess と可逆性 / 影響度を付ける
6. 残差は可逆性と影響度で振り分ける。不可逆または影響大のものだけ AskUserQuestion で質問し (上限 7 問)、それ以外は best-guess を仮定として進め、出力の Why に明記する。subagent で飛ばした分岐と仮定で進めた残差も Why に残し、ユーザーが誤った判定を後から覆せるようにする

### Phase 2 への出力

grill findings を critic-design 入力スキーマに集約してから起動する。

| 項目             | ソース                                                                                            |
| ---------------- | ------------------------------------------------------------------------------------------------- |
| source           | user-grill                                                                                        |
| artifact_type    | `$ARGUMENTS` から推定 (spec / plan / design / ADR / doc)                                          |
| approach         | 提案の中核の 1 行要約                                                                             |
| decisions        | grill 中に固まったアーキテクチャレベルの判断 (用語確認やスコープ細部は除外)                       |
| trade-offs       | grill 中に表面化した trade-off                                                                    |
| referenced_files | grill 中に参照または読まれたファイル                                                              |
| outcome_ref      | OUTCOME.md のパスと done 状態 / non-goal / constraint の要約 (無ければ Step 1 で確認した outcome) |

## Phase 2 Devil

Phase 1 で引き出した素材を critic-design 2 体 (内部攻撃 / OUTCOME.md 攻撃) に敵対的に当て、穴を探す。

| Pass                    | 役割                                                           |
| ----------------------- | -------------------------------------------------------------- |
| advisor                 | 証拠統合 / 自己整合チェック / 分類監査                         |
| critic-design (内部)    | 提案そのものを攻撃する (隠れた弱点、failure mode)              |
| critic-design (outcome) | outcome に届くかを攻撃する (適合 / non-goal / constraint 侵害) |

1. Phase 1 の集約と元の `$ARGUMENTS` コンテキストから Phase 2 入力を組み立てる。
2. critic-design を 2 体、Task で並列に起動する (subagent_type: critic-design、background: false)。一方は内部攻撃、一方は outcome_ref を渡して outcome 攻撃に充てる。outcome を確定できないときは outcome 側をスキップする。ARCHITECTURE.md 等があれば言及する。
3. 両者の完了を待ち、verdict と weaknesses を突き合わせて重複を除去する。

## 出力

Verdict を最上段に据え、Why に裏付けを集約し、Actionable items で次手を出す。

| セクション       | 内容                                                                                                                                                                                                                     |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Verdict          | GO / NO-GO。条件付きなら条件を併記。1 行で先頭に                                                                                                                                                                         |
| Why              | 判定を支える事実分岐の証拠 (再現 / 反証) に、critic-design 2 体 (内部 / outcome) の判定と、best-guess で進めた残差とその可逆性 (ユーザーが覆せる対象) を織り込む。末尾に verdict が証拠範囲内の挑戦である旨を 1 行添える |
| Actionable items | 具体アクションのトップ 3 (keep / remove / revise)                                                                                                                                                                        |
