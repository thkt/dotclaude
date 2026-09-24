# Prompt Log Integration

`/pr` の Phase 3 が、作成したばかりの PR へ prompt log を render し、埋め、添付する手順。各失敗がどこでこの工程を早期終了させるかも持つ。

## 手順

1. § Base ブランチ検出が読むのと同じ reflog から、`--date=iso` を付けて、現在の branch へ最初に移った entry の時刻を `--since` として求める。

   ```bash
   SINCE=$(git reflog --date=iso --format='%gd %gs' | grep "moving from .* to $(git branch --show-current)$" | tail -1 | sed -n 's/^HEAD@{\(.*\)} .*/\1/p')
   ```

2. `node skills/pr/scripts/prompt-log.ts render "$CLAUDE_SESSION_ID" --out <path> --since "$SINCE"` を実行する。
3. render された各 `Outcome:` 行を、そのプロンプトに合う語で埋める (§ Outcome の語)。
4. `node skills/pr/scripts/prompt-log.ts check <path>` を実行する。
5. 結果で分岐する (§ 結果)。

## Outcome の語

`check` が検査するのは各 `Outcome:` 行の存在と、この 3 語のいずれかで始まることだけ。書かれた語が正確かどうかは検査しない。

| 語          | いつ書くか                                                 |
| ----------- | ---------------------------------------------------------- |
| `adopted`   | そのプロンプトの依頼が、この PR にそのまま実装として乗った |
| `abandoned` | そのプロンプトが持ち出した事柄を、この PR は持たない       |
| `unrelated` | そのプロンプトが、この PR の変更と無関係                   |

## 結果

| 結果                                      | どうなるか                                                                                              |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `render` または `check` が非ゼロで終了    | ここで終える。pageshot 添付の失敗時と同じく、stderr が出した理由とファイルパスを報告する (§ 作成の制約) |
| 両方が 0 で終了し、AskUserQuestion が承認 | `gh pr edit <number> --attach <path>` を実行する                                                        |
| 両方が 0 で終了し、AskUserQuestion が拒否 | PR を編集せずに終える                                                                                   |
