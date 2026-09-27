# 公開後確認と ready への切替

draft PR の公開 (修正では本文の書き換え) と、同じ head の CI 確認は implement workflow が行う。この手順は、公開本文の照合から `gh pr ready` の読戻しまでを担う。CI 成功だけで ready に切り替えない。人の承認・マージは含めない。

## 手順

1. workflow の戻り値の `ci` と `remaining` を読む。`ci.status: passed` は、公開した head で `ciChecks` の check が成功し、他の登録済み check にも失敗・保留が無かったことを示す。
2. `gh pr view <n> --json <項目>` で実際の本文と対象を読む。項目は url・state・isDraft・body・author・headRefName・headRefOid。加えて headRepository・headRepositoryOwner・isCrossRepository・baseRefName・closingIssuesReferences・statusCheckRollup も読む。head の repo が対象 repo で、別 repo からの PR でないことも確かめる。本文の事実・数量・条件・範囲・否定・未確認事項・リンクを照合する (published_body_check)。照合先は Issue・accepted の評価要約・check 結果。生成時の省略や整形で意味が変わっていないかを読む。`remaining` に `rendered_media_check` があれば、添付した媒体の表示・再生と説明・配置を PR 画面で確認する。
3. 本文を直す必要があれば、`isDraft: true` を確認してから `gh pr edit <n> --body-file <path>` で更新し、最新本文を読み戻す。書込み直前にも最新本文・head と変更案を照合し、他者の変更があれば上書きせず取り込み方をユーザーに尋ねる。
4. ready 直前に、確認した版と最新の対象・本文・head・Issue・評価要約・check 結果、`gh api user` の実効主体、対象 repo の権限、同じ head の CI を再照合する。変更があれば関係する手順へ戻る。
5. すべて揃ったら `gh pr ready <n>` で切り替える。`gh pr view <n> --json isDraft,headRefOid,url,body,statusCheckRollup` で、`isDraft: false`・head・本文・同じ head の CI が確認した版と一致することを読み戻す (mark_ready)。PR URL、確認した版と結果、未確認事項を返す。

## 不備の戻し先

| 不備                            | 戻し先                                          |
| ------------------------------- | ----------------------------------------------- |
| 説明だけの不備                  | 手順 3 の本文修正と再確認                       |
| 成果物の不備                    | SKILL.md § 既存 PR の修正                       |
| 事実不足                        | 調査。結果を本文か Issue に反映して手順 2 へ    |
| 要求・権限の変更                | 人の判断。draft を維持して待つ                  |
| 公開結果が不明 (通信断・割込み) | `gh pr view` で実状態を確認するまで再試行しない |
| 他者による予期しない状態変更    | 対象・変更内容・権限を照合してから対応する      |
