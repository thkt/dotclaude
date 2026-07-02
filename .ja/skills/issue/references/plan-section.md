# Plan 節フォーマット

issue 本文の `## Plan` 節の書式と、build workflow (think 経由) がそこから構造化 plan を抽出する contract を定義する。issue SKILL.md と build.js の共有 source であり、書式の変更はこのファイルを更新してから両者に反映する。Plan 節は人間が読める markdown のみで構成し、機械用の隠し block は置かない。

## Plan 節の構成

| 要素               | 位置                    | 内容                                                                     |
| ------------------ | ----------------------- | ------------------------------------------------------------------------ |
| 導入 prose         | `## Plan` 直下          | outcome の 1 行 (done 状態、実装非依存、観測可能) + test_command の 1 行 |
| 前提               | `### 前提`              | unit 群が依存する既存コードの箇条書き                                    |
| unit 小節          | `### U-NNN` (連番)      | goal 言い切り + files + contract prose + 受け入れテスト + 依存           |
| Backlog candidates | `## Backlog candidates` | 本 issue のスコープ外に切り出す候補の箇条書き。無ければ「なし」          |

骨格の例。

```markdown
## Plan

Outcome: <done 状態の 1 行>
test_command: <テスト実行コマンド 1 行。例 cargo test / node --test tests/>

### 前提

- `src/storage/mod.rs` の `open_db`
- `src/config.rs`

### U-001 <unit タイトル>

<goal の言い切り 1 行。この unit が届ける振る舞い>

- files: `src/foo.rs`, `tests/foo.test.rs`
- contract: <公開インターフェースの prose。signature / CLI flag / schema の素描>
- depends_on: なし

受け入れテスト。

- T-001 <検証する仕様の言明。テスト名になる>
  - given: <前提状態>
  - when: <操作>
  - then: <期待結果>

## Backlog candidates

- <スコープ外に切り出す候補>
```

### id 記法

| id    | 対象               | 規則                                      |
| ----- | ------------------ | ----------------------------------------- |
| U-NNN | unit (`### U-NNN`) | 001 からの連番。plan 内で一意             |
| T-NNN | 受け入れテスト     | plan 全体で一意 (unit ごとに振り直さない) |

### 前提 (preconditions) の authoring 規則

`### 前提` には次の 5 規則を適用する。

1. 既存の依存先のみを載せる。unit が作る新規作成ファイルは前提に載せない
2. anchor は stable anchor (exported / 公開シンボル名) に限る。private な実装詳細やコメント文字列を anchor にしない
3. 安定したシンボルが無ければ path のみの行にする
4. 各行は path 単独、または path + stable anchor の 2 形式のどちらか
5. issue 投稿前に実在を検証する。path は `test -f <path>`、anchor は `ugrep -F '<pattern>' <path>` で確認し、失敗した行は修正するか落とす

## 抽出 contract

build workflow は Plan 節を読み、think workflow の PLAN_SCHEMA と同型の構造化 plan を組み立てる。Plan 節の各要素は次のフィールドに対応する。

| Plan 節の要素                    | フィールド                          | 型              |
| -------------------------------- | ----------------------------------- | --------------- |
| planning dir (workflow が決める) | dir                                 | string          |
| 導入 prose の outcome 行         | outcome                             | string          |
| issue 本文の決定事項             | decisions                           | string[]        |
| issue 本文の仮マーク・仮定       | assumptions                         | string[]        |
| issue 本文の non-goal            | non_goals                           | string[]        |
| issue 本文の制約                 | constraints                         | string[]        |
| `### U-NNN` 小節の列             | units                               | object[]        |
| U-NNN の id                      | units[].id                          | string          |
| goal 言い切り行                  | units[].goal                        | string          |
| files 箇条書き                   | units[].files                       | string[]        |
| contract prose                   | units[].contract                    | string          |
| 受け入れテストの列               | units[].tests                       | object[]        |
| T-NNN の id                      | units[].tests[].id                  | string          |
| テストの言明                     | units[].tests[].name                | string          |
| given / when / then の各行       | units[].tests[].given / when / then | string          |
| depends_on 行 (「なし」は空配列) | units[].depends_on                  | string[]        |
| 導入 prose の test_command 行    | test_command                        | string          |
| `### 前提` の各行                | preconditions                       | object[]        |
| 前提行の path                    | preconditions[].path                | string          |
| 前提行の stable anchor           | preconditions[].pattern             | string (省略可) |
| `## Backlog candidates` の各行   | backlog_candidates                  | string[]        |

preconditions と backlog_candidates は PLAN_SCHEMA (think.js) の必須フィールドではなく、Plan 節から build workflow が拾う追加情報。抽出は markdown の見出しと箇条書きの構造のみに依存し、特別なマーカーやコメント記法を要求しない。
