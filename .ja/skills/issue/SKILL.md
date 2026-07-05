---
name: issue
description: 構造化されたタイトルと本文で GitHub Issue を生成する。人間と練る工程の受け皿で、premise check と challenge skill の GO を exit gate として、build workflow に渡せる水準まで issue を練り上げる。
when_to_use: Issue作って, Issue書いて, Issue作成, GitHub Issue, issueを練る, buildに渡す準備
allowed-tools: Bash(gh:*) Bash(cat:*) Bash(ugrep:*) Bash(test:*) Bash(python3:*) Read Task Skill AskUserQuestion
model: opus
argument-hint: "[issue description]"
hooks:
  PreToolUse:
    - matcher: "Bash"
      hooks:
        - type: command
          command: "~/.claude/hooks/veto/pre-issue-create.sh"
  PostToolUse:
    - matcher: "Bash"
      hooks:
        - type: command
          command: "~/.claude/hooks/veto/veto.py record bash"
    - matcher: "AskUserQuestion"
      hooks:
        - type: command
          command: "~/.claude/hooks/veto/veto.py record skip"
---

# /issue - GitHub Issue 生成

構造化されたタイトルと本文で GitHub Issue を生成し、premise check と challenge で下書きの主張を投稿前に検証する。「人間と練る」工程はここで完結させる。challenge の GO 後は research / think を通して `## Plan` 節を書き下ろし、build workflow が plan をそのまま抽出できる issue に仕上げる。

## 入力

`$ARGUMENTS` は Issue 説明。空なら AskUserQuestion で説明を尋ねる。

## 言語

`${CLAUDE_SKILL_DIR}/../../settings.json` から `language` を読み、その言語で Issue 本文とテンプレートを翻訳する。未設定なら英語をデフォルトとする。英語のまま残すのは識別子 / コード / コマンド / 固有名だけで、設定言語に平易な同義語がある英単語を地の文に混ぜない。テンプレート由来の見出しと Plan 節の抽出キーワードは英語のまま維持する。

## タイトル規律

タイトルは Phase 1 で確定し、challenge / research / think / `gh issue create` には一字一句同一の文字列を渡す。veto はこの title で evidence bundle を照合するため、ずれると起票が拒否される。

## Phase 1: 起草

1. `.claude/OUTCOME.md` を読む。不在なら `/outcome` で stub を生成する
2. 説明から種別を検出し、Skip 分岐に該当するか判定する
3. feature / bug で、Why (誰が必要とし、どんな痛みがあり、何が成功か) が説明から読み取れない場合、壁打ちで詰める
4. テンプレートを選び、タイトルと本文を生成し、確定 / 仮を `${CLAUDE_SKILL_DIR}/references/tentative-marking.md` の基準でマークする
5. epic 規模で分割すべきか判定する

### 種別判定

判別不能な場合は `feature` をデフォルトとする。タイトルには種別をキャピタライズして角括弧で囲ったプレフィックスを付ける。

| 種別    | 用途                                     |
| ------- | ---------------------------------------- |
| bug     | 既存のものが壊れているか期待通り動かない |
| feature | 新しい能力や拡張要望                     |
| docs    | ドキュメント追加や訂正                   |
| chore   | メンテナンス、設定、依存更新             |

### Skip 分岐

docs / chore と軽微な bug は Phase 2〜3 を飛ばす。代わりに header `判定スキップ` の AskUserQuestion で免除をユーザーに確認する (選択肢は検出した種別)。この確認が veto の skip 記録になり、adversarial フローを経ない create を通す。skip した issue は、本文フッターに「軽微につき /fix で処理してもよい」と注記し、/fix への導線を示す。bug を軽微と判定するのは、次の 3 基準をすべて満たすときに限る。典型例は typo 修正。原因未特定の間欠 (intermittent) bug は該当せず、skip せず Phase 2〜3 を通常どおり通す。

| 基準     | 内容                         |
| -------- | ---------------------------- |
| 変更範囲 | 1 ファイルに収まる           |
| 再現     | 再現手順が確定している       |
| 調査     | コードベースの横断調査が不要 |

### Why 壁打ち

issue の Why を、本文起草の前に確立する。1 メッセージにつき 1 質問し、仮説 (期待する答え) を推奨回答として添える。コードベースで解決できる疑問は、問う前に Read / ugrep で探索する。次の 3 点が説明から読み取れるか、次に問う質問の答えを予測できるようになったら、質問をやめて起草に進む。

| 質問                               | 本文での置き場      |
| ---------------------------------- | ------------------- |
| 誰がこれを必要としている？         | What & Why          |
| どんな痛みが存在する？その根拠は？ | What & Why          |
| 計測可能な結果、成功とは何？       | Acceptance Criteria |

### テンプレート選択

`gh api "repos/{owner}/{repo}/contents/.github/ISSUE_TEMPLATE" --jq '.[].name'` で `.md` を列挙する。種別に一致する GitHub テンプレート (ファイル名や `name` が種別を含む) があれば、その本文を読んで先頭 frontmatter (`name` / `about` / `labels` / `title`) を外し骨格にする。一致しなければ `${CLAUDE_SKILL_DIR}/templates/<type>.md` を使う。どちらを骨格にしても、以降のフローは同じく通す。

### 分割判定

独立して実装可能な criteria が 2 つ以上あれば、AskUserQuestion で分割を問う。選択肢は「1 issue のまま」か「epic と子 issue に分割」。1 つの成果物を検証するだけの細かいチェックは数えず、1 issue 内に留める。N 件の起票は取り消しにくいため、自動分割はしない。承認時はこの issue を epic として起票し、以降のフローはそのまま epic に通す。番号取得後、Phase 4 で /slice に渡す。

## Phase 2: 検証

feature / bug かつ Skip 分岐に非該当のときだけ、Phase 2〜3 を通す。

1. 下書きした主張を `${CLAUDE_SKILL_DIR}/references/premise-check.md` の基準でふるいにかける。調査フェーズではなく、agent は起動しない。事実の主張は断定に変えるのを既定とし、仮への降格は決着できないときに限る
2. `${CLAUDE_SKILL_DIR}/references/prose-review.md` と、本文言語に対応する空句ファイル (日本語なら `phrases.ja.md`、英語なら `phrases.en.md`) の基準で本文をインライン精査する。Phase 3 で Plan 節を追記した後は、Plan 節にも同じ基準を適用する
3. challenge で前提を検証する

### Adversarial Challenge

`Skill("challenge", "<下書きしたタイトル + 本文>")` を実行する。渡す文字列の先頭行を issue のタイトルにし、それが challenge の verbatim title として critic 起動と verdict-gate に流れるようにする (veto の challenge evidence になる)。build workflow と同じ検証 (premise → 2 攻撃 → verdict + script gate) をここで先に通すことで、GO の issue は build にそのまま渡せる。返る verdict と findings は Issue 本文には決して入れず、プレビューの challenge ブロックに集約する。

NO-GO のときは壁打ちループに入る。why と gate (script gate が降格した場合は rule と detail に残余の一覧が入る) を材料に、残余 1 件ごとに AskUserQuestion で仮説付きの決定を問い、回答を本文に反映して challenge を再実行する。GO になるまで繰り返す (最大 3 回)。3 回で GO に達しない場合、またはユーザーが「このまま起票」を選んだ場合は、NO-GO の根拠をプレビューに提示し、起票継続 / 取り下げをユーザーに委ねる。

gate を素通しする回避策 (残余を本文から消すだけの修正) はしない。残余は決定に変えるか、仮マークで本文に残す。

| Verdict | 扱い                                                                                                |
| ------- | --------------------------------------------------------------------------------------------------- |
| GO      | Phase 3 へ進む。条件が併記されていれば一時的な批評として提示し、本文に折り込むものだけ 1 回反映する |
| NO-GO   | 壁打ちループへ (上記)                                                                               |

## Phase 3: 調査と計画

### Research

`Skill("research", "<issue タイトルをそのまま>\n\nIntent: <feature なら Feature planning、bug なら Bug investigation>。<issue 本文から導いた調査質問>")` を実行し、結果の要点を本文の根拠と think の入力に反映する。先頭に issue タイトルをそのまま置いて intent を明示するのは、research が explorer-feature を issue タイトル入りの prompt で起動する条件を満たすため。

research が調査ファイルを保存して完了したら、`python3 ${CLAUDE_SKILL_DIR}/../../hooks/veto/veto.py research-gate --title "<issue タイトルをそのまま>" --file "<保存された調査ファイルのパス>"` を実行する。この実行が veto の research evidence になり、飛ばすと起票が no-research で拒否される。

stopped: unresearchable が返ったら、missing の各項目を AskUserQuestion で仮説付きに壁打ちして解消し、回答を反映して再実行する (最大 2 回)。上限に達しても解消しない項目は仮マークで本文に残し、扱いをユーザーに委ねる。

### Think

research の結果を添えて `Skill("think", "<タイトル + 本文>\n\nResearch: <research の要約>")` を実行し、構造化 plan を得る。先頭行を issue タイトルにし、think の title をそのまま plan-gate に流す (veto の plan evidence になる)。

ready=false が返ったら、blockers の各項目を AskUserQuestion で仮説付きに問うて決着させ、再実行する (最大 2 回)。上限に達しても ready にならない項目は仮マークで本文に残し、進め方をユーザーに委ねる。

### Plan 書き下ろし

think が返した構造化 plan を、`${CLAUDE_SKILL_DIR}/references/plan-section.md` の書式で本文の `## Plan` 節として自然言語に書き下ろす。機械用の隠し block は置かない。

1. units / tests / 前提 / test_command を plan-section.md の骨格へ写す
2. round-trip fidelity check。書いた Plan 節から plan-section.md の抽出 contract に従い構造を再抽出し、think plan と突合する。突合フィールドは unit id 集合 / depends_on / test id 集合 / test name / test_command。不一致があれば Plan 節を書き直す (最大 2 回)。解消しなければ差分をユーザーに提示して判断を仰ぐ
3. `### 前提` の各行を検証する。path は `test -f <path>`、anchor は `ugrep -F '<pattern>' <path>`。失敗した行は修正するか落とす
4. `## Backlog candidates` 節を追記する。plan がスコープ外へ切り出した候補を列挙し、無ければ「なし」と書く

## Phase 4: 起票

1. Issue プレビューを提示する。インライン仮マークと Premises は仮ブロックに集約し (新規内容は足さず本文が持つものを写す。0 件なら省略)、challenge の verdict / findings は challenge ブロックに示す。最後に AskUserQuestion で "Create this issue?" と確認する
2. 本文を一時ファイルに書き出し、ラベルを付けて `gh issue create --title "<Phase 1 の title をそのまま>" --body-file <path>` で起票する。出力から Issue URL を取得する (sandbox 互換で、長い本文のエスケープを回避)
3. Phase 1 で分割を承認していれば、起票した issue を `Skill("slice", "#<epic 番号>")` に渡す

### ラベル

`priority:*` は必須とし、影響度に応じて critical / high / medium / low のいずれかを付ける。それ以外のラベルは、リポジトリの慣例に合わせる。
