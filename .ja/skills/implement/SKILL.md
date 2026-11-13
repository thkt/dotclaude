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

1. `gh issue view <ref> --json number,title,body,state,url,comments` で Issue を取る。state が OPEN で title と body が空でないことを確認する。本文の全節とコメントから合意の記録を読む。未合意の点が残っていれば起動せず、`/scoping` へ戻す。未合意の点とは、未合意と書かれた項目、未解決の問い、実装者に委ねた判断、「実装時に確認する」のように先送りした判断を指す。未決事項の節が「なし」でも、他の節にある先送りを数える。workflow は走り出すと人に問えず、未決の判断に当たると `human-decision-required` で止まる。決定がコメントにだけあるときも `/scoping` へ戻し、本文へ反映する。対象 repo の方針が今回の変更に課す手順の判定が本文に無いときも、`/scoping` へ戻す。workflow が実行できないと判定された手順の扱いが本文に無いときも同じ。判定の基準は ${CLAUDE_SKILL_DIR}/../scoping/references/sufficiency.md § 対象 repo の方針が課す手順にあり、ここでは判定し直さない。workflow が実装とレビューに渡すのは title と本文だけ。
2. `git rev-parse --show-toplevel` で対象 repo の絶対パスを決める。
3. `.dotagents.json` が commit 済みであることを確認する。workflow は repository・remote・baseBranch・setup・check・ciChecks・capture を持つ Codex の対象契約で検査する。無ければ package.json の scripts や CI 定義から内容を仮説付きで AskUserQuestion に出し、合意した内容をユーザーの判断で commit してから進める。未 commit の差分があれば stash や移植をせず、扱いを尋ねる。Issue の必要媒体を `${CLAUDE_SKILL_DIR}/references/capture.md` の表で `capture` の設定と照合し、食い違えば起動せず `/scoping` へ戻す。
4. sandbox を観測する。${CLAUDE_SKILL_DIR}/scripts/sandbox_probe.ts を実行し、出力の `sandboxed`・`local_binding`・`platform` を § sandbox の観測の表で扱う。どの行を当てるかは、起動の経路で変わる。設定ファイルからは推測しない。起動時の flag や管理設定で変わった sandbox は、設定ファイルに現れない。
5. 固定する参照を選ぶ。`${CLAUDE_SKILL_DIR}/../../rules/conventions/DOCUMENTS.md` § Read and retain に従い、関連する wiki と判断記録を選ぶ。wiki は `${CLAUDE_SKILL_DIR}/../scribe/scripts/find_wiki_rule.ts docs/wiki <Issue の語> <触れそうなパス> --scene implement` の `matched` と `scenes` のページを読む。選んだページと判断記録を、Issue と現行コードに照合する。`${CLAUDE_SKILL_DIR}/../scoping/references/session.md` § 調査成果の引き継ぎに従い、Issue が参照する調査報告も加える。参照に使えるのは `docs/research/`・`docs/wiki/`・`docs/decisions/` 配下の Markdown だけ。各参照の blob を `git rev-parse HEAD:<path>` で、開始 commit を `git rev-parse HEAD` で記録する。必要な報告が HEAD に commit されていなければ、引き継ぎ未完了として止める。
6. 既存 PR を直す依頼なら、この Phase を離れて § 既存 PR の修正へ回す。

## Phase 2: workflow の起動

workflow は host (`workflows/_lib/claude-run.ts`) で起動する。host は workflow のコマンドを自分で実行し、実装・レビュー・修正・命名だけを `claude -p` の子 session に渡す (DR-0127)。workflow は隔離 worktree で実装・撮影・check・独立レビュー・修正を accepted まで回し、公開するときは 1 つの commit にまとめて push し、draft PR を作って同じ head の CI を待つ。

1. 子 session がコマンドを実行できるかを確かめる。`${CLAUDE_SKILL_DIR}/scripts/host.ts probe --repo "<絶対パス>" "git status --short" "<実行ファイル> --version"` を実行する。`<実行ファイル>` は `.dotagents.json` の `check` の各コマンドの先頭の要素で、複数あれば引数を足して並べる。出力を下の表で扱う。
2. args を 1 行の JSON にする。`{"issue": "<番号>"}` を基にし、`--no-publish` のときは `publish: false` を足す。Phase 1 の手順 5 で参照を選んだときは、`startCommit: "<開始 commit>"` と `reports: [{path, blob}]` を足す。workflow は参照を開始 commit の版と照合してから、実装・修正・独立レビューに渡す。
3. `${CLAUDE_SKILL_DIR}/scripts/host.ts run implement --repo "<絶対パス>" --args '<args の JSON>'` を、Bash の background で、sandbox を外し、timeout を 7200000 にして実行する。sandbox の中では、子 session が自分の記録を書けない。
4. 完了の通知を待つ。完了まで状態を polling せず、対象の worktree を編集しない。完了したら、出力の最後の行 `claude-run: {...}` を読む。workflow の戻り値は `result` の指すファイルにあり、Phase 3 で扱う。`state` は再開に使うので控える。`result` が null なら、script は例外で終わっている。出力の `claude-run: the script threw` の行を示し、起動し直すかを人に尋ねる。

子 session が実行できるのは、利用者自身の permission の規則で許可されたコマンドだけである。check のコマンドを規則で許可していなければ、実装の session はテストを実行できずに何分も作業する。probe はそれを起動の前に見つける。

| probe の出力    | 扱い                                                                                                                                                                                              |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ran` が true   | 手順 2 へ進む                                                                                                                                                                                     |
| `ran` が false  | 起動しない。`denied` と `why` を示し、AskUserQuestion で選んでもらう。選択肢は 2 つ。permission の規則でそのコマンドを許可してから手順 1 をやり直す。この回は § agent 経由の起動で起動する |

## Phase 3: 結果の扱い

戻り値の `status` か `stopped` で分ける。どの場合も、戻り値の branch・worktree・commit・URL・review の要約・残作業 (`remaining`) をユーザーに返す。戻り値の `body_transport` が `copied` なら、PR 本文を transcript から読み戻せず agent が写したことと、`body_fallback` の理由も返す。

| 戻り値                    | 扱い                                                                                     |
| ------------------------- | ---------------------------------------------------------------------------------------- |
| `status: verified_local`  | 公開を切った実行。検証済みの branch と worktree を示し、commit・公開は人の判断に残す     |
| `status: published_draft` | `${CLAUDE_SKILL_DIR}/references/publish.md` の手順で公開本文を照合し、ready に切り替える |
| `stopped` (停止理由あり)  | § 停止条件の表で扱いを決める。停止条件や上限を変えて続行しない。自動で再起動しない。戻り値の `retry_next` が null でなければ、§ 停止した実行の再開を人に示す |

## agent 経由の起動

host を使えないときの経路で、Phase 2 の probe が false を返し、人がこの経路を選んだときに使う。workflow のコマンドを 1 つずつ agent が実行するので、host より時間と費用がかかる (DR-0127)。

`Workflow({name: "implement", args: {issue: "<番号>", repo: "<絶対パス>"}})` で起動する。args に足すものは Phase 2 の手順 2 と同じ。起動の前に、§ sandbox の観測の表をすべての行で当てる。workflow は background で走り、完了は通知で届く。完了まで状態を polling せず、対象の worktree を編集しない。戻り値は Phase 3 で扱う。起動した同じセッションで script を直したときは、`Workflow({scriptPath})` で起動し直す (name 解決はセッション開始時点の script を使う)。

## sandbox の観測

host は sandbox の外で起動するので、check と撮影は sandbox の制限を受けない。host で起動するときに当てるのは表の 1 行目だけで、2 行目と 3 行目は § agent 経由の起動のときに当てる。agent 経由では、macOS の sandbox の中で Chromium が起動せず、撮影は実装とレビューを終えた後に `capture-unavailable` で止まる。ローカルの bind が拒まれると、web server の socket を開く check は毎回失敗し、回数上限の無い修正ループが止まらない。どちらも起動の前に止める。表は上の行から当てる。

| 観測                                                                                                         | 扱い                                                                                                     |
| ------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| `local_binding` が false で、`sandboxed` も false                                                            | 起動しない。bind を拒んでいるものを人に尋ねる                                                            |
| agent 経由で起動する。`local_binding` が false                                                               | 起動しない。`sandbox.network.allowLocalBinding: true` を設定するよう伝える。この設定は再起動なしで効く   |
| agent 経由で起動する。`sandboxed` が true。`.dotagents.json` の `capture` が null でなく、`platform` が darwin | 起動しない。sandbox を外したセッションで実行し直すよう伝える                                             |
| 上のどの行にもあたらない                                                                                     | 次の手順へ進む                                                                                           |

## 停止した実行の再開

戻り値の `retry_next` が null でない停止は、原因を直した後に再開できる。再開は止まった巡の先頭か公開の先頭から走り、それより前の実装・修正・レビューの結果は state ファイルから戻る。再開するかは人が決める。

1. § 停止条件の表に従って原因を直す。Issue と worktree には触れない。
2. Phase 2 の手順 3 のコマンドを、起動時と同じ args に `retry: <retry_next>` を足し、`--state "<起動時の state>"` を付けて実行する。`retry_next` は書き換えずにそのまま渡す。state は、起動時の出力の最後の行にあるファイルである。戻り値の `run_id` は実行記録の ID なので、state の代わりに使わない。
3. 結果を Phase 3 の表で扱う。

| 状況                                         | 扱い                                                                                                                                                                                                                                 |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `retry_next` が null                         | 再開できない。§ 停止条件の表に従う                                                                                                                                                                                                   |
| state のファイルが残っていない               | 再開できない。新しく起動する                                                                                                                                                                                                         |
| Issue を変えた (コメントの追加でも)          | 再開できない。再開した実行は `requirements-changed` で止まる。新しく起動する                                                                                                                                                         |
| 再開した実行がもう 1 度止まった              | その停止の `retry_next` と、同じ state で同じ手順を繰り返す                                                                                                                                                                          |
| `invalid-retry` で止まった                   | 1 つ前の停止の `retry_next` と、同じ state で呼び直す                                                                                                                                                                                |
| `held by the running process` と出て終わった | 同じ state を持つ実行がまだ走っている。その完了を待つ                                                                                                                                                                                |
| agent 経由で起動した実行                     | 起動したのと同じセッションで Workflow を呼び直す。`scriptPath` に起動時の結果が示した script の path を、`resumeFromRunId` に Workflow tool が起動時に返した runId を渡し、args に `retry: <retry_next>` を足す。セッションが終わっていれば再開できない |

## 既存 PR の修正

この workflow が公開した PR を直すときも、同じ workflow を使う。人が採用したレビュー指摘・期待する結果・許可範囲を、ユーザーが 1 つの文章にまとめて渡す。PR コメントを自動収集・自動採用しない。

1. 現在の Issue が人の合意済みで、今回の修正依頼と許可範囲が合意と整合することを確かめる。本文の差分や OPEN の状態だけで合意を判定しない。未合意の要求変更は `/scoping` へ戻す。修正依頼が Issue に無い文書や公開の手順に触れるなら、その手順の判定と扱いが Issue か修正依頼にあることも確かめ、無ければ `/scoping` へ戻す。
2. Phase 1 の手順 2〜5 を行う。参照を固定するときの開始 commit は、PR 全体の基点 (最初に公開した実行の開始 commit) にする。
3. Phase 2 の手順で起動する。args には `revision: {pr: "<PR の URL>", request: "<採用した指摘・期待する結果・許可範囲>"}` を足す。workflow は前回の worktree を公開した head で再利用し、PR 全体を Issue と修正依頼の両方に対して評価する。公開した head の上に commit して push し、本文を作り直して CI を待つ。新しい PR は作らない。
4. 結果は Phase 3 と同じ表で扱う。
5. 採用した指摘の原因と再発性を確かめ、必要な場合だけ `${CLAUDE_SKILL_DIR}/../../rules/conventions/DOCUMENTS.md` に従って既存の wiki・判断記録・テスト・lint へつなぐ。今回の合意範囲を超える改善を、既存 PR の完了条件に加えない。

## 停止条件

workflow が止まったら、`why` と判明している URL・commit・残る条件を返し、下の扱いに従う。戻り値に `relay_note` があれば、それも返す。停止の直前にコマンドを実行した agent 呼び出しが、結果を返さなかった理由を述べた文である。`push-unconfirmed` 以降の停止では、GitHub 側に書き込みが済んでいる場合がある。戻り値の `retry_next` が null でない停止では、表の「起動し直す」を § 停止した実行の再開に読み替える。新しく起動するときは、以前の実行の branch と worktree が残っていて `branch-exists` で止まるので、その扱いをまず人に尋ねる。

| 停止理由                                                                                                                           | 扱い                                                                                                                                                                                        |
| ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `no-issue` `no-repo` `issue-unreadable` `issue-not-open` `issue-repo-mismatch`                                                     | Issue と repo を確かめる。対象 repo に OPEN な合意済み Issue が無ければ `/scoping` へ戻す                                                                                                   |
| `requirements-changed`                                                                                                             | 実行中に Issue が変わった (コメントの追加でも変わる)。title・body・state が変わったなら、変わった要求に人が合意するまで `/scoping` へ戻す。コメントだけなら要求への影響を確かめて起動し直す |
| `no-actor` `gh-host` `no-permission` `actor-changed`                                                                               | gh の認証・権限を人が直す。別の主体へ切り替えない                                                                                                                                           |
| `uncommitted-start-inputs` `no-config` `invalid-config` `remote-mismatch` `repository-mismatch` `repo-unreadable` `no-ci-checks`   | Phase 1 の手順 3 に戻り、`.dotagents.json` か remote を直してから起動し直す                                                                                                                 |
| `invalid-reports` `start-commit-mismatch` `report-mismatch`                                                                        | Phase 1 の手順 5 に戻り、参照を commit して開始 commit と blob を記録し直してから起動し直す                                                                                                 |
| `branch-exists` `branch-pr-exists`                                                                                                 | 以前の実行の branch・worktree・PR を示す。消すか再利用するかは人の判断                                                                                                                      |
| `human-decision-required`                                                                                                          | 戻り値の findings と review を示し、要求・範囲・権限についての人の判断を仰ぐ。判断は `/scoping` の手順で Issue の本文へ書く。コメントに書いた判断は実装にもレビューにも届かない。本文を変えた後は新しく起動する |
| `invalid-retry`                                                                                                                    | 渡した retry が受け付けられなかった。§ 停止した実行の再開の表に従う                                                                                           |
| `invalid-repair` `invalid-review`                                                                                                  | agent の応答が契約を満たさなかった。`why` を示し、起動し直すかを人に尋ねる                                                                                                                  |
| `source-changed` `config-changed` `start-head-changed`                                                                             | worktree・その `.dotagents.json`・checkout の HEAD が途中で変わった。誰が変えたかを確かめてから起動し直す                                                                                   |
| `target-unavailable` `prepare-unavailable` `worktree-failed` `setup-failed` `check-unavailable` `pulls-unreadable` `commit-failed` | 実行環境の問題。戻り値のログ末尾から原因を直し、起動し直す                                                                                                                                  |
| `capture-unavailable` `capture-timeout` `capture-media-ignored` `invalid-capture`                                                  | 撮影の環境か `capture` の設定を直す。時間上限の変更は人の判断                                                                                                                               |
| `commit-mismatch` `pr-body-mismatch` `push-target-mismatch`                                                                        | 書き込みの前に止まり、何も公開していない。branch・本文・git 設定の原因を確かめる                                                                                                            |
| `push-unconfirmed` `publication-unconfirmed` `attach-failed`                                                                       | 実状態を `git ls-remote` と `gh pr view` で確認するまで再試行しない                                                                                                                         |
| `invalid-revision` `revision-no-record` `revision-target-changed` `revision-worktree-mismatch`                                     | 修正する PR が、この workflow が公開したときの状態でない。公開後に積まれた変更・worktree の差分・記録を人が照合し、新しい修正依頼で起動し直す                                               |
| `ci-failed`                                                                                                                        | draft のまま保つ。失敗した check のログから原因を特定し、§ 既存 PR の修正で直す                                                                                                             |
| `ci-target-changed` `ci-unavailable` `ci-invalid-response` `ci-timed-out`                                                          | draft のまま保つ。PR の対象と CI を `gh pr view` で確かめてから、ready の判断へ進む                                                                                                         |
