---
name: issue
description: 構造化されたタイトルと本文で GitHub Issue を生成する。単独で成立し、前段を要求しない。challenge / research / think の成果物が会話にあれば、本文の根拠と `## Plan` 節に使う。
when_to_use: Issue作って, Issue書いて, Issue作成, GitHub Issue, buildに渡す準備
allowed-tools: Bash(gh:*) Bash(cat:*) Bash(ugrep:*) Bash(test:*) Read AskUserQuestion
model: opus
argument-hint: "[issue description]"
---

# /issue - GitHub Issue 生成

単独で成立する起票スキル。前段 (challenge / research / think) を要求せず、ネスト起動もしない。会話コンテキストに成果物があれば使う。challenge の verdict は起票判断の材料に、research の発見は本文の根拠に、think の構造化 plan は `## Plan` 節に写す。前提の検証は /challenge、調査は /research、設計と plan 生成は /think の役割で、どの段を通すかは人間が決める。

## 入力

`$ARGUMENTS` は Issue 説明。空なら AskUserQuestion で説明を尋ねる。

## 言語

`~/.claude/settings.json` から `language` を読み、その言語で Issue 本文とテンプレートを翻訳する。未設定なら英語をデフォルトとする。英語のまま残すのは識別子 / コード / コマンド / 固有名だけで、設定言語に平易な同義語がある英単語を地の文に混ぜない。テンプレート由来の見出しと Plan 節の抽出キーワードは英語のまま維持する。

## Phase 1: 起草

1. `.claude/OUTCOME.md` があれば読み、issue が outcome に資するか確認する
2. 説明から種別を検出する
3. feature / bug で、Why (誰が必要とし、どんな痛みがあり、何が成功か) が説明から読み取れない場合、壁打ちで詰める
4. テンプレートを選び、タイトルと本文を生成し、確定 / 仮を確信度マーキングの基準でマークする
5. epic 規模で分割すべきか判定する

### 種別判定

判別不能な場合は `feature` をデフォルトとする。タイトルには種別をキャピタライズして角括弧で囲ったプレフィックスを付ける。

| 種別    | 用途                                     |
| ------- | ---------------------------------------- |
| bug     | 既存のものが壊れているか期待通り動かない |
| feature | 新しい能力や拡張要望                     |
| docs    | ドキュメント追加や訂正                   |
| chore   | メンテナンス、設定、依存更新             |

### 軽微 bug の導線

次の 3 基準をすべて満たす bug は軽微で、起票せず /fix で直接対応する選択肢がある。起票する場合も、本文フッターに「軽微につき /fix で対応してもよい」と注記して /fix への導線を示す。典型例は typo 修正。原因未特定の間欠 (intermittent) bug は該当しない。

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

`gh api "repos/{owner}/{repo}/contents/.github/ISSUE_TEMPLATE" --jq '.[].name'` で `.md` を列挙する。種別に一致する GitHub テンプレート (ファイル名や `name` が種別を含む) があれば、その本文を読んで先頭 frontmatter (`name` / `about` / `labels` / `title`) を外し骨格にする。一致しなければ、skill ディレクトリ直下の `templates/<type>.md` を使う。どちらを骨格にしても、以降のフローは同じく通す。

### 確信度マーキング

本文のどの部分が確定でどの部分が仮かをマークし、実装者が守るべき要件と、未決定の判断・未検証の事実を区別できるようにする。

- 一次マークであって検証ではない。事実の検証は /challenge に委ねる
- 控えめにマークし、実装者のアクションが変わる箇所だけに付ける。全行に付けると仮マークが埋もれ、区別を妨げる
- 仮マークは対象の項目にインラインで置く。Premises セクションは、特定行に紐づかない issue レベルの前提 (デザイン参照、全体的な仮定) 専用に保つ
- マーカー語は settings.json の言語設定に従う (英語では `tentative`)

| 由来                                                                                   | 状態 | 記法        | アクション句                                  |
| -------------------------------------------------------------------------------------- | ---- | ----------- | --------------------------------------------- |
| ユーザーが明示した要件 (What & Why, Acceptance Criteria, 明示的な Scope / Constraints) | 確定 | 無印        | -                                             |
| AI が推論した HOW (配置、方針、フォーマット)、またはユーザーが残した未決定の判断       | 仮   | `(仮: ...)` | 「着手時に判断」/「より良い案があれば変更可」 |
| 事実が未検証 (検証されないまま本文に残る主張)                                          | 仮   | `(仮: ...)` | 「着手時に再確認」                            |

### 分割判定

独立して実装可能な criteria が 2 つ以上あれば、AskUserQuestion で分割を問う。選択肢は「1 issue のまま」か「epic と子 issue に分割」。1 つの成果物を検証するだけの細かいチェックは数えず、1 issue 内に留める。N 件の起票は取り消しにくいため、自動分割はしない。承認時はこの issue を epic として起票し、以降のフローはそのまま epic に通す。番号取得後、Phase 4 で /slice の実行を提案する。

## Phase 2: 推敲

1. `${CLAUDE_SKILL_DIR}/references/prose-review.md` と、本文言語に対応する空句ファイル (日本語なら `phrases.ja.md`、英語なら `phrases.en.md`) の基準で本文をインライン精査する。Phase 3 で Plan 節を追記した場合は、Plan 節にも同じ基準を適用する
2. 会話に challenge の verdict / findings があれば、本文に折り込むべき指摘だけ 1 回反映する。verdict と findings 自体は本文に入れない

## Phase 3: Plan 書き下ろし

会話コンテキストに /think の構造化 plan があるときだけ実施し、無ければ節ごと省略する。Plan なし issue も build は ephemeral plan で受容するが、plan 品質は /think 経由が上回る。

1. units / tests / 前提 / test_command を `${CLAUDE_SKILL_DIR}/references/plan-section.md` の書式で `## Plan` 節に写す。仕様・規約が `docs/wiki/` のページに言語化済みなら、contract prose で再説明せずページを引用する (例: 「チャンク境界は `docs/wiki/chunker.md` の仕様に従う」)
2. 記載したパスの実在を plan-section.md § 投稿前検証 の手順で検証する
3. `## Backlog candidates` 節を追記する。plan がスコープ外へ切り出した候補を列挙し、無ければ「なし」と書く

## Phase 4: 起票

1. Issue プレビューを提示する。インライン仮マークがあれば仮ブロックに集約し (新規内容は足さず本文が持つものを写す。0 件なら省略)、最後に AskUserQuestion で "Create this issue?" と確認する
2. 本文を一時ファイルに書き出し、ラベルを付けて `gh issue create --title "<title>" --body-file <path>` で起票する。出力から Issue URL を取得する (sandbox 互換で、長い本文のエスケープを回避)
3. Phase 1 で分割を承認していれば、起票した epic 番号を添えて /slice の実行を提案する。自動では起動しない

### ラベル

`priority:*` は必須とし、影響度に応じて critical / high / medium / low のいずれかを付ける。それ以外のラベルは、リポジトリの慣例に合わせる。
