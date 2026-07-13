# Plan 節フォーマット

issue 本文の `## Plan` 節の書式と、build workflow がそこから構造化 plan を抽出する contract を定義する。issue SKILL.md と build.js の共有 source であり、書式の変更はこのファイルを更新してから両者に反映する。抽出は markdown の見出しと箇条書きの構造のみに依存し、機械用の隠し block は置かない。

## 骨格

```markdown
## Plan

Outcome: <done 状態の 1 行。実装非依存、観測可能>
test_command: <テスト実行コマンド 1 行。例 cargo test / node --test tests/>

### 前提

- `src/storage/mod.rs` の `open_db`
- `src/config.rs`

### U-001 <unit タイトル>

<goal の言い切り 1 行。この unit が届ける振る舞い>

- files: `src/foo.rs`, `tests/foo.test.rs`
- contract: <引用 1 行 + やりたいこと 1 行>
- depends_on: なし

受け入れテスト。

- T-001 <検証する仕様の言明 1 行。テスト名になる>
  - given: <前提状態 1 行>
  - when: <操作 1 行>
  - then: <期待結果 1 行>

## Backlog candidates

- <スコープ外に切り出す候補。1 件 1 行>
```

U-NNN は 001 からの連番で plan 内一意。T-NNN は plan 全体で一意 (unit ごとに振り直さない)。

## 行数規則

各 field の上限は骨格に示した行数。超過は文章の追加でなく分割 (unit を割る、backlog へ切り出す) で解消する。

## contract の authoring 規則

生成でなく選択で書く。prose で振る舞いを素描したり、コード片を新造したりせず、contract は引用 + やりたいことのセットで書く。引用は検証可能で、生成した素描は検証不能なため。

1. 引用は次の優先順で選ぶ。コードベースの既存の形 (path + 公開シンボル、前提と同じ stable anchor 規則) > docs/wiki のページ > 外部ライブラリは pinned version の公式 docs の該当 API への deep link (SOURCING.md の規律)
2. やりたいこと (引用に従う点 / 変える点) を 1 行添える。引用できる出典が無い新規の形は、signature を発明せずやりたいことの 1 行に留め、形の決定は実装に委ねる。振る舞いは受け入れテストが固定する
3. 引用した path + シンボルは `### 前提` にも載せ、投稿前検証と build の Revalidate の対象にする

## 前提 (preconditions) の authoring 規則

`### 前提` には次の 5 規則を適用する。

1. 既存の依存先のみを載せる。unit が作る新規作成ファイルは前提に載せない
2. anchor は stable anchor (公開シンボル名) を 1 つだけ書き、`ugrep -F` が固定文字列としてそのまま一致するものに限る。private な実装詳細・コメント文字列・行番号・スラッシュで連結したシンボル列は anchor にしない (いずれも `ugrep -F` では一致しない)
3. 安定したシンボルが無ければ path のみの行にする
4. 各行は path 単独、または path + stable anchor の 2 形式のどちらかにする
5. path はリポジトリルート起点で書く (`workspace/` などリポジトリ接頭辞を落とした path は検証に失敗する)

## 投稿前検証

issue 投稿前に、build workflow の Revalidate と同じリポジトリルートで検証する。

1. `### 前提` の各行を検証する。path は `test -f <path>`、anchor は `ugrep -F '<pattern>' <path>` で確認し、失敗した行は修正するか落とす
2. `units[].files` のうち既存ファイルを指す行を `test -f <path>` で検証し、失敗したパスを直す
3. `files` に既存ファイルを載せる unit が 1 つでもあれば、`### 前提` 節に最低 1 行が必要。空 / 不在の節は失敗とみなし、要となる依存を anchor する前提行を 1 つ足す
4. 行数規則を超えた field を分割で直す

## 抽出フィールド

build workflow は Plan 節から PLAN_SCHEMA 同型の構造化 plan を組み立てる。対応は outcome / test_command / units[].{id, goal, files, contract, tests, depends_on} / tests[].{id, name, given, when, then} / preconditions[].{path, pattern} / backlog_candidates (depends_on の「なし」は空配列)。decisions / assumptions / non_goals / constraints は issue 本文全体から拾い、dir は workflow が決める。
