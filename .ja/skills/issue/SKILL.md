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

各ステップの判定基準と手順 (種別判定 / Why 壁打ち / テンプレート選択 / 分割判定 / 軽微 bug の導線) は `${CLAUDE_SKILL_DIR}/references/drafting.md` に従う。

1. `.claude/OUTCOME.md` があれば読み、issue が outcome に資するか確認する
2. 説明から種別を検出する
3. feature / bug で、Why (誰が必要とし、どんな痛みがあり、何が成功か) が説明から読み取れない場合、壁打ちで詰める
4. テンプレートを選び、タイトルと本文を生成し、確定 / 仮を `${CLAUDE_SKILL_DIR}/references/tentative-marking.md` の基準でマークする
5. epic 規模で分割すべきか判定する

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
