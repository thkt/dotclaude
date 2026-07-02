---
name: issue
description: 構造化されたタイトルと本文で GitHub Issue を生成する。人間と練る工程の受け皿で、premise check と challenge workflow の GO を exit gate として、build workflow に渡せる水準まで issue を練り上げる。
when_to_use: Issue作って, Issue書いて, Issue作成, GitHub Issue, issueを練る, buildに渡す準備
allowed-tools: Bash(gh:*) Bash(cat:*) Bash(ugrep:*) Bash(test:*) Read Task Skill Workflow AskUserQuestion
model: opus
argument-hint: "[issue description]"
---

# /issue - GitHub Issue 生成

構造化されたタイトルと本文で GitHub Issue を生成し、premise check と challenge で下書きの主張を投稿前に検証する。「人間と練る」工程はここで完結させる。challenge workflow の GO 後は research / think workflow を通して `## Plan` 節を書き下ろし、build workflow が plan をそのまま抽出できる issue に仕上げる。

## 入力

`$ARGUMENTS` は Issue 説明。空なら AskUserQuestion で説明を尋ねる。

## 言語

`${CLAUDE_SKILL_DIR}/../../settings.json` から `language` を読み、その言語で Issue 本文とテンプレートを翻訳する。未設定なら英語をデフォルト。技術用語、コード、識別子は翻訳しない。

## 実行

1. `.claude/OUTCOME.md` を読む。不在なら `/outcome` で stub を生成
2. 説明から Why (誰が必要とし、どんな痛みがあり、何が成功か) が読み取れない場合、AskUserQuestion で壁打ちして詰める (§ Why 壁打ち)。feature / bug のみ
3. 説明から種別を検出し (§ 種別判定)、skip 分岐に該当するか判定する (§ Skip 分岐)
4. テンプレートを選ぶ (§ テンプレート選択)
5. テンプレートに従いタイトルと本文を生成し、確定/仮をマーク (§ 確信度マーキング)
6. epic 規模で分割すべきか判定 (§ 分割判定)
7. 下書きした主張を前提チェックでフィルタ (§ 前提チェック)
8. `${CLAUDE_SKILL_DIR}/references/prose-review.md` と、本文言語に対応する空句ファイル (日本語なら `${CLAUDE_SKILL_DIR}/references/phrases.ja.md`、英語なら `${CLAUDE_SKILL_DIR}/references/phrases.en.md`) の基準で本文をインライン精査。step 12 で Plan 節を追記した後は、Plan 節にも同じ基準を適用する
9. challenge workflow で前提を検証 (GO / NO-GO)、feature / bug のみ。NO-GO なら壁打ちで本文を修正して再実行する (§ Adversarial Challenge)
10. research workflow で実装前調査を実行する (§ Research)。skip 分岐該当時は step 10〜12 を飛ばす
11. think workflow で構造化 plan を生成する (§ Think)
12. 構造化 plan を `## Plan` 節として本文に書き下ろし、round-trip fidelity check と前提実在検証を通す (§ Plan 書き下ろし)
13. Issue プレビュー + 仮項目 → AskUserQuestion: "Create this issue?"
14. 本文を一時ファイルに書き出し、ラベルを付けて `gh issue create --body-file` で起票し、出力から Issue URL を取得 (§ ラベル。sandbox 互換で長い本文のエスケープを回避)
15. step 6 で分割を承認していれば、起票した issue を /slice に渡す (§ 分割判定)

## Why 壁打ち

issue の Why を本文起草の前に確立する。docs / chore では省略する。次の 3 点が説明から読み取れるなら質問せず先へ進む。

| 質問                               | 本文での置き場      |
| ---------------------------------- | ------------------- |
| 誰がこれを必要としている？         | What & Why          |
| どんな痛みが存在する？その根拠は？ | What & Why          |
| 計測可能な結果、成功とは何？       | Acceptance Criteria |

- 1 メッセージにつき 1 質問し、仮説 (期待する答え) を推奨回答として添える。ユーザーは仮説を訂正するだけで済む
- コードベースで解決できる疑問は、問う前に Read / ugrep で探索する
- 次に問う質問の答えを予測できるようになったら理解は十分。質問をやめて起草に進む

## 種別判定

判別不能な場合は `feature` をデフォルトとする。タイトルには種別をキャピタライズして角括弧で囲ったプレフィックスを付ける。

| 種別    | 用途                                     |
| ------- | ---------------------------------------- |
| bug     | 既存のものが壊れているか期待通り動かない |
| feature | 新しい能力や拡張要望                     |
| docs    | ドキュメント追加や訂正                   |
| chore   | メンテナンス、設定、依存更新             |

## Skip 分岐

docs / chore と軽微 bug は research / think / plan 書き下ろし (step 10〜12) を飛ばす。軽微 bug の該当例は typo 修正。非該当例は原因未特定の間欠 (intermittent) bug で、この場合は skip せず step 10〜12 を通常どおり通す。skip した issue は本文フッターに「軽微につき /fix で処理してもよい」と注記し、/fix への導線を示す。bug を軽微と判定するのは次の 3 基準を全て満たすときに限る。

| 基準     | 内容                         |
| -------- | ---------------------------- |
| 変更範囲 | 1 ファイルに収まる           |
| 再現     | 再現手順が確定している       |
| 調査     | コードベースの横断調査が不要 |

## テンプレート選択

`gh api "repos/{owner}/{repo}/contents/.github/ISSUE_TEMPLATE" --jq '.[].name'` で `.md` を列挙し、種別に一致する GitHub テンプレート (ファイル名や `name` が種別を含む) があれば、その本文を読んで先頭 frontmatter (`name` / `about` / `labels` / `title`) を外し骨格にする。一致しなければ `${CLAUDE_SKILL_DIR}/templates/<type>.md` を使う。どちらを骨格にしても以降のフロー (確信度マーキング → 前提チェック → 文章レビュー → challenge) は同じく通す。

## 確信度マーキング

本文のどの部分が確定でどの部分が仮かをマークし、実装者が守るべき要件と、未決定の判断・未検証の事実を区別できるようにする。

- 一次マークであって検証ではない。事実の検証は前提チェックに委ねる。
- 控えめにマークし、実装者のアクションが変わる箇所だけに付ける。全行に付けると仮マークが埋もれ、区別を妨げる。
- 仮マークは対象の項目にインラインで置く。Premises セクションは、特定行に紐づかない issue レベルの前提 (デザイン参照、全体的な仮定) 専用に保つ。
- プレビューでは、インライン仮マークと Premises を仮ブロックに集約する。新規内容は足さず、本文が持つものを写す。仮項目が 0 件なら省略する。
- マーカー語は `${CLAUDE_SKILL_DIR}/../../settings.json` の言語設定に従う (英語では `tentative`)。

| 由来                                                                                   | 状態 | 記法        | アクション句                                  |
| -------------------------------------------------------------------------------------- | ---- | ----------- | --------------------------------------------- |
| ユーザーが明示した要件 (What & Why, Acceptance Criteria, 明示的な Scope / Constraints) | 確定 | 無印        | -                                             |
| AI が推論した HOW (配置、方針、フォーマット)、またはユーザーが残した未決定の判断       | 仮   | `(仮: ...)` | 「着手時に判断」/「より良い案があれば変更可」 |
| 事実が未検証 (前提チェックで決着できなかった残余)                                      | 仮   | `(仮: ...)` | 「着手時に再確認」                            |

## 分割判定

独立して実装可能な criteria が 2 つ以上あれば、AskUserQuestion で分割を問う。選択肢は「1 issue のまま」か「epic + 子 issue に分割」。1 つの成果物を検証するだけの細かいチェックは数えず、1 issue 内に留める。N 件の起票は取り消しにくいため自動分割はしない。承認時はこの issue を epic として起票し、前提チェック以降のフローはそのまま epic に通す。番号取得後、step 15 で `Skill("slice", "#<epic 番号>")` を実行する。

## 前提チェック

本文に下書きした主張をふるいにかける。調査フェーズではない。agent は起動せず、コードベース横断の audit や下書きを超えた掘り下げも行わない。事実の主張は断定に変えるのを既定とし、仮への降格は決着できないときに限る。

| 主張の種類                 | 動作                                                                                       |
| -------------------------- | ------------------------------------------------------------------------------------------ |
| 現行コードの主張           | 対象を絞った Read / ugrep で 2〜3 回確認し、本文に根拠を併記する (「grep 確認済み」)       |
| 確認後もあいまいな主張     | 仮に降格する。事実として断定しない                                                         |
| ソースと矛盾が判明した主張 | 本文をソースに合わせて書き直す。食い違い自体が重要なら、確認依頼を添えて Premises に記す   |
| 外部デザイン参照           | 常に未確認扱い。最新かはスキルに判断できないため、リンクと「着手前に最新版を確認」を添える |
| 対象ファイル一覧           | 「調査時点の候補。着手時に再確認」と注記する                                               |
| 本文中のコード例           | 実装ではなく参考である旨を注記する (「参考実装。最終形は着手時に判断」)                    |

## Adversarial Challenge

feature または bug のときだけ `Workflow({name: "challenge", args: {task: <下書きしたタイトル + 本文>}})` を実行する (空なら省略)。build workflow が使うのと同じ検証 (premise → 2 攻撃 → verdict + script gate) をここで先に通すことで、GO の issue は build にそのまま渡せる状態になる。返る verdict と findings は Issue 本文には決して入れず、プレビューの challenge ブロックに集約する。

| Verdict | 扱い                                                                                                  |
| ------- | ----------------------------------------------------------------------------------------------------- |
| GO      | プレビューへ進む。条件が併記されていれば一時的な批評として提示し、本文に折り込むものだけ 1 回反映する |
| NO-GO   | 壁打ちループへ (下記)                                                                                 |

NO-GO の壁打ちループ。why と gate (script gate が降格した場合は rule と detail に残余の一覧が入る) を材料に、残余 1 件ごとに AskUserQuestion で仮説付きの決定を問い、回答を本文に反映して challenge workflow を再実行する。GO になるまで繰り返す (再実行は最大 3 回)。3 回で GO に達しない場合、または ユーザーが「このまま起票」を選んだ場合は、NO-GO の根拠をプレビューに提示し、起票継続 / 取り下げをユーザーに委ねる。gate を素通しする回避策 (残余を本文から消すだけの修正) はしない。残余は決定に変えるか、仮マークで本文に残す。

## Research

feature / bug で skip 分岐非該当のとき、`Workflow({name: "research", args: {question: <issue 本文から導いた調査質問>, repo: <対象リポジトリ>}})` を実行し、結果の要点を本文の根拠と think の入力に反映する。stopped: unresearchable が返ったら、missing の各項目を AskUserQuestion で仮説付きに壁打ちして解消し、回答を反映して再実行する。この壁打ちは最大 2 回。上限に達しても解消しない項目は仮マークで本文に残し、扱いをユーザーに委ねる。

## Think

research の結果を添えて `Workflow({name: "think", args: {task: <タイトル + 本文>, research: <research の要約>}})` を実行し、構造化 plan を得る。ready=false が返ったら、blockers の各項目を AskUserQuestion で仮説付きに問うて決着させ、再実行する。ready=false の決着は最大 2 回。上限に達しても ready にならない項目は仮マークで本文に残し、進め方をユーザーに委ねる。

## Plan 書き下ろし

think が返した構造化 plan を、`${CLAUDE_SKILL_DIR}/references/plan-section.md` の書式で本文の `## Plan` 節として自然言語に書き下ろす。機械用の隠し block は置かない。

1. 書き下ろし。units / tests / 前提 / test_command を plan-section.md の骨格へ写す
2. round-trip fidelity check。書いた Plan 節から plan-section.md の抽出 contract に従い構造を再抽出し、think plan と突合する。突合フィールドは unit id 集合 / depends_on / test id 集合 / test name / test_command。不一致があれば Plan 節を書き直す。書き直しは最大 2 回で、解消しなければ差分をユーザーに提示して判断を仰ぐ
3. 前提実在検証。`### 前提` の各行を、path は `test -f <path>`、anchor は `ugrep -F '<pattern>' <path>` で検証し、失敗した行は修正するか落とす
4. `## Backlog candidates` 節を追記する。plan がスコープ外へ切り出した候補を列挙し、無ければ「なし」と書く

## ラベル

`priority:*` は必須とし、影響度によって critical / high / medium / low のいずれかを付ける。それ以外のラベルは、リポジトリの慣例に合わせる。
