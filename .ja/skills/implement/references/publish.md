# 公開の後の確認と ready への切り替え

`/implement` の Phase 3 が使う、`launch.ts publish` の後の手順。`publish` は、push、draft の PR の作成、media の添付、本文の確認、公開の記録までを済ませている。この手順は、本文を読むこと、確認の comment、CI の確認、ready への切り替えを担う。CI の成功だけで ready に切り替えない。人の承認と merge は含めない。

PR の本文は、`launch.ts` が記録から組み立てたものである。手で書き換えない。書き換えると、次に直すときに、`launch.ts` が `body-changed` で止まる。本文に足したいことは、確認の comment に書く。launch-stops.md の `media-unattached` の行が述べる添付だけが、例外である。

## 手順

1. `gh pr view <n> --json url,state,isDraft,body,headRefOid,baseRefName,closingIssuesReferences` で、PR を読む。head が commit した SHA で、閉じる Issue が今回の Issue だけであることを確かめる。本文の事実、数量、条件、範囲、否定、未確認の事項を、Issue、`launch_file` の最後の巡のレビュー、check の結果と照らす (published_body_check)。
2. 本文に節 `## Media` があれば、PR の page で、media が表示されるか再生されること、path と中身が合うことを確かめる (rendered_media_check)。page を開けない場合は、本文の HTML を読む。`gh api repos/<repository>/pulls/<n> -H "Accept: application/vnd.github.html+json" --jq .body_html` で読める。media ごとの画像か動画があることを確かめる。page では確かめていないこととして控える。
3. 確認の comment を、file に書く。中身は、下の表の順にする。日本語なら、`${CLAUDE_SKILL_DIR}/../../node_modules/.bin/textlint --config ${CLAUDE_SKILL_DIR}/../../.textlintrc.json <file>` を実行する。指摘された文は、${CLAUDE_SKILL_DIR}/../../rules/conventions/PROSE.md に沿って書き直す。`gh pr comment <n> --body-file <file>` で投稿する。
4. `gh pr checks <n> --watch --fail-fast` を background で呼び、完了の通知を待つ。timeout は 3600000 を指定する。終わったら、`gh pr checks <n> --json name,state,bucket` で、次の 2 つを確かめる。`.dotagents.json` の `ciChecks` の全ての名前が、`bucket` が `pass` の check としてある。`bucket` が `fail` か `pending` の check が、1 つもない。`ciChecks` の名前がまだないか、`pending` が残る場合は、もう 1 回 `--watch` を呼ぶ。その前と後に、`gh pr view <n> --json headRefOid` で、head が commit した SHA のままであることを確かめる。
5. Phase 1 で控えた確認のうち、公開の後に行うものを行い、結果を PR の comment に足す。
6. ready の直前に、PR の head、本文、同じ head の CI、Issue の state を読み直す。手順 1 と手順 4 で確かめた版から変わっていれば、関係する手順へ戻る。
7. `gh pr ready <n>` で切り替える。`gh pr view <n> --json isDraft,headRefOid,url` で、`isDraft` が false で、head が確かめた SHA であることを読み戻す (mark_ready)。

確認の comment は、次の中身を、この順に持つ。当たるものがない行は、書かない。

| 順 | 中身 |
| --- | --- |
| 1 | 公開の前と後に確かめたことと、その結果。Issue が担当 AI に引き継いだ確認を含む |
| 2 | `run` の回数、巡の数、2 つのレビューの判定、費用 |
| 3 | 本文に載っていないこと。自己レビューの必須でない指摘と、実装の session の返事のうち Issue に書いていない判断である |
| 4 | Issue と違う所、本文の不備、確かめていないこと。人に確かめてほしいこととして書く |
| 5 | 残る作業 |

## 不備の戻し先

| 不備 | 戻し先 |
| --- | --- |
| 本文の説明だけの不備 | 確認の comment に書く。本文は書き換えない |
| 成果物の不備 | SKILL.md § 既存 PR の修正 |
| 事実の不足 | 調査する。結果を、確認の comment か Issue に書く |
| 要求か権限の変更 | 人の判断。draft のまま待つ |
| CI の失敗 | draft のまま保つ。失敗した check の log から原因を調べる。成果物が原因なら、SKILL.md § 既存 PR の修正で直す。CI の環境が原因なら、人に伝える |
| 公開の結果が分からない (通信の断、割り込み) | `gh pr view` で状態を確かめるまで、やり直さない |
| 他の人による、予期しない状態の変更 | 対象、変更の中身、権限を確かめてから対応する |
