---
name: implement
description: 合意済み GitHub Issue を launch.ts で実装・検証・レビューし、draft PR の公開、CI の確認、ready への切り替えまで進める。要求整理には使わない (/scoping)。レビューのみの依頼には使わない。
when_to_use: 合意済みIssueを実装, Issueから実装, PR作成まで進める, 既存PRの修正, implement issue
allowed-tools: Read Write Edit LS AskUserQuestion Bash(${CLAUDE_SKILL_DIR}/scripts/*) Bash(${CLAUDE_SKILL_DIR}/../../node_modules/.bin/textlint:*) Bash(jq:*) Bash(gh:*) Bash(git:*) Bash(cat:*) Bash(ugrep:*) Bash(bfs:*)
argument-hint: "[issue number or URL] [--no-publish]"
---

# /implement - 合意済み Issue から PR 作成

`/scoping` が合意させた Issue を、`launch.ts` で進める。`launch.ts` は、隔離した worktree で、実装、check、撮影、2 つのレビュー、修理を、レビューが受理するまで回す。このスキルを実行している session を、担当 AI と呼ぶ。担当 AI は、起動の前の照合、受理された変更の commit、公開、CI の確認、ready への切り替えを担う。

`$ARGUMENTS` は Issue 番号か URL。`--no-publish` が付いたら、Phase 3 で、commit と公開をせずに止める。対象 Issue を特定できないときは AskUserQuestion で確認する。対象 repo は現在のリポジトリ。要求の変更が要ると分かったら止め、`/scoping` へ戻す。合意済みの範囲内の作業ごとに許可を聞き直さない。

確認できる事実は調査し、ユーザーにしか分からない事実や未確定の意図は早めに質問する。指示文を理由に確認や停止が必要な場合は、実際に読んだ文書のパスと該当文を示し、明示された条件と自分の解釈を区別する。

`launch.ts` は、${CLAUDE_SKILL_DIR}/scripts/launch.ts にある。`launch.ts` と、worktree への `git` の commit は、Bash で、sandbox を外して呼ぶ (`dangerouslyDisableSandbox: true`)。sandbox の中では、`launch.ts` は自分の記録を書けず、撮影の browser も始まらない。sandbox を外す許可が下りなければ、中で呼び直さずに止め、人に伝える。`launch.ts` は、stdout に 1 行の JSON を書く。止まったときの扱いは、§ 停止条件にある。

## Phase 1: 起動前の照合

1. `gh issue view <ref> --json number,title,body,state,url,comments` で Issue を取る。state が OPEN で title と body が空でないことを確認する。本文の全節とコメントから合意の記録を読む。未合意の点が残っていれば起動せず、`/scoping` へ戻す。未合意の点とは、未合意と書かれた項目、未解決の問い、実装者に委ねた判断、「実装時に確認する」のように先送りした判断を指す。未決事項の節が「なし」でも、他の節にある先送りを数える。`launch.ts` が起動する session は、人に問えない。未決の判断に当たると、修理とレビューが進まずに止まる。決定がコメントにだけあるときも `/scoping` へ戻し、本文へ反映する。対象 repo の方針が今回の変更に課す手順の判定が本文に無いときも、`/scoping` へ戻す。`launch.ts` が実行できないと判定された手順の扱いが本文に無いときも同じ。判定の基準は ${CLAUDE_SKILL_DIR}/../scoping/references/sufficiency.md § 対象 repo の方針が課す手順にあり、ここでは判定し直さない。扱いは、その文書の § `launch.ts` が実行できない手順の扱いの 3 つのどれかでなければならない。check か撮影に入れる、担当を決めて引き継ぐ、今回の範囲から外す、の 3 つである。どれでもないとき、引き継ぎに担当と時期が無いとき、`launch.ts` や実装の session が後から実行するとしているときも、`/scoping` へ戻す。扱いの欄が、扱いそのもののほかに `launch.ts`・実装の session・レビューの session のどれかへ作業を割り当てているときも戻す。「実装の session は別の道具で確認する」がその例である。名前を挙げた人が実行の外で行う手順は、これにあたらない。担当 AI が、`launch.ts` の実行の外で行う手順も、これにあたらない。実装とレビューの session が読むのは、Issue の title と本文だけ。
2. `git rev-parse --show-toplevel` で対象 repo の絶対パスを決める。
3. `.dotagents.json` が commit 済みで、base の branch と同じであることを確認する。`launch.ts prepare` は、repository・remote・baseBranch・setup・check・ciChecks・capture を検査する。無ければ package.json の scripts や CI 定義から内容を仮説付きで AskUserQuestion に出し、合意した内容をユーザーの判断で commit してから進める。未 commit の差分があれば stash や移植をせず、扱いを尋ねる。Issue の必要媒体を ${CLAUDE_SKILL_DIR}/references/capture.md の表で `capture` の設定と照合し、食い違えば起動せず `/scoping` へ戻す。Issue の扱いが「check か撮影に入れる」の手順は、commit 済みの `check` か `capture` が実行することを確かめ、実行しなければ起動せず `/scoping` へ戻す。
4. Issue が担当 AI に引き継いだ確認を、本文から抜き出す。行う時期で分けて控える。時期は、公開の前、公開の後、main へ入った後である。main へ入った後の確認は、Phase 3 の最後に、残る作業としてユーザーに返す。
5. 既存 PR を直す依頼なら、この Phase を離れて § 既存 PR の修正へ回す。

## Phase 2: 実装とレビュー

`launch.ts` が起動する session が実行できるのは、利用者自身の permission の規則で許可されたコマンドだけである。check のコマンドを規則で許可していなければ、実装の session は check を通せず、`run` は `not-done` で止まる。

1. `launch.ts prepare --repo "<絶対パス>" --issue <番号>` を呼ぶ。Issue の題が英語の語を 2 つ以上持たない場合は、`--description <小文字の英語の 2 語から 4 語を - でつないだもの>` を足す。出力の `worktree` と `branch` を控える。worktree は、対象 repo の `.claude/worktrees/implement-<番号>` である。
2. `launch.ts run --worktree "<worktree>" > "<結果の file>"` を background で呼ぶ。`run_in_background: true` と timeout 7200000 を指定する。`run` は、結果の JSON を stdout に 1 行で書き、step ごとの行を stderr に書く。
3. 完了の通知を待つ。完了まで状態を polling せず、worktree を編集しない。
4. 結果の file の JSON を読む。`action` が `run` で、`ok` が true で、`verdict` が `accepted` なら、Phase 3 へ進む。`rounds` と `cost_usd` を控えておく。file が空の場合は、`run` が signal か時間切れで止まっている。手順 2 から呼び直す。他の場合は、§ 停止条件で扱う。

## Phase 3: commit と公開

`--no-publish` のときは、commit せずに、worktree、branch、`launch_file`、レビューの結果を返して終わる。

1. `launch_file` の記録を読む。記録は、1 つの JSON である。最後の巡のレビューは、`reviews` の末尾の要素にある。その要素の `self` と `independent` が、自己レビューと独立したレビューで、それぞれ `findings` と `verified` を持つ。実装の session の返事は、`implement.reply` にある。`jq '.reviews[-1] | .self, .independent | {findings, verified}' "<launch_file>"` と、`jq -r '.implement.reply' "<launch_file>"` で読める。返事からは、Issue に書いていない判断を抜き出す。
2. Phase 1 の手順 4 で控えた確認のうち、公開の前に行うものを行う。worktree の file は変えない。結果を控える。
3. `git -C "<worktree>" add -A` と、`git -C "<worktree>" commit -m "<Issue の題> (#<番号>)"` を、この順に呼ぶ。`-C` を付けないと、対象 repo の checkout に commit する。`add -A` は、Phase 2 でレビューが受理した tree と同じ file を stage する。file を変えない。
4. `launch.ts publish --worktree "<worktree>"` を呼ぶ。出力の `url` と `number` を控える。`publish` は、push と、draft の PR の作成と、media の添付を済ませる。その後に本文を確かめ、公開を記録する。`git push` と `gh pr create` を自分では打たない。
5. ${CLAUDE_SKILL_DIR}/references/publish.md の手順に進む。本文を読み、確認の comment を書く。CI を確かめて、ready に切り替える。
6. PR の URL、確認した結果、確かめていないこと、残る作業をユーザーに返す。残る作業は、main へ入った後に行う確認を含む。merge は人が決める。

## 既存 PR の修正

このスキルが公開した PR を直すときも、同じ worktree と `launch.ts` を使う。worktree は、対象 repo の `.claude/worktrees/implement-<番号>` である。人が採用した指摘は、Issue の本文に入れる。PR のコメントを自動で集めず、自動で採用しない。

1. 採用した指摘、期待する結果、許可の範囲を、`/scoping` の手順で Issue の本文へ書く。本文の差分や OPEN の状態だけで合意を判定しない。
2. `launch.ts agree --worktree "<worktree>"` を呼ぶ。`changed` が false なら、Issue が変わっていない。手順 1 に戻る。
3. PR が ready なら、修正の間は draft に戻すことを人に確かめ、`gh pr ready <n> --undo` で戻す。ready のままでは、`publish` が `pr-mismatch` で止まる。
4. Phase 2 の手順 2 から 4 を行う。`run` は、実装の session に Issue を読み直させ、撮影とレビューをやり直す。
5. Phase 3 を行う。commit は、公開した commit の上に 1 つ積む。`publish` は、新しい PR を作らず、同じ PR の本文を書き直す。
6. 採用した指摘の原因と再発性を確かめ、必要な場合だけ ${CLAUDE_SKILL_DIR}/../../rules/conventions/DOCUMENTS.md に従って既存の判断記録・テスト・lint へつなぐ。今回の合意範囲を超える改善を、既存 PR の完了条件に加えない。

## 停止条件

`launch.ts` が止まったら、${CLAUDE_SKILL_DIR}/references/launch-stops.md の表で扱いを決める。`reason` と `detail`、判明している worktree・commit・URL をユーザーに返す。止まった後に、条件や上限を変えて続行しない。
