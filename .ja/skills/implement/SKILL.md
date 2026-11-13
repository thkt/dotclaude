---
name: implement
description: 合意済み GitHub Issue を implement workflow で実装・検証・draft PR 公開・CI 確認まで進め、公開本文の照合と ready 切替を行う。要求整理には使わない (/scoping)。レビューのみの依頼には使わない。
when_to_use: 合意済みIssueを実装, Issueから実装, PR作成まで進める, 既存PRの修正, implement issue
allowed-tools: Read Write Edit LS Workflow AskUserQuestion Bash(${CLAUDE_SKILL_DIR}/scripts/*) Bash(${CLAUDE_SKILL_DIR}/../scribe/scripts/*) Bash(${CLAUDE_SKILL_DIR}/../../node_modules/.bin/textlint:*) Bash(jq:*) Bash(gh:*) Bash(git:*) Bash(cat:*) Bash(ugrep:*) Bash(bfs:*)
model: opus
argument-hint: "[issue number or URL] [--no-publish]"
---

# /implement - 合意済み Issue から PR 作成

`/scoping` が合意させた Issue を implement workflow に渡し、実装から draft PR と CI 確認までを決定論的に進める。このスキルは起動の前の照合と、workflow が外に残す公開本文の照合・ready 切替を担う。

`$ARGUMENTS` は Issue 番号か URL。`--no-publish` が付いたら公開を切って起動し、workflow は `verified_local` で止まる。対象 Issue を特定できないときは AskUserQuestion で確認する。対象 repo は現在のリポジトリ。要求の変更が要ると分かったら止め、`/scoping` へ戻す。合意済みの範囲内の作業ごとに許可を聞き直さない。

確認できる事実は調査し、ユーザーにしか分からない事実や未確定の意図は早めに質問する。指示文を理由に確認や停止が必要な場合は、実際に読んだ文書のパスと該当文を示し、明示された条件と自分の解釈を区別する。

## Phase 1: 起動前の照合

1. `gh issue view <ref> --json number,title,body,state,url,comments` で Issue を取る。state が OPEN で title と body が空でないことを確認する。本文の全節とコメントから合意の記録を読む。未合意の点が残っていれば起動せず、`/scoping` へ戻す。未合意の点とは、未合意と書かれた項目、未解決の問い、実装者に委ねた判断、「実装時に確認する」のように先送りした判断を指す。未決事項の節が「なし」でも、他の節にある先送りを数える。workflow は走り出すと人に問えず、未決の判断に当たると `human-decision-required` で止まる。決定がコメントにだけあるときも `/scoping` へ戻し、本文へ反映する。対象 repo の方針が今回の変更に課す手順の判定が本文に無いときも、`/scoping` へ戻す。workflow が実行できないと判定された手順の扱いが本文に無いときも同じ。判定の基準は ${CLAUDE_SKILL_DIR}/../scoping/references/sufficiency.md § 対象 repo の方針が課す手順にあり、ここでは判定し直さない。扱いは、その文書の § workflow が実行できない手順の扱いの 3 つのどれかでなければならない。check か撮影に入れる、担当を決めて引き継ぐ、今回の範囲から外す、の 3 つである。どれでもないとき、引き継ぎに担当と時期が無いとき、host や workflow が後から実行するとしているときも、`/scoping` へ戻す。workflow が実装とレビューに渡すのは title と本文だけ。
2. `git rev-parse --show-toplevel` で対象 repo の絶対パスを決める。
3. `.dotagents.json` が commit 済みであることを確認する。workflow は repository・remote・baseBranch・setup・check・ciChecks・capture を持つ Codex の対象契約で検査する。無ければ package.json の scripts や CI 定義から内容を仮説付きで AskUserQuestion に出し、合意した内容をユーザーの判断で commit してから進める。未 commit の差分があれば stash や移植をせず、扱いを尋ねる。Issue の必要媒体を `${CLAUDE_SKILL_DIR}/references/capture.md` の表で `capture` の設定と照合し、食い違えば起動せず `/scoping` へ戻す。Issue の扱いが「check か撮影に入れる」の手順は、commit 済みの `check` か `capture` が実行することを確かめ、実行しなければ起動せず `/scoping` へ戻す。
4. sandbox を観測する。${CLAUDE_SKILL_DIR}/scripts/sandbox_probe.ts を実行し、出力を控える。`local_binding` と `sandboxed` がどちらも false なら起動せず、bind を拒んでいるものを人に尋ねる。出力の残りは、agent 経由で起動するときに § sandbox の観測の表で扱う。設定ファイルからは推測しない。起動時の flag や管理設定で変わった sandbox は、設定ファイルに現れない。
5. 固定する参照を選ぶ。`${CLAUDE_SKILL_DIR}/../../rules/conventions/DOCUMENTS.md` § Read and retain に従い、関連する wiki と判断記録を選ぶ。wiki は `${CLAUDE_SKILL_DIR}/../scribe/scripts/find_wiki_rule.ts docs/wiki <Issue の語> <触れそうなパス> --scene implement` の `matched` と `scenes` のページを読む。選んだページと判断記録を、Issue と現行コードに照合する。`${CLAUDE_SKILL_DIR}/../scoping/references/session.md` § 調査成果の引き継ぎに従い、Issue が参照する調査報告も加える。参照に使えるのは `docs/research/`・`docs/wiki/`・`docs/decisions/` 配下の Markdown だけ。各参照の blob を `git rev-parse HEAD:<path>` で、開始 commit を `git rev-parse HEAD` で記録する。必要な報告が HEAD に commit されていなければ、引き継ぎ未完了として止める。
6. 既存 PR を直す依頼なら、この Phase を離れて § 既存 PR の修正へ回す。

## Phase 2: workflow の起動

workflow は host (`workflows/_lib/claude-run.ts`) で起動する。host は workflow のコマンドを自分で実行し、実装・レビュー・修正・命名だけを `claude -p` の子 session に渡す (DR-0127)。workflow は隔離 worktree で実装・撮影・check・独立レビュー・修正を accepted まで回し、公開するときは 1 つの commit にまとめて push し、draft PR を作って同じ head の CI を待つ。

子 session が実行できるのは、利用者自身の permission の規則で許可されたコマンドだけである。check のコマンドを規則で許可していなければ、実装の session はテストを実行できずに何分も作業する。手順 1 と 2 の probe は、それを起動の前に見つける。

手順 2 と 4 のコマンドは、Bash で sandbox を外して実行する (`dangerouslyDisableSandbox: true`)。host は check と撮影を自分で実行し、sandbox の中では Chromium が起動せず、web server が bind できないことがある。sandbox を外す許可が下りなければ、sandbox の中で実行し直さずに止め、人に伝える。args の書き方と、probe と host の出力の扱いは ${CLAUDE_SKILL_DIR}/references/host.md にある。

1. check の実行ファイルを `jq -r '.check[][0]' "<絶対パス>/.dotagents.json" | sort -u` で並べる。
2. `${CLAUDE_SKILL_DIR}/scripts/host.ts probe --repo "<絶対パス>" "git status --short" "<実行ファイル> --version"` を実行する。timeout は 180000 にし、実行ファイルごとに引用符で囲んだ引数を 1 つ足す。出力を references の § probe の出力で扱う。
3. args の JSON を Write tool でファイルに書く。key は references の § args にある。`--no-publish` のときは `publish: false` を足す。
4. `${CLAUDE_SKILL_DIR}/scripts/host.ts run implement --repo "<絶対パス>" --args-file "<args のファイル>"` を background で実行する。`run_in_background: true` と timeout 7200000 を指定する。
5. 完了の通知を待つ。完了まで状態を polling せず、対象の worktree を編集しない。
6. 出力から `ugrep '^claude-run: \{'` でまとめの行を探し、references の § host の出力で扱う。

## Phase 3: 結果の扱い

戻り値の `status` か `stopped` で分ける。どの場合も、戻り値の branch・worktree・commit・URL・review の要約・残作業 (`remaining`) をユーザーに返す。戻り値の `body_transport` が `copied` なら、PR 本文を transcript から読み戻せず agent が写したことと、`body_fallback` の理由も返す。

| 戻り値                    | 扱い                                                                                     |
| ------------------------- | ---------------------------------------------------------------------------------------- |
| `status: verified_local`  | 公開を切った実行。検証済みの branch と worktree を示し、commit・公開は人の判断に残す     |
| `status: published_draft` | `${CLAUDE_SKILL_DIR}/references/publish.md` の手順で公開本文を照合し、ready に切り替える |
| `stopped` (停止理由あり)  | § 停止条件の表で扱いを決める。停止条件や上限を変えて続行しない。自動で再起動しない。戻り値の `retry_next` が null でなければ、§ 停止した実行の再開を人に示す |

## agent 経由の起動

host を使えないときの経路で、Phase 2 の probe が false を返し、人がこの経路を選んだときに使う。workflow のコマンドを 1 つずつ agent が実行するので、host より時間と費用がかかる (DR-0127)。

1. Phase 1 の手順 4 で控えた出力を、§ sandbox の観測の表で扱う。
2. `Workflow({name: "implement", args: {issue: "<番号>", repo: "<絶対パス>"}})` で起動する。args には、${CLAUDE_SKILL_DIR}/references/host.md § args と同じ key を足す。
3. 完了の通知を待つ。完了まで状態を polling せず、対象の worktree を編集しない。戻り値は Phase 3 で扱う。

起動した同じセッションで script を直したときは、`Workflow({scriptPath})` で起動し直す。name 解決はセッション開始時点の script を使う。

## sandbox の観測

agent 経由の起動では、workflow のコマンドを agent が session の sandbox の中で実行する。macOS の sandbox の中では Chromium が起動せず、撮影は実装とレビューを終えた後に `capture-unavailable` で止まる。ローカルの bind が拒まれると、web server の socket を開く check は毎回失敗し、回数上限の無い修正ループが止まらない。どちらも起動の前に止める。表は上の行から当てる。host での起動にはこの表を当てない。host は check と撮影を sandbox の外で行う。

| 観測                                                                                   | 扱い                                                                                                   |
| -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `local_binding` が false                                                               | 起動しない。`sandbox.network.allowLocalBinding: true` を設定するよう伝える。この設定は再起動なしで効く |
| `sandboxed` が true。`.dotagents.json` の `capture` が null でなく、`platform` が darwin | 起動しない。sandbox を外したセッションで実行し直すよう伝える                                           |
| 上の 2 行のどちらにもあたらない                                                        | § agent 経由の起動の手順 2 へ進む                                                                      |

## 停止した実行の再開

戻り値の `retry_next` が null でない停止は、原因を直した後に再開できる。再開は止まった巡の先頭か公開の先頭から走り、それより前の実装・修正・レビューの結果は state ファイルから戻る。再開するかは人が決める。

1. § 停止条件の表に従って原因を直す。Issue と worktree には触れない。
2. Phase 2 の手順 3 から 6 を行う。args は起動時と同じ key に `retry: <retry_next>` を足す。手順 4 のコマンドには `--state "<起動時の state>"` を付ける。
3. 結果を Phase 3 の表で扱う。

state は、起動時のまとめの行にあるファイルである。起動した session が終わっていれば、そのとき人に伝えた path を使う。戻り値の `run_id` は実行記録の ID なので、state の代わりに使わない。

| 状況                                             | 扱い                                                                                                                                                                                      |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `retry_next` が null                             | 再開できない。§ 停止条件の表に従う                                                                                                                                                        |
| state のファイルが残っていない                   | 再開できない。Phase 2 で新しく起動する                                                                                                                                                    |
| Issue を変えた (コメントの追加でも)              | 再開できない。再開した実行は `requirements-changed` で止まる。Phase 2 で新しく起動する                                                                                                    |
| 再開した実行がもう 1 度止まった                  | その停止の `retry_next` と同じ state で、手順 2 を繰り返す                                                                                                                                |
| `invalid-retry` で止まった                       | 1 つ前の停止の `retry_next` と同じ state で、手順 2 を行う                                                                                                                                |
| agent 経由で起動し、その session が続いている    | 同じ session で Workflow を呼び直す。`scriptPath` に起動時の結果が示した script の path を、`resumeFromRunId` に Workflow tool が起動時に返した runId を渡し、args に `retry: <retry_next>` を足す |
| agent 経由で起動し、その session が終わっている  | 再開できない。cache は session をまたがない。新しく起動する                                                                                                                               |

## 既存 PR の修正

この workflow が公開した PR を直すときも、同じ workflow を使う。人が採用したレビュー指摘・期待する結果・許可範囲を、ユーザーが 1 つの文章にまとめて渡す。PR コメントを自動収集・自動採用しない。

1. 現在の Issue が人の合意済みで、今回の修正依頼と許可範囲が合意と整合することを確かめる。本文の差分や OPEN の状態だけで合意を判定しない。未合意の要求変更は `/scoping` へ戻す。修正依頼が Issue に無い文書や公開の手順に触れるなら、その手順の判定と扱いが Issue か修正依頼にあることも確かめ、無ければ `/scoping` へ戻す。
2. Phase 1 の手順 2〜5 を行う。参照を固定するときの開始 commit は、PR 全体の基点 (最初に公開した実行の開始 commit) にする。
3. Phase 2 の手順 1 から 6 で起動する。args には、今の Issue の番号を `issue` に入れ、`revision: {pr: "<PR の URL>", request: "<採用した指摘・期待する結果・許可範囲>"}` を足す。workflow は前回の worktree を公開した head で再利用し、PR 全体を Issue と修正依頼の両方に対して評価する。公開した head の上に commit して push し、本文を作り直して CI を待つ。新しい PR は作らない。
4. 結果は Phase 3 と同じ表で扱う。
5. 採用した指摘の原因と再発性を確かめ、必要な場合だけ `${CLAUDE_SKILL_DIR}/../../rules/conventions/DOCUMENTS.md` に従って既存の wiki・判断記録・テスト・lint へつなぐ。今回の合意範囲を超える改善を、既存 PR の完了条件に加えない。

## 停止条件

workflow が止まったら、`why` と判明している URL・commit・残る条件を返し、${CLAUDE_SKILL_DIR}/references/stops.md の表で扱いを決める。戻り値に `relay_note` があれば、それも返す。
