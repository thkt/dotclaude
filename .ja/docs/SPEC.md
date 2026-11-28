# SPEC

📌 [English version](../../docs/SPEC.md)

本書は harness の各構成要素の実行契約、つまり入力・出力・停止条件・失敗時の挙動を 1 枚で引ける形に集めたものである。設計意図は繰り返さない。実登録値の正は `settings.json` である。本書の配線表はそこから写したものだが、1 スクリプトを `Write` と `Edit` に分けて登録している箇所は 1 行にまとめている。

## 参照先の切り分け

知りたいことによって読む文書が変わる。本書は「何が起きるか」を扱い、他の文書は「なぜそうしたか」を扱う。

| 知りたいこと                       | 参照先                                                     |
| ---------------------------------- | ---------------------------------------------------------- |
| 契約 (入力・出力・停止・失敗方針) | 本書                                                       |
| レイヤー構成の設計意図             | [DESIGN.md](./DESIGN.md)                                   |
| hook の設計意図と命名              | [HOOKS.md](./HOOKS.md)                                     |
| Skill と Agent の使い分け          | [SKILLS_AGENTS.md](./SKILLS_AGENTS.md)                     |
| 外部 CLI の役割                    | [CLI_TOOLS.md](./CLI_TOOLS.md)                             |
| 用語の定義                         | [GLOSSARY.md](./GLOSSARY.md)                               |

## システム境界

このリポジトリが持つのはスクリプトと Markdown だけである。実行時に呼ぶバイナリの多くはリポジトリの外にあり、未導入なら該当 hook は何もせず終了する。

| 要素                                        | 実体                                    | 供給元                          |
| ------------------------------------------- | --------------------------------------- | ------------------------------- |
| hook スクリプト                             | `hooks/**/*.ts`, `hooks/**/*.sh`        | 本リポジトリ                    |
| skill / agent 定義                          | `skills/`, `agents/`                    | 本リポジトリ                    |
| `scout`, `recall`, `sae`, `xr`              | Rust CLI                                | `brew install thkt/tap/{tool}`  |
| `ast-grep`                                  | Rust バイナリ                           | `brew install ast-grep`。CI の lint は devDependency を `bun install` で入れる |
| `codegraph`                                 | mise shim 経由のバイナリ                | mise                            |
| `textlint`, `oxlint`, `oxfmt`, `biome`      | devDependencies                         | `bun install`                   |
| `rumdl`                                     | Markdown の linter                      | pipx (CI は版固定)              |
| Amphetamine                                 | macOS アプリ                            | 外部アプリ                      |

## 構成要素と責務

ディレクトリが責務の単位である。実行主体の列は、そのファイルを誰が読んで動かすかを示す。

| ディレクトリ  | 責務                                       | 実行主体             |
| ------------- | ------------------------------------------ | -------------------- |
| `rules/`      | 規約と原則。読み込むファイルは `paths:` frontmatter が決める | Claude 本体          |
| `skills/`     | 手順と知識のモジュール                     | Skill tool / モデル  |
| `agents/`     | fork 実行される専門エージェント定義        | Agent tool           |
| `hooks/`      | ツール呼び出しに割り込むスクリプト         | Claude Code harness  |
| `docs/`       | 人間向けの設計文書               | 人間                 |
| `tests/`      | 規約をコードで縛る横断テスト               | `bun test`           |

## Hook 契約

### 入出力

hook は stdin から JSON payload を受け取り、stdout に JSON か additionalContext 用のテキストを書く。終了コードは全 hook が 0 固定である。0 以外は設計上の結果ではなく破損であり、`hooks/_lib/tests/_hook-harness.ts` の `checked` が例外を投げてテストを落とす。全 hook のテストがこの確認を通り、シェル hook は各自のテストが結果だけを見る。

呼び出しを止める hook は `hook_payload.deny` を通し、同じ形の封筒を出す。`permissionDecision` に入るのは `allow`, `deny`, `ask`, `defer` の 4 値だけである。それ以外を書くとスキーマ検証で落ち、ゲートは何も止めないまま無言で通る。

| 出力                | 形                                                                                    |
| ------------------- | ------------------------------------------------------------------------------------- |
| 拒否 (PreToolUse)   | `{"hookSpecificOutput":{"hookEventName","permissionDecision","permissionDecisionReason"}}` |
| 文脈注入            | `additionalContext` を含む JSON、または素のテキスト                                   |
| 何もしない          | 空出力で `exit 0`                                                                     |

### 配線

`settings.json` が登録する hook は 2 つである。Stop の `lifecycle/done_gate.ts stop` (timeout 60) と、PreToolUse の matcher `Bash` の `pre-bash/publish_gate.ts` (timeout 15) である。下表は、それ以外の各スクリプトが最後に持っていた登録の記録で、配線し直すときの出発点になる (DR-0123)。並びは当時の登録順である。同一 matcher 内は上から順に走り、`if` 条件を満たさない hook は起動しない。`if` 条件を持つ 4 スクリプトは `Write` 用と `Edit` 用に 2 回ずつ登録され、表ではその対を 1 行に畳んでいる。

| イベント          | matcher            | 実体                                            | if 条件            | timeout |
| ----------------- | ------------------ | ----------------------------------------------- | ------------------ | ------- |
| PreToolUse        | `Bash`             | `pre-bash/package_manager_rewrite.ts`           | なし               | 15      |
| PreToolUse        | `Bash`             | `security/npm_install_guard.ts`                 | なし               | 60      |
| PreToolUse        | `Bash`             | `security/rm_to_trash.ts`                       | なし               | 15      |
| PreToolUse        | `Bash`             | `security/git_sandbox_guard.ts`                 | なし               | 15      |
| PreToolUse        | `Bash`             | `pre-bash/body_proofread.ts`                    | なし               | 60      |
| PreToolUse        | `Bash`             | `pre-bash/client_identifier_gate.ts`            | なし               | 30      |
| PreToolUse        | `Write\|Edit`      | `edit/rust_pre_edit.ts`                         | `**/*.rs`          | 60      |
| PostToolUse       | `Write\|Edit`      | `edit/rust_post_edit.ts`                        | `**/*.rs`          | 30      |
| PostToolUse       | `Write\|Edit`      | `edit/textlint_fix.ts`                          | `**/*.md`          | 60      |
| PostToolUse       | `Write\|Edit`      | `edit/mirror_prose_guard.ts`                    | `**/.ja/**`        | 10      |
| PostToolUse       | `*`                | `integrations/amphetamine_agent_session.ts background` | なし        | 15      |
| UserPromptSubmit  | なし               | `integrations/amphetamine_agent_session.ts acquire` | なし           | 15      |
| UserPromptSubmit  | なし               | `codegraph prompt-hook`                         | なし               | 10      |
| Stop              | なし               | `lifecycle/failure-alert.sh stop`               | なし               | 60      |
| Stop              | なし               | `integrations/amphetamine_agent_session.ts release` | なし           | 15      |
| StopFailure       | なし               | `lifecycle/failure-alert.sh fail`               | なし               | 60      |

### 個別 hook の判定と失敗方針

fail-close は判断できない入力を通さない方針、advisory は決定を常に allow にして助言だけ返す方針、fail-open は失敗しても機能を落とさない方針である。

| hook                            | 発火                    | 判定                                                              | 失敗方針  |
| ------------------------------- | ----------------------- | ----------------------------------------------------------------- | --------- |
| `rm_to_trash.ts`                | Bash                    | `rm` / `rmdir` / `unlink` / `shred` と `find -delete` / `git clean` を deny し `mv ~/.Trash/` へ誘導 | fail-close |
| `npm_install_guard.ts`          | Bash                    | `ignore-scripts` 未設定の install を deny。ni 系の別名も同じ扱い  | fail-close |
| `git_sandbox_guard.ts`          | Bash                    | サンドボックス下で tree を書き換える git 呼び出しを deny          | fail-close |
| `package_manager_rewrite.ts`    | Bash                    | パッケージ マネージャ コマンドを ni 系へ書き換え、決定は常に allow | advisory  |
| `body_proofread.ts`             | Bash                    | gh filing と commit の本文を校正し additionalContext で返す       | advisory  |
| `client_identifier_gate.ts`     | Bash                    | 本リポジトリの commit で、外部に置いた識別子リストの語を含む staged diff を deny | fail-close |
| `rust_pre_edit.ts`              | Write / Edit (`*.rs`)   | clippy の指摘を additionalContext として注入                      | advisory  |
| `rust_post_edit.ts`             | Write / Edit (`*.rs`)   | `cargo fmt` の後に clippy を再実行し指摘を返す                    | advisory  |
| `textlint_fix.ts`               | Write / Edit (`*.md`)   | 日本語判定を通った Markdown を textlint で自動修正                | advisory  |
| `mirror_prose_guard.ts`         | Write / Edit (`.ja/**`) | 日本語を 1 文字も含まない `.ja/` ファイルを警告する。止めない     | advisory  |
| `amphetamine_agent_session.ts`  | UserPromptSubmit / PostToolUse / Stop | session_id 単位の参照カウントで Mac のスリープを抑止 | fail-open |
| `recall_index.ts`               | SessionStart            | recall の横断索引をバックグラウンドで追いつかせる。いまは SessionStart に配線していない | fail-open |
| `failure-alert.sh`              | Stop / StopFailure      | `end_turn` 以外の終了で音を鳴らす。サブエージェントは対象外       | fail-open |
| `statusline.sh`                 | `statusLine` キー       | モデル名と使用率を描画する。部分表示を許容。`hooks` マップではなく最上位の `statusLine` に登録する | fail-open |

`hooks/_lib/` の共有モジュールは、複数の hook が同じ知識を持たないための置き場である。

| モジュール         | 引き受ける知識                                                  |
| ------------------ | --------------------------------------------------------------- |
| `command_scan.ts`  | Bash 行のどこがコマンド位置かの判定。ラッパーと環境変数代入を剥がす |
| `gh_filing.ts`     | `gh issue create` / `gh pr create` の本文フラグの綴り            |
| `hook_payload.ts`  | payload の型付き読み出しと deny 封筒の生成                       |
| `japanese.ts`      | 日本語判定としきい値                                             |
| `mirror_prose.ts`  | `.ja/` 配下で日本語が消えた状態の検出                            |
| `rust_target.ts`   | cargo ワークスペース根の解決と clippy 出力の整形                 |
| `textlint.ts`      | textlint の設定解決と実行                                        |

## Skill 契約

### frontmatter

`SKILL.md` の frontmatter が起動条件と権限を決める。`allowed-tools` に無いツールは、本文が指示していても呼べない。

| キー            | 役割                                                          | 省略時                     |
| --------------- | ------------------------------------------------------------- | -------------------------- |
| `name`          | 起動名。`/name` と Skill tool の引数が一致する                 | 必須                       |
| `description`   | 起動判断の材料。モデルはこの文だけを見て呼ぶかを決める        | 必須                       |
| `allowed-tools` | 実行中に許すツールの列挙                                      | 呼び出し元の権限を継承     |
| `model`         | 実行モデルの指定                                              | セッションのモデル         |
| `argument-hint` | 引数の形をユーザーに示す文字列                                | 引数なし                   |
| `context`       | `fork` を指定すると本文脈を汚さず別文脈で走る                 | 本文脈                     |
| `agent`         | 対応する agent 名                                             | なし                       |
| `user-invocable`| `false` ならスラッシュ コマンド一覧に出さない                 | `true`                     |

### 補助資産

skill ディレクトリの下位ディレクトリは名前で役割が決まる。

| ディレクトリ  | 中身                                                  |
| ------------- | ----------------------------------------------------- |
| `scripts/`    | skill が Bash 経由で呼ぶ決定論的スクリプト            |
| `templates/`  | 生成物の骨組み。issue の本文テンプレートなど          |
| `references/` | 本文から参照する補足知識                              |
| `tests/`      | skill 本文と scripts を縛るテスト                     |

### 一覧

ユーザー起動列が「不可」の skill は、モデルが文脈から読み込む知識モジュールである。

| skill                              | model | ユーザー起動 | 成果物または副作用                                  |
| ---------------------------------- | ----- | ------------ | --------------------------------------------------- |
| `dr`                               | 継承  | 可           | `DR_HOME` があれば `$DR_HOME/<repo 名>/`、なければ `docs/decisions/` への MADR v4 ファイル追加 |
| `outcome`                          | 継承  | 可           | `.claude/OUTCOME.md` の生成と更新                   |
| `use-cli-recall`                   | 継承  | 不可         | recall の呼び出し方の知識                           |
| `use-cli-scout`                    | 継承  | 不可         | scout の呼び出し方の知識                            |

## Agent 契約

### frontmatter と出力

agent は必ず fork 文脈で走り、呼び出し元の会話履歴を持たない。`tools` に列挙したツールだけが使え、`Bash(git:*)` のような括弧付きの指定はサブコマンドまで絞る。

| キー          | 役割                                             |
| ------------- | ------------------------------------------------ |
| `name`        | Agent tool の `subagent_type` に渡す名前         |
| `description` | 起動判断の材料                                   |
| `tools`       | 許すツールの列挙                                 |
| `model`       | 実行モデル                                       |

### 一覧

| 分類    | agent           | model |
| ------- | --------------- | ----- |
| critics | `critic-design` | opus  |

## 品質ゲート

### ローカル

書き込み前の検査は `rust_pre_edit.ts` の clippy だけで、`.rs` を対象に取る。編集後は `rumdl_check.ts`、`textlint_fix.ts`、`rust_post_edit.ts` が走る。guardrails、gates、assay、formatter のバイナリは 1 つも走らない。JS と TS の lint と型検査は CI だけが回す。

### CI

`.github/workflows/test.yml` は push (main) と pull request で走る。ジョブは 1 つで、以下のステップを順に実行する。rumdl は JS 依存に無いため、版を直に固定している。

| ステップ      | コマンド                                                                                     |
| ------------- | -------------------------------------------------------------------------------------------- |
| Test classification | `bun run check:classification`。`.feedback-loop.json` の収集範囲と assurance の指定を、`bun test` が集めるテストと照合する |
| Bun tests     | `bun run test`。`package.json` の `scripts.test` が、`./tests`、`./agents`、`./hooks`、`./skills` の下のテストを 4 並列、1 件 300 秒の上限で実行 |
| Shell tests   | `find hooks sandbox -name '*.test.sh'` を 1 ファイルずつ bash で実行                          |
| oxlint        | `bunx oxlint --format=github`                                                                  |
| biome         | `bunx biome lint --reporter=github`                                                            |
| ast-grep scan | `bunx ast-grep scan . .ja`                                                                     |
| ast-grep rule tests | `bunx ast-grep test --skip-snapshot-tests`                                               |
| textlint      | `bunx textlint '.ja/**/*.md'`                                                                  |
| rumdl         | `pipx run --spec rumdl==0.2.58 rumdl check .`                                                 |

### 設定ファイル

lint の対象と閾値は設定ファイルが持つ。文書側で数値を繰り返さない。

| ファイル              | 決めること                                                              |
| --------------------- | ----------------------------------------------------------------------- |
| `.textlintrc.json`    | 日本語の文長上限、読点数の上限、である調の統一、半角と全角の間の空白    |
| `.rumdl.toml`         | Markdown 検査で無効にする規則                                           |
| `.oxlintrc.json`      | JavaScript の静的検査                                                   |
| `biome.json`          | 認知的複雑度の上限。規則はこの 1 本だけで、formatter と他の規則は止めている |
| `.feedback-loop.json` | feedback-loop の設定。`check:affected` が選ぶテストの範囲、quality と assurance の分け方、テストと読み込むファイルの対応 |
| `sgconfig.yml`        | ast-grep の規則 (`ast-grep/rules/`) と規則のテスト (`ast-grep/rule-tests/`) の置き場。規則は通す形に当たらない `.ts`、`.js`、`.sh` のコメントを報告する |

### 横断テスト

`tests/` は規約をコードで縛る。文書に書いただけでは守られなかったものが、ここに落ちている。

各テストの名前が、縛る規約を述べる。

## 配布契約

`.claude-plugin/marketplace.json` は単一プラグイン構成である。`build` を入れるとリポジトリ全体が 1 度クローンされ、skill と agent のすべてが `build:` 名前空間で読み込まれる。

| 項目           | 値                          |
| -------------- | --------------------------- |
| marketplace 名 | `thkt-development-workflows`|
| プラグイン     | `build` のみ                |
| version        | 設定しない。source の commit が版になる |
| source         | github の `thkt/dotclaude`  |

## ミラー契約

`.ja/` が正であり、英語側は同一コミットでミラーする。詳細は[MIRROR.md](../rules/conventions/MIRROR.md)にある。

| 対象                            | 扱い                                                       |
| ------------------------------- | ---------------------------------------------------------- |
| 散文を持つファイル              | 散文だけ翻訳し、識別子とスキーマは同一のまま               |
| 散文を持たないファイル          | 同一コピー                                                 |
| `output-styles/**`              | ミラーしない。実パスに日本語で 1 ファイルだけ置く          |
| テスト                          | 英語側にのみ置く                                           |

## 追加時に触る場所

新しい要素を足すときに触るファイルと、追加が効いていることを確かめるコマンドを示す。

| 追加するもの | 触るファイル                                                            | 確認                                        |
| ------------ | ----------------------------------------------------------------------- | ------------------------------------------- |
| hook         | `hooks/<event>/`, `settings.json`, `hooks/<event>/tests/`               | `bun test --timeout=300000 ./hooks` と `find hooks sandbox -name '*.test.sh'` |
| skill        | `skills/<name>/SKILL.md`, `skills/<name>/tests/`, `.ja/skills/<name>/`  | `bun test --timeout=300000 ./skills` |
| agent        | `agents/<category>/<name>.md`, `.ja/agents/<category>/`                 | `bun test --timeout=300000 ./agents` |
| 文書         | `.ja/docs/<NAME>.md` を先、`docs/<NAME>.md` を同一コミットで            | `bunx textlint '.ja/**/*.md'` と `rumdl check .` |
