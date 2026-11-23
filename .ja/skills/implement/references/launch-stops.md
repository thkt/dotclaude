# launch.ts が止まったときの扱い

`launch.ts` は、止まると、stdout に 1 行の JSON を書き、1 で終わる。JSON は、`action`、`ok` (false)、`reason`、`detail` を持つ。2 で終わった場合は、呼び方が読めなかった。stdout は空で、stderr に使い方が出る。呼び方を直す。143 で終わった場合は、signal で止められた。

`reason` で、下の表の行を選ぶ。扱いは、行が決める。`detail` は人に示す。`detail` が command を述べていても、行がその command を使うと書いていない限り、使わない。`detail` の command には、push、PR を閉じること、process を止めること、記録を消すことがある。

行が action で分けている場合は、JSON の `action` を見る。`run` が止まった場合、止まった step は、`steps` の末尾の要素である。

止まった後に、条件や上限を変えて続けない。worktree を自分で編集しない。「人が決める」とある行では、決まるまで待つ。「呼び直す」とある行で、同じ理由が 2 回続いた場合は、人に示す。

## 呼ぶ順と、同時の呼び出し

| 理由 | 扱い |
| --- | --- |
| `not-prepared` | `prepare` が済んでいない worktree である。まだ `prepare` を呼んでいなければ、呼ぶ。`prepare` が止まった後なら、`prepare` が返した理由の行に従う |
| `not-implemented` `not-reviewed` `not-captured` `not-accepted` `nothing-to-repair` `nothing-to-reread` `nothing-to-continue` | 直に呼んだ action が、今の状態では走れない。`run` を呼ぶ。`run` が、次に要る action を決める |
| `already-implemented` | 実装は済んでいる。`run` を呼ぶ。`--fresh` は、レビューと撮影の記録を捨てる。人が決めた場合にだけ使う |
| `review-stale` `tree-changed` | レビューの後に、worktree か Issue が変わった。自分が worktree を編集していないことを確かめ、`run` を呼ぶ |
| `busy` | 別の `launch.ts` が、同じ worktree で動いている。止めずに、終わるのを待って、呼び直す |
| `holder-write-failed` | `launch.ts` が、自分の記録を書けない。sandbox の中で呼んでいる。sandbox の外で呼び直す |
| `claude-left-running` `holder-unreadable` | 前の `launch.ts` が、process か記録を残している。`detail` を人に示す。process を止めるか、記録を消すかは、人が決める |
| `no-progress` | `run` が、同じ action を続けて呼ぼうとした。レビューの指摘とは関わりがない。`detail` と `launch_file` を人に示す。呼び直さない |

## 起動の前

| 理由 | 扱い |
| --- | --- |
| `uncommitted-start-inputs` `invalid-config` `no-ci-checks` `config-differs` | `prepare` の前の、`.dotagents.json` の確認に戻る。人が直して commit し、base の branch と同じにしてから、`prepare` を呼び直す |
| `no-config` | `prepare` が返した場合は、上の行と同じである。他の action が返した場合は、記録した base の commit が、設定を持たない。人が決める |
| `gh-host` `remote-mismatch` `repo-unreadable` `repository-mismatch` `no-permission` `no-actor` | 公開先を人が直す。直すのは、remote の URL、gh の host と認証、repo の権限である。別の主体へ切り替えない |
| `issue-unreadable` `fetch-failed` | gh の認証、network、Issue の番号を確かめて、呼び直す |
| `issue-not-open` `issue-untyped` | Issue の state か題が、決まりに合わない。Issue を開き直すか、題を直すかは、人が決める。`/scoping` へ戻す |
| `no-description` | Issue の題から branch の名前を作れない。小文字の英語の 2 語から 4 語を `-` でつなぎ、`--description` に渡して、`prepare` を呼び直す |
| `branch-exists` `worktree-exists` | 前の起動の branch か worktree が残っている。対象 repo の `.claude/worktrees/implement-<Issue の番号>` があり、`run` が `not-prepared` を返さない場合に限り、`run` で続きを進める。他の場合は、消すかどうかを人が決める |
| `worktree-failed` `setup-failed` `gate-failed` | 実行の環境の問題である。`detail` を人に示す。`setup-failed` と `gate-failed` の後は、worktree と branch が残る。`run` は呼ばない。消して `prepare` を呼び直すかを、人が決める |

## 実装とレビュー

| 理由 | 扱い |
| --- | --- |
| `requirements-changed` | 合意した版の後に、Issue の題、本文、state が変わった。人が合意した変更なら、`agree` を呼んでから `run` を呼ぶ。そうでなければ、`/scoping` へ戻す |
| `child-failed` `review-failed` | claude の session が、結果を返さなかった。`detail` を人に示す。呼び直すかを、人が決める |
| `not-done` | check が通っていない。`detail` が `continue round` で始まる場合は、実装の session が、同じ tree で check を通せなかった。人に示す。`publishable`、`publish`、`published`、`body` が返した場合も、人に示し、`run` を呼ばない。他の場合は、`run` を呼ぶ。`run` が、実装の session に check を通させる |
| `gate-unreadable` | 関門の状態を読めない。`detail` を人に示す |
| `disagreement` `not-converging` | 修理とレビューが、同じ指摘で進まない。`run` の `required` を人に示し、要求、範囲、権限についての判断を仰ぐ。判断は、`/scoping` の手順で Issue の本文へ書く。本文が変わったら、`agree` と `run` を呼ぶ |

## 撮影

| 理由 | 扱い |
| --- | --- |
| `capture-unavailable` `capture-timeout` | 撮影の環境の問題である。sandbox の外で呼んでいること、browser が入っていることを確かめて、`run` を呼び直す。`detail` が、adapter の directory がないと述べる場合と、制限時間を変える場合は、人が決める |
| `capture-failed` | `run` が返した場合は、撮影が落ち、実装の session が何も変えなかった。`launch.json` の `captures` の末尾の `log_tail` を人に示す。`capture` を直に呼ぶかは、人が決める。`capture` が返した場合は、`run` を呼ぶ。`run` が、実装の session に直させる |
| `source-changed` | 撮影の command が、worktree に file を書いた。`run` を呼ばない。書かれた file をどうするかは、人が決める |
| `capture-media-ignored` `invalid-capture` | 撮影の定義か、`.dotagents.json` の `capture` が、決まりに合わない。`detail` を人に示す。設定を変えるかは、人が決める |

## 公開

| 理由 | 扱い |
| --- | --- |
| `commit-mismatch` | `HEAD` が、受理された tree を持たないか、親が違う。受理された worktree を、変えずに 1 つの commit にする。親は、始めての公開では base の commit、公開の後では最後に公開した commit である |
| `no-assessments` | 最後のレビューの記録が、PR の本文に載せる field を持たない。`review` を直に呼び、新しい巡の記録を作る |
| `media-path-unsupported` | media の path が、PR の本文に書けない文字を持つ。撮影の定義を変えるかは、人が決める |
| `already-published` | `HEAD` は、もう公開してある。CI の確認と、ready への切り替えに進む |
| `already-pushed` | commit は push してあり、公開の記録がない。`publish` を呼ぶ |
| `branch-pr-exists` | 同じ branch の PR が、もうある。この起動が作った PR なら、`published` を呼ぶ。そうでなければ、人が決める |
| `not-pushed` | PR の head が、前に公開した commit のままである。`gh pr view` で head を確かめる。head が worktree の `HEAD` なら、`published` を呼ぶ。そうでなければ、`publish` を呼ぶ |
| `no-pr` | 開いている PR がない。公開の記録がまだない場合は、`publish` を呼ぶ。記録がある場合は、PR が閉じたか、merge されている。人が決める |
| `several-prs` | 同じ branch の開いた PR が、2 つ以上ある。閉じない。人が決める |
| `pulls-unreadable` `remote-unreadable` | GitHub か remote を読めない。gh の認証と network を確かめて、呼び直す |
| `push-failed` `pr-create-failed` `pr-edit-failed` | `detail` の出力を人に示す。remote の branch が分かれている場合は、人が直す。そうでなければ、`gh pr view` と `git ls-remote` で状態を確かめてから、`publish` を呼び直す |
| `media-unattached` | PR の本文の media が、添付されていない。この行では、`detail` の `gh pr edit` を使う。打った後に、`published` を呼ぶ |
| `pr-mismatch` | PR が、記録と違う。違う項目が `draft` だけの場合は、PR が ready になっている。draft に戻して直すかは、人が決める。他の項目が違う場合は、上書きせず、人が決める |
| `body-changed` `publications-unreadable` | PR の本文か、公開の記録が、`launch.ts` が書いたものと違う。上書きしない。人が決める |
