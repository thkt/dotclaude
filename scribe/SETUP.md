# scribe セットアップ

`~/.claude/scribe` は、対象リポのコード構造を `docs/wiki/` に蓄積し PR で提案する自律機構。
仕組みは `~/.claude` に置き、振る舞いは呼び出したリポの `docs/wiki/README.md` とコードで決まる。

## 構成

scribe/ は plugin ではなく `~/.claude` 直下の loose な自動化ディレクトリ。ディレクトリ内の 4 ファイルだけでは動かず、外部依存として `~/.claude/lib/check-workday.sh`・`gh`・`codex` を使う（GitHub にリモートが無いリポは PR 作成が gh 依存のため対象にできない）。

| ファイル                         | 役割                                                        |
| -------------------------------- | ----------------------------------------------------------- |
| `run.sh`                         | 全処理。引数ありで1リポ、引数なしで巡回（対象リポ自動検出） |
| `PROMPT.md`                      | codex への Ingest 指示（1リポ処理、Slack なし）             |
| `wiki-readme.template.md`        | 対象リポに置く `docs/wiki/README.md` の雛形                 |
| `logs/`                          | 実行ログ（7日保持）                                         |
| `~/.claude/lib/check-workday.sh` | 巡回モードの平日判定（scribe 外の外部依存）                 |

state ファイルは持たない（run.sh:7 の不変条件）。差分の基準は対象リポの GitHub 上の「最後にマージされた scribe PR の merge commit」から都度導出する。巡回対象の登録簿も持たない。巡回根は run.sh:24 にハードコードされた `$HOME/Personal` と `$HOME/GitHub/*/*` で、その配下で `docs/wiki/README.md` を持つリポが自動的に対象になる。

## 対象リポの追加

per-repo オンボーディング（wiki 規約 README の配置、scribe ラベル作成、初回実行）は `/scribe-setup` スキルが行う。

## 実行

```bash
~/.claude/scribe/run.sh <repo の絶対パス>   # 1リポだけ（初回=全体, 以降=差分）
~/.claude/scribe/run.sh                     # 巡回（~/.claude/lib/check-workday.sh で平日判定。~/Personal と ~/GitHub/*/* から自動検出）
```

## 定期実行（launchd）

`~/Library/LaunchAgents/com.thkt.scribe.plist` の ProgramArguments を `~/.claude/scribe/run.sh`（引数なし）にする。
plist の source of truth は `~/Library/LaunchAgents/`。リポ内にコピーは置かない。

## 承認フロー

scribe は PR を作るだけ。人間がレビューしてマージ＝承認。直接 main には触れない。
Slack 通知は無い（PR 作成自体が通知）。

差分の再走査とスキップは stateless 仕様から導かれる。

- 走査済み SHA は記録しない。基準はマージされた scribe PR からのみ進む。
- codex が「変更に wiki 対象なし」と判断して PR を作らなかった場合、基準は進まず次回同じ差分を再走査する。これは bug ではなく idempotent な仕様。同じ差分からは同じ判断に収束し、後の変更で wiki 対象が生じれば同じ再走査が取りこぼしを回収する（self-correcting）。
- 未マージの scribe PR が残っている間、そのリポは開いた PR を追い越さず巡回をスキップする（重複 PR 防止）。巡回が止まっていることは、その開いた PR 自体が可視化する。マージすると次回巡回でそのマージ以降の差分が対象になる。
