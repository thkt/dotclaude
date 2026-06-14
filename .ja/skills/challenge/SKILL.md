---
name: challenge
description: 発見した問題が本物か、提案したアイデアが使えるかを 2 フェーズで判定する。Phase 1 は OUTCOME.md と subagent 検証と advisor 判断をループで回して証拠から分岐を自力解決し、残差は不可逆分岐だけ最小限聞き他は仮定明記で進める grill。Phase 2 は引き出した素材を critic-design 2 体 (内部攻撃 + OUTCOME.md 攻撃) に渡して devil's advocate spawn する。判定は GO / NO-GO を最上段に出す。コードレビュー findings には使わない (/audit を使用)。outcome assertion にも使わない (/assert に組み込み adversarial testing がある)。
when_to_use: devils advocate, 反論, チャレンジ, challenge, 叩いて, 穴探し, grill me, 壁打ち
allowed-tools: Read LS Task Bash(ugrep:*) Bash(bfs:*) AskUserQuestion
model: opus
argument-hint: "[proposal file | description]"
---

# /challenge - 提案の GO / NO-GO 判定

発見した問題が本物か、提案したアイデアが使えるかを 2 フェーズで判定する。Phase 1 が証拠で自力 grill し、Phase 2 が critic-design 2 体で devil's advocate を当てる。次の意思決定が検証済みの GO / NO-GO を土台に進めるようにする。

## 入力

- `$ARGUMENTS`: challenge 対象 (proposal ファイルパスまたは記述)
- `$ARGUMENTS` が空: 停止して対象指定をユーザーに求める。会話からの暗黙的対象推論は誤射リスクが高い。

## Phase 1 Grill

証拠で自力解決し、残差は可逆性で振り分ける。不可逆分岐だけブロックし、他は仮定明記で進めてユーザーは実行後に veto する。

1. OUTCOME.md があれば読む。done 状態 / non-goal / constraint がユーザー intent の一部を肩代わりする (PREFLIGHT と一貫)。無ければ $ARGUMENTS と会話から outcome を推定し AskUserQuestion で確認する。確定した outcome を Phase 2 の outcome critic に評価軸として渡す
2. 設計ツリーの分岐を列挙し、各分岐を事実 (証拠で一意に定まる) か選好 (優先順位 / scope 意図 / trade-off の選好) に分類する
3. ループを回す。subagent が事実分岐を並列検証 → advisor が統合 + 分類監査 + 次に解くべき証拠 gap を提示 → メインセッションが結果を整理し継続判断。解けなくなったら break
4. 検証済み事実分岐が提案の中核主張を反証したら (中核が既に成立済みの状態を対象、または検証済み事実と矛盾) halt し Phase 2 を skip。中核が生きていて一部 sub-claim だけ死んでいる場合は生存部分で続行する。反証は事実分岐の証拠に裏付くものに限り advisor の見解だけでは halt しない。死んだ提案への critic-design は無駄打ち。出力では Devil verdict に反証を据える
5. break 時点の残差が証明済みの真の選好。advisor が各残差に best-guess と可逆性 / 影響度を付ける
6. 不可逆または影響大の残差だけ AskUserQuestion で最小質問。それ以外は best-guess を仮定として進め、出力の Assumptions に明記する

### ルール

| ルール         | 詳細                                                                                                                                                |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| 分類基準       | 事実か選好かは質問種別で機械的に切る。advisor の自信度では切らない。誤って選好を事実扱いすると grill の核を潰す                                     |
| ループ終了     | advisor が「これ以上の証拠では分類が変わらない」と報告したら break し、残差を真の選好と確定する。上限 3 round。3 round で解けない分岐も残差に落とす |
| 残差の振り分け | 可逆かつ影響小は best-guess の仮定明記で進む。不可逆または影響大のみ AskUserQuestion でブロックし最小質問。上限 7 問                                |
| 自力解決の明示 | subagent で飛ばした分岐と仮定で進めた残差を出力に明記し、ユーザーが誤判定を veto できる逃げ道を残す                                                 |

### Phase 2 への出力

grill findings を critic-design 入力スキーマに集約してから spawn する。

| Field            | 出所                                                                                                                   |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------- |
| source           | "user-grill"                                                                                                           |
| artifact_type    | $ARGUMENTS から推定 (spec / plan / design / ADR / doc)                                                                 |
| approach         | proposal core の 1 行要約                                                                                              |
| decisions        | grill 中に固まったアーキレベル判断 (用語確認や scope 細部は除外)                                                       |
| trade-offs       | grill 中に表面化した trade-off                                                                                         |
| referenced_files | grill 中に参照または読まれたファイル                                                                                   |
| outcome_ref      | OUTCOME.md のパスと done 状態 / non-goal / constraint の要約。OUTCOME.md が無ければ Step 1 で確認した outcome を入れる |

## Phase 2 Devil

Phase 1 advisor と Phase 2 の 2 critic で役割を分け、敵対的 pass の重複を避ける。critic-design の devil's advocate (敵対的に穴を探す) 性は保ち、攻撃軸だけ内部と OUTCOME.md に分ける。

| Pass                            | 役割                                                                                                                                            |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Phase 1 advisor                 | 証拠統合 + 集めた証拠との自己整合チェック + 分類監査                                                                                            |
| Phase 2 critic-design (内部)    | 提案そのものを攻撃する (隠れた弱点、failure mode)                                                                                               |
| Phase 2 critic-design (outcome) | outcome (OUTCOME.md または Step 1 で確認したもの) に届くかを攻撃する (outcome 適合 / non-goal / constraint 侵害)。どちらも取れないときだけ skip |

| Step | アクション                                                                                                                                                                                                                            |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | Phase 1 集約 + 元の $ARGUMENTS コンテキストから Phase 2 入力を組み立てる                                                                                                                                                              |
| 2    | critic-design を 2 体 Task で並列 spawn (subagent_type: critic-design, background: false)。一方は内部攻撃、一方は outcome_ref を渡して outcome 攻撃。outcome がどちらも取れないなら outcome 側は skip。ARCHITECTURE.md 等があれば言及 |
| 3    | 両者の完了待機、verdict + weaknesses を突き合わせる (重複は dedupe)                                                                                                                                                                   |

## 出力

challenge の目的は「発見した問題は本物か、提案したアイデアは使えるか」の判定。Verdict を最上段に据え、以降は判定の裏付けと次手。

| セクション       | 内容                                                             |
| ---------------- | ---------------------------------------------------------------- |
| Verdict          | GO / NO-GO。条件付きなら条件を併記。1 行で先頭に                 |
| Why              | 判定を支える事実分岐の証拠 (再現 / 反証)                         |
| Grill summary    | 表面化した assumption、decisions、trade-offs (各 1 行)           |
| Evidence scope   | 自力解決した分岐一覧と、verdict が証拠範囲内の挑戦である旨の注記 |
| Assumptions      | best-guess で進めた残差とその可逆性。ユーザーが veto する対象    |
| Devil verdict    | critic-design 2 体の verdict (内部 + outcome) を突き合わせて提示 |
| Actionable items | 具体アクションのトップ 3 (keep / remove / revise)                |
