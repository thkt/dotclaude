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
          command: "../../hooks/veto/pre-issue-create.sh"
  PostToolUse:
    - matcher: "Bash"
      hooks:
        - type: command
          command: "../../hooks/veto/veto.py record bash"
    - matcher: "AskUserQuestion"
      hooks:
        - type: command
          command: "../../hooks/veto/veto.py record skip"
---

# /issue - GitHub Issue 生成

premise check と challenge で下書きの主張を投稿前に検証し、challenge の GO 後は research / think を通して `## Plan` 節を書き下ろす。「人間と練る」工程はここで完結させ、build workflow が plan をそのまま抽出できる issue に仕上げる。

## 入力

`$ARGUMENTS` は Issue 説明。空なら AskUserQuestion で説明を尋ねる。

## 言語

`~/.claude/settings.json` から `language` を読み、その言語で Issue 本文とテンプレートを翻訳する。未設定なら英語をデフォルトとする。英語のまま残すのは識別子 / コード / コマンド / 固有名だけで、設定言語に平易な同義語がある英単語を地の文に混ぜない。テンプレート由来の見出しと Plan 節の抽出キーワードは英語のまま維持する。

## タイトル規律

タイトルは Phase 1 で確定し、challenge / research / think / `gh issue create` には一字一句同一の文字列を渡す。veto はこの title で evidence bundle を照合するため、ずれると起票が拒否される。

## 残余解消ループ

gate や verdict が通らないとき、残余 (findings / missing / blockers) 1 件ごとに AskUserQuestion で仮説付きの決定を問い、回答を本文に反映して再実行する。上限は各呼び出し元が定める。上限到達時は、未解消の残余を仮マークで本文に残して扱いをユーザーに委ねる (呼び出し元が別の終端動作を定めていればそちらに従う)。残余は決定に変えるか仮マークで本文に残すかのどちらかで、gate を素通しするために本文から消すだけの修正はしない。

## Phase 1: 起草

各ステップの判定基準と手順 (種別判定 / Skip 分岐 / Why 壁打ち / テンプレート選択 / 分割判定) は `${CLAUDE_SKILL_DIR}/references/drafting.md` に従う。

1. `.claude/OUTCOME.md` を読む。不在なら `/outcome` で stub を生成する
2. 説明から種別を検出し、Skip 分岐に該当するか判定する
3. feature / bug で、Why (誰が必要とし、どんな痛みがあり、何が成功か) が説明から読み取れない場合、壁打ちで詰める
4. テンプレートを選び、タイトルと本文を生成し、確定 / 仮を `${CLAUDE_SKILL_DIR}/references/tentative-marking.md` の基準でマークする
5. epic 規模で分割すべきか判定する

## Phase 2: 検証

feature / bug かつ Skip 分岐に非該当のときだけ、Phase 2〜3 を通す。

1. 下書きした主張を `${CLAUDE_SKILL_DIR}/references/premise-check.md` の基準でふるいにかける
2. `${CLAUDE_SKILL_DIR}/references/prose-review.md` と、本文言語に対応する空句ファイル (日本語なら `phrases.ja.md`、英語なら `phrases.en.md`) の基準で本文をインライン精査する。Phase 3 で Plan 節を追記した後は、Plan 節にも同じ基準を適用する
3. challenge で前提を検証する

### Adversarial Challenge

1. `Skill("challenge", "<下書きしたタイトル + 本文>")` を実行する。先頭行を issue タイトルにする。返る verdict と findings は Issue 本文に入れない (Phase 4 のプレビューで示す)
2. GO なら Phase 3 へ進む。条件が併記されていれば一時的な批評として提示し、本文に折り込むものだけ 1 回反映する
3. NO-GO のときは残余解消ループに入る (最大 3 回)。why と gate (script gate 降格時は rule / detail に残余一覧) を材料にする。GO に達しないか「このまま起票」を選んだ場合は、NO-GO の根拠をプレビューに提示し、起票継続 / 取り下げをユーザーに委ねる

## Phase 3: 調査と計画

### Research

対象リポに `docs/wiki/` があれば、issue に関係するページを先に読み、research と think の入力に含める。wiki は仕様・定型手順・規約とコード位置の言語化であり、ここから引用できる内容を issue で再調査・再説明しない。

1. `Skill("research", "<issue タイトルをそのまま>\n\nIntent: <feature なら Feature planning、bug なら Bug investigation>。<issue 本文から導いた調査質問>")` を実行し、結果の要点を本文の根拠と think の入力に反映する。先頭に issue タイトルを置いて intent を明示するのは、research が explorer-feature を issue タイトル入りの prompt で起動する条件を満たすため
2. 調査ファイルが保存され完了したら `python3 ${CLAUDE_SKILL_DIR}/../../hooks/veto/veto.py research-gate --title "<issue タイトルをそのまま>" --file "<保存された調査ファイルのパス>"` を実行する。これが veto の research evidence になり、飛ばすと起票が no-research で拒否される
3. `stopped: unresearchable` が返ったら、missing の各項目で残余解消ループを回す (最大 2 回)

### Think

1. research の結果を添えて `Skill("think", "<タイトル + 本文>\n\nResearch: <research の要約>")` を実行し、構造化 plan を得る。先頭行を issue タイトルにする
2. `ready=false` が返ったら、blockers の各項目で残余解消ループを回す (最大 2 回)

### Plan 書き下ろし

think が返した構造化 plan を、`${CLAUDE_SKILL_DIR}/references/plan-section.md` の書式で本文の `## Plan` 節として自然言語に書き下ろす。

1. units / tests / 前提 / test_command を plan-section.md の骨格へ写す。仕様・規約が `docs/wiki/` のページに言語化済みなら、contract prose で再説明せずページを引用する (例: 「チャンク境界は `docs/wiki/chunker.md` の仕様に従う」)。実装者はページの対象コードパスからコードへ辿る
2. round-trip fidelity check。書いた Plan 節から plan-section.md の抽出 contract に従い構造を再抽出し、think plan と突合する。突合フィールドは unit id 集合 / depends_on / test id 集合 / test name / test_command。不一致があれば Plan 節を書き直す (最大 2 回)。解消しなければ差分をユーザーに提示して判断を仰ぐ
3. 記載したパスの実在を plan-section.md § 投稿前検証 の手順で検証する
4. `## Backlog candidates` 節を追記する。plan がスコープ外へ切り出した候補を列挙し、無ければ「なし」と書く

## Phase 4: 起票

1. Issue プレビューを提示する。インライン仮マークと Premises は仮ブロックに集約し (新規内容は足さず本文が持つものを写す。0 件なら省略)、challenge の verdict / findings は challenge ブロックに示す。最後に AskUserQuestion で "Create this issue?" と確認する
2. 本文を一時ファイルに書き出し、ラベルを付けて `gh issue create --title "<Phase 1 の title をそのまま>" --body-file <path>` で起票する。出力から Issue URL を取得する (sandbox 互換で、長い本文のエスケープを回避)
3. Phase 1 で分割を承認していれば、起票した issue を `Skill("slice", "#<epic 番号>")` に渡す

### ラベル

`priority:*` は必須とし、影響度に応じて critical / high / medium / low のいずれかを付ける。それ以外のラベルは、リポジトリの慣例に合わせる。
