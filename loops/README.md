# PR review loop

自分がレビュワー指定された PR を1時間ごとに拾い、新規 / commit 更新分だけ `/preview` で下書きレビューし、人が投稿判断する loop。投稿は自動化しない(gate は人)。

## 部品

| 部品       | 実体                                                                                                                 |
| ---------- | -------------------------------------------------------------------------------------------------------------------- |
| automation | `/loop 1h`(PC 起動中)。cloud Routines は雇用主の private code を cloud へ出すため不採用                              |
| generator  | `/preview`(下書きレビュー生成)                                                                                       |
| evaluator  | 現段階は無し。gate=人が100%読む間は人 gate が「no と言う物」。auto-post に進む段で critic-evidence を足す(§段階運用) |
| state file | `loops/pr-review-state.json` (gitignore 済み)。key=`owner/repo#num` → head SHA                                       |
| drafts     | `loops/drafts/<owner-repo>#<num>@<sha>.md` (gitignore 済み)。未投稿レビューの inbox                                  |
| gate       | drafts のファイルを人が読む → 投稿判断 → 済んだら削除                                                                |

## スクリプト

- `pr-review-scan.sh` — `review-requested:@me` の open PR を引き、state と SHA 照合し新規/更新分のみ JSON Lines で出力。state は書かない
- `pr-review-mark.sh <owner/repo#num> <sha>` — 下書き保存済みとして state に記録。次の scan でその commit は skip

## draft ファイル書式

1 PR 1ファイル。先頭に PR リンクと概要、続けて `/preview` のレビュー本文。ファイルを開くだけで対象と中身が分かるようにする。

```markdown
# <PR title>

- PR: <url>
- repo: <owner/repo> #<num>
- head: <sha>
- 概要: <この PR が何を変えるか 1-2 文>

---

<`/preview` のレビュー出力>
```

## 段階運用

論文(Loop-Engineering)の prove-then-widen に沿う。小さく回して信頼を勝ち取ってから広げる。

| 段階 | gate           | evaluator       | 進む条件                                                  |
| ---- | -------------- | --------------- | --------------------------------------------------------- |
| 1    | 人が100%読む   | 無し            | sandbox 許可で unattended 1回が端から端まで通ると確認済み |
| 2    | 人が sample    | critic-evidence | 実 draft を数件読み、false positive の傾向を実感          |
| 3    | auto-post 一部 | critic-evidence | evaluator が実ミスを捕まえると証明できた                  |

evaluator を段階1で足さない理由。人が draft を100%読む間は人 gate が「no と言う物」で、evaluator と役割が重複する。evaluator が load-bearing になるのは人を inner loop から外す段(auto-post)。critic-audit を `/preview` に被せるのは「LLM の意見への LLM の意見」で論文の Nodding Loop に当たるため、足すなら実行パスを辿る critic-evidence を false-positive 削減として scope を限定する。

## /loop プロンプト例

```
/loop 1h bash ~/.claude/loops/pr-review-scan.sh を実行。出力された各 PR に /preview を回し、
結果は投稿せず loops/drafts/<key>@<sha>.md に保存。ファイル先頭に PR リンク・repo・head SHA・
概要を書き、その下にレビュー本文を置く。保存後 pr-review-mark.sh で SHA を記録。0件なら何もせず終了。
```

## 前提 / 注意

- sandbox TLS。macOS の Seatbelt 下で gh(Go CLI)は TLS 証明書検証に失敗する(OSStatus -26276)。これは domain ブロックでなく Seatbelt の制約で、allowedDomains や /sandbox の network 許可では直らない(公式 doc の Troubleshooting 参照)。正式回避は `sandbox.excludedCommands` に gh と scan の wrapper を入れ Seatbelt 外で走らせること。settings.json は sandbox が write を拒否し auto モードの classifier も self-modification を弾くため、反映は人の手で行う

```jsonc
// ~/.claude/settings.json
"sandbox": {
  "excludedCommands": ["agy", "afplay", "scout", "gh *", "bash *pr-review-scan.sh"]
},
"permissions": {
  "allow": ["Bash(gh *)", "Bash(bash *pr-review-scan.sh)"]
}
```

- `gh *` は /preview が直接呼ぶ gh(pr diff 等)を Seatbelt 外へ。`bash *pr-review-scan.sh` は wrapper 内の nested gh を Seatbelt 外へ
- excludedCommands は permission flow を通るので、no-prompt には対応する allow ルールか auto-allow mode が要る
- `gh *` の allow は全 gh を無確認にする。段階1は read-only なので投稿系を弾くなら read subcommand に scope を絞る判断もある(段階3の auto-post 時に再検討)
- 反映後、段階1の進む条件として `bash ~/.claude/loops/pr-review-scan.sh` が prompt 無しで JSON Lines を返すか確認する
- review capacity がボトルネックなら導入しない。loop は下書きを増やすだけで、未読 AI レビューが溜まる(記事 step 4)
- token の hard な per-run 上限は `/loop` に primitive が無い。コスト制御は SHA-dedup(steady state は変更 PR だけ再レビュー)と `PR_REVIEW_LIMIT`(1回の処理上限 PR 数、既定30)の work cap で行う
- 自動投稿(`/preview --comment`)は段階3。evaluator(critic-evidence)を人 gate を外す前提条件として同時に入れる
