# 公開の手順

呼び出し元の skill が書いたファイルを 1 つの commit にまとめ、draft PR にする。`/sweep`、`/dr`、`/outcome` が最後の手順でこのファイルを読む。

## 呼び出し元が渡す値

件名は `skills/implement/scripts/launch.ts` が Issue title に求める接頭辞で始める。題は `~/.claude/settings.json` の `language` の言語で書き、未設定なら英語で書く。

| 値       | 中身                                                         |
| -------- | ------------------------------------------------------------ |
| branch   | 今の branch が base のときに作る branch の名前               |
| 件名     | `[<接頭辞>] <題>`。commit の件名と PR の title に同じものを使う |
| 本文     | commit と PR の本文                                          |
| ファイル | `git add` するファイルのパスの一覧                           |

## 手順

1. `git rev-parse --show-toplevel` で対象 repo の root を確かめる。root に `.dotagents.json` があれば `cat` で読み、base を `baseBranch`、remote を `remote` から取る。無ければ base を `gh repo view --json defaultBranchRef --jq .defaultBranchRef.name` で取り、remote を `origin` にする
2. 今の branch が base なら、呼び出し元が渡した名前で `git switch -c` する。base でなければ今の branch をそのまま使う。同じ名前の branch が local (`git branch --list <名前>`) か remote (`git ls-remote --heads <remote> <名前>`) のどちらかにあれば、末尾に `-2` から順に数字を付ける。数字を付けた名前も同じ 2 つで確かめる
3. `.dotagents.json` に `check` があれば、repo の root で実行する。`check` が配列なら先頭を command、残りを引数として渡し、文字列なら `sh -c` に渡す。0 以外で終わったら commit と push をせずに、落ちた出力を報告して終える
4. 呼び出し元が渡したファイルだけを、パスを挙げて `git add` する。`git add -A`、`git add .`、`git commit -a` は使わない
5. 1 行目に件名、空行の後に本文を書いたメッセージを `$TMPDIR` のファイルに書き、`git commit -F <ファイル>` で commit する
6. `git push <remote> <branch>` を実行する
7. `gh pr list --head <branch> --state open --json url` で open な PR を確かめる。あれば新しく作らず、その URL を使う。無ければ本文を `$TMPDIR` のファイルに書き、`gh pr create --draft --base <base> --head <branch> --title <件名> --body-file <ファイル>` を実行する
8. PR の URL を報告する
