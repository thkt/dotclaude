# Hooks Design

Hook システムの設計意図と仕組み。実登録は `settings.json` が正で、本書は構造と意図を説明する。`settings.json` は hook を 1 つも登録していない (DR-0123)。本書の表は、各スクリプトが最後に持っていた配線の記録である。statusLine の登録だけが残る。

## 実行レイヤー

Rust バイナリは sentinels プラグインとしても配布するが、登録は brew バイナリの直登録に一本化している。

| レイヤー         | 実体                           | 登録方式                         |
| ---------------- | ------------------------------ | -------------------------------- |
| スクリプト hooks | `~/.claude/hooks/**/*.{sh,ts}` | `settings.json`                  |
| Rust バイナリ    | `brew install thkt/tap/{tool}` | `settings.json` (コマンド直登録) |

### 言語

hook をシェルスクリプトで書くのは、仕事が数個の判定と 1 回の fork で済むとき。構造が要るほど処理が長いか、テストと共有するときは TypeScript で書く (DR-0114)。`mirror_prose_guard.ts` が後者で、規則そのものは `_lib/mirror_prose.ts` にあり、リポジトリ一括検査のテストも同じモジュールを読む。Python は hook の実装言語から外した (DR-0121)。

テストは hook 本体と同じ言語で書く。シェルに残すのは、スタブとしてシェルスクリプトを PATH へ置くものだけで、`amphetamine_agent_session` の osascript と `rust-edit` の cargo がこれにあたる。

## 命名

ディレクトリがイベントを答えるので、ファイル名は対象と操作を答える。形は `<対象>_<操作>` で、対象はこの hook が見るもの、操作はそれに対して何をするか。読み手は先頭の語で対象を絞り込める。

TypeScript はアンダースコアで区切る。shell はハイフンで区切る。`_lib/` のモジュールは import されるので、語の区切りにアンダースコアが要る。hook 本体どうしは import しないため、技術的な縛りが無い。それでも揃えるのは、hook 名からテスト名を機械的に引けるため。テスト側はハイフンで区切る (`rust_post_edit.ts` に対して `rust-edit.test.ts`)。

操作を表す語は、名詞としても読める語 (guard/gate/fix/index/alert/rewrite) を選ぶ。`notify` のような動詞専用の語は名前として据わりが悪い。既に英語として読める動詞句 (`rm_to_trash`, `body_proofread`) はそのまま置く。

例外は 2 つ。外部アプリを丸ごと扱うものは `<アプリ名>_<管理対象>` とし、`amphetamine_agent_session` は「エージェントのターン中だけ」という限定を名前に残す。1 語で足りるものは 1 語で置く (`statusline`)。複数の hook をまとめて見るテストは、その群を表す名前を持つ (`rust-edit.test.ts` は pre/post の 2 本と `_lib/rust_target.ts` を見る)。

| 種別                  | 形                   | 例                        |
| --------------------- | -------------------- | ------------------------- |
| TypeScript hook       | `<対象>_<操作>.ts`   | `rm_to_trash.ts`          |
| shell hook            | `<対象>-<操作>.sh`   | `failure-alert.sh`        |
| _lib モジュール       | `<名詞>.ts`          | `japanese.ts`             |
| TypeScript テスト     | `<hook 名>.test.ts`  | `rm-to-trash.test.ts`     |
| shell テスト          | `<hook 名>.test.sh`  | `failure-alert.test.sh`   |

## 実行の絞り込み

Bash ゲートの hook はすべての Bash 呼び出しで発火する。そのため fast-exit を何よりも先に走らせる。該当する hook はすべて 1 ファイルを選んでいる。`amphetamine_agent_session`、`package_manager_rewrite`、`body_proofread`、`security/` の 3 本は、いずれも生の payload への部分文字列の検査で始まり、何も parse しないまま返る。

`settings.json` の `if` 条件はこの絞り込みを代われない。`cd /tmp && git commit` を取りこぼすからである。fast-exit にできるのは、追い返す呼び出しの経路から重い仕事を外すこと。部分文字列の検査で返る経路は、payload を parse せず外部コマンドも起動しない。

## イベントマップ

シェル hook は、それを発火させるイベントの名前が付いたディレクトリに置く。新しい hook の置き場は `settings.json` が決める。`security/` だけは役割で分けた例外。破壊的なコマンドを止める仕事は、Bash ゲートの他と分けて名指しする価値がある。

| イベント         | Matcher            | フック                                                                                                                                                            |
| ---------------- | ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PreToolUse       | Bash               | pre-bash/package_manager_rewrite, security/npm_install_guard, security/rm_to_trash, security/git_sandbox_guard, pre-bash/body_proofread, pre-bash/issue_body_gate |
| PreToolUse       | Write/Edit         | edit/rust_pre_edit.ts                                                                                                                                             |
| PostToolUse      | Write/Edit         | edit/rust_post_edit.ts, edit/textlint_fix.ts, edit/rumdl_check.ts, edit/mirror_prose_guard.ts                                                                     |
| PostToolUse      | Bash               | post-bash/scribe_prompt                                                                                                                                           |
| PostToolUse      | \*                 | integrations/amphetamine_agent_session background                                                                                                                 |
| UserPromptSubmit | -                  | integrations/amphetamine_agent_session acquire                                                                                                                    |
| Stop/StopFailure | -                  | lifecycle/failure-alert, integrations/amphetamine_agent_session release                                                                                           |
| statusLine       | -                  | lifecycle/statusline                                                                                                                                              |

## スクリプト hooks

### pre-bash/

| Hook                       | イベント         | 失敗モード  | 用途                                                                                                          |
| -------------------------- | ---------------- | ----------- | ------------------------------------------------------------------------------------------------------------- |
| package_manager_rewrite.ts | PreToolUse(Bash) | fail-closed | パッケージマネージャーコマンドを ni 系へ変換。マネージャー自身のフラグと bun 内蔵のテストランナーは素通しする |
| body_proofread.ts          | PreToolUse(Bash) | fail-closed | gh issue/pr create の本文と commit メッセージを校正し、起票には構造チェックを添える (advisory)                |
| issue_body_gate.ts         | PreToolUse(Bash) | fail-closed | 本文が骨格から外れた `gh issue create` を deny する                                                           |

### edit/

| Hook                  | イベント    | 失敗モード  | 用途                                                                |
| --------------------- | ----------- | ----------- | ------------------------------------------------------------------- |
| rust_pre_edit.ts      | PreToolUse  | fail-open   | .rs 編集前に cargo clippy を走らせ、結果を additionalContext へ注入 |
| rust_post_edit.ts     | PostToolUse | fail-open   | .rs 編集後に cargo fmt、その結果へ clippy                           |
| textlint_fix.ts       | PostToolUse | fail-closed | 日本語の .md ファイルを textlint で自動修正                         |
| mirror_prose_guard.ts | PostToolUse | fail-closed | `.ja/` のファイルが日本語の散文を失ったら警告する (ブロックしない)  |

### security/

| Hook                 | イベント         | 失敗モード  | 用途                                                                                                        |
| -------------------- | ---------------- | ----------- | ----------------------------------------------------------------------------------------------------------- |
| npm_install_guard.ts | PreToolUse(Bash) | fail-closed | ignore-scripts が有効でないパッケージインストールをブロック。走らせる先の .npmrc をホーム側より優先して読む |
| rm_to_trash.ts       | PreToolUse(Bash) | fail-closed | rm/rmdir/unlink/shred を `mv ~/.Trash/` へ誘導                                                              |
| git_sandbox_guard.ts | PreToolUse(Bash) | fail-closed | ~/.claude で作業ツリーを書き換える git を sandbox 内で止める。読み取りだけの形は通す                        |

### lifecycle/

| Hook             | トリガー          | 失敗モード | 用途                                                                        |
| ---------------- | ----------------- | ---------- | --------------------------------------------------------------------------- |
| statusline.sh    | statusLine        | fail-open  | ステータスライン表示と、自身が持つセッション単位 state の TTL 掃除          |
| recall_index.ts  | SessionStart      | fail-open  | recall のクロスセッション索引をバックグラウンド更新。いまは SessionStart に配線していない |
| failure-alert.sh | Stop, StopFailure | fail-open  | 悪い終わり方をしたターンを音で知らせる。end_turn と subagent では鳴らさない |

### integrations/

Claude Code の外にあるアプリを動かす hook。対象のアプリが無いマシンでは exit 0 で終わるので、入れていないマシンでも影響が出ない。

| Hook                         | トリガー                            | 失敗モード  | 用途                                                        |
| ---------------------------- | ----------------------------------- | ----------- | ----------------------------------------------------------- |
| amphetamine_agent_session.ts | UserPromptSubmit, PostToolUse, Stop | fail-closed | ターンが走る間 macOS を起こしたままにし、終わったら解放する |

### _lib/

hook が読み込む共有コード。単体では登録しない。`japanese.ts` は言語そのものを判定し、`mirror_prose.ts` は `.ja/` の中身を検査する。前者はどのファイルにも使える述語で、後者はミラーだけを対象に取る。

| モジュール      | 利用元                                                      |
| --------------- | ----------------------------------------------------------- |
| command_scan.ts | body_proofread, wiki_scene, scribe_trigger, gh_filing, security の 3 本 |
| gh_filing.ts    | body_proofread, issue_body_gate                             |
| hook_payload.ts | hook すべてと mirror_prose, rust_target, amphetamine_state  |
| mirror_prose.ts | mirror_prose_guard と .ja/ 一括検査テスト                   |
| japanese.ts     | body_proofread, mirror_prose, textlint_fix                  |
| textlint.ts     | textlint_fix                                                |
| rust_target.ts  | rust_pre_edit, rust_post_edit                               |

## Quality Pipeline (Rust バイナリ)

このファミリーのバイナリは 1 つも `settings.json` に配線されていない。書き込み前後の品質強制は `hooks/` 配下の TypeScript hook と CI が持つ。

CI が引き継ぐのは oxlint と tsc による型検査である。`knip` `depcruise` `circular` `coupling` `jscpd` を見るものは残っていない。JS/TS の書き込み時整形も、spec 文書の品質検証も、guardrails のカスタム規則が見ていた sensitiveFile や XSS も残らない。oxfmt は devDependency のまま誰も呼ばない。書き込み前に残る検査は `rust_pre_edit.ts` の clippy で、`.rs` だけを対象に取る。

| バイナリ   | 担っていた仕事                                                                                     | 外した記録 |
| ---------- | -------------------------------------------------------------------------------------------------- | ---------- |
| guardrails | PreToolUse。oxlint 規則と sensitiveFile・cryptoWeak・XSS・eval などの規則で critical/high をブロック | DR-0122    |
| formatter  | PostToolUse。oxfmt による JS/TS の整形                                                             | DR-0121    |
| gates      | PostToolUse。`knip` `tsgo` `oxlint` `depcruise` `circular` `coupling` `jscpd` の静的ゲート         | DR-0121    |
| assay      | PostToolUse。spec.md/eval-criteria.md の文書品質検証                                               | DR-0121    |
| shields    | コマンドガード、ファイル ACL、secrets チェック                                                     | 配線せず   |
| reviews    | skill 実行前の静的解析コンテキスト注入                                                             | 配線せず   |

## 設計原則

### 1. デフォルトでノンブロッキング

フックはデフォルトで操作をブロックしない。ブロックは明示設定が必要。

### 2. state はセッション単位

配線はグローバルの `settings.json` にあるので、このマシンで走るすべての Claude Code プロセスが同じ hook を実行する。throttle や 1 セッション 1 回のマーカーには、セッション id ごとの記録が要る。共有ファイルが 1 つだと互いに上書きし合い、2 つのプロセスが順に発火する。`recall_index` の「1 窓に最大 1 回」のように、意図してマシン全体で 1 つにする state はその旨を書いた場所で例外だと述べる。

### 3. fail-mode 規約

このモードが名指すのは、スクリプト自身がエラーにどう反応するかであって、ツール呼び出しが生き延びるかどうかではない。呼び出しを止められるのは PreToolUse の hook だけで、止め方は決定を出力することであり、非 0 で終わることではない。hook がエラーで終わっても Claude Code は動き続ける。

fail-closed の hook が特定の失敗を 1 つだけ無視するのは格下げではない。`textlint_fix.ts` は自身の欠陥では止まるが textlint の終了コードは無視する。この hook が走る時点で編集はすでに適用されているからである。

| モード      | スクリプトの振る舞い                   | シェルでの書き方    | Python での書き方        | 使う場面          |
| ----------- | -------------------------------------- | ------------------- | ------------------------ | ----------------- |
| fail-open   | エラーを踏み越えて 0 で終わる          | `set +e`            | 例外を握って return する | 観測と通知の hook |
| fail-closed | 自身の欠陥を含め、最初のエラーで止まる | `set -euo pipefail` | 例外を伝播させる         | 安全と規約の hook |

### 4. 組み合わせられる

小さなフックを組み合わせて複雑な振る舞いを実現する。

### 5. settings.json の管轄外

外部アプリが `settings.json` へ書き込んだ hook 配線は、そのアプリをアンインストールしても残る。残った配線は非ブロッキングのまま毎イベント失敗し続ける。会話と `git diff` のどちらにも出ないので、気付く経路は transcript の `hook_non_blocking_error` と `stop_hook_summary` の `hookErrors` に限られる。

hook が毎回出す 1 行を `settings.json` 側の設定で消す口はない。`suppressOutput` は hook が返す JSON のキーで、stdout 専用。stderr へ出す行は、出力さえあれば `hook_success` として記録され描画される。

`autoMemoryEnabled: false` で auto-memory の読み書きを止められる。バイナリ内の `/pause-memory` は `isEnabled: () => false` のまま埋め込まれており、有効化しても動作しない。

## 関連

- [Claude Code Hooks Docs](https://docs.anthropic.com/en/docs/claude-code/hooks)
