---
name: adr
description: MADR v4 形式で Architecture Decision Record (ADR) を自動採番付きで作成する。
when_to_use: ADR作成, 技術決定, アーキテクチャ決定, decision record
allowed-tools: Read Write Edit Grep Glob LS Bash(mkdir:*) Bash($HOME/.claude/skills/adr/scripts/*) AskUserQuestion
model: opus
argument-hint: "[decision title]"
---

# /adr - Architecture Decision Record Creator

## Input

- 決定タイトル: `$ARGUMENTS` (例: "Adopt X for Y" のような具体的なアクション)
- `$ARGUMENTS` が空 → AskUserQuestion で選択
- 保存先: `<git-root>/docs/decisions/` (MADR v4 デフォルト、固定)
- 上書き: 標準外の場所に書く場合は `ADR_DIR` 環境変数を設定

入力全体を取得するには `$ARGUMENTS` を使う。`$N` は 0-indexed 分割 (`$0` は先頭ワード、`$1` は 2 番目のワード) なので、複数語タイトル全体には `$1` は使えない。

### Title Prompt

| 質問       | 選択肢                         |
| ---------- | ------------------------------ |
| 決定タイプ | New decision / Update existing |

"Update existing" を選んだ場合 → `<git-root>/docs/decisions/` の最近の ADR を AskUserQuestion で選択肢として提示。

## 6-Phase Process

| Phase         | 内容                                                                                                                               |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| 1. Pre-Check  | ${CLAUDE_SKILL_DIR}/scripts/pre-check.sh "$TITLE" を実行。JSON から `number`, `filename`, `slug`, `adr_dir`, `similar_adrs` を取得 |
| 2. Template   | ${CLAUDE_SKILL_DIR}/scripts/select-adr-template.sh "$TITLE" を実行。stdout がテンプレート名を返す                                  |
| 3. References | プロジェクトドキュメント、issue、外部リソースを収集                                                                                |
| 4. Validate   | 書き込み後 ${CLAUDE_SKILL_DIR}/scripts/validate-adr.sh "$ADR_FILE" を実行。exit 0 + 空の `errors[]` で合格。`warnings[]` は参考    |
| 5. Index      | ${CLAUDE_SKILL_DIR}/scripts/update-index.sh を実行し、index README を再生成                                                        |
| 6. Recovery   | ディレクトリ欠損、重複、セクション欠落への対応                                                                                     |

## Directory Resolution

| Step | 入力                            | 振る舞い                                                                        |
| ---- | ------------------------------- | ------------------------------------------------------------------------------- |
| 1    | `$ADR_DIR` 環境変数             | 設定されていればそのまま使う                                                    |
| 2    | `git rev-parse --show-toplevel` | `<git-root>/docs/decisions/` に解決                                             |
| 3    | git リポジトリ外                | エラーで終了。ADR にはバージョン管理されたプロジェクトルートが必要              |
| 4    | Skill 自身の保護                | ターゲットに `SKILL.md` を含む場合エラー (skill ディレクトリへの書き込みを防ぐ) |

## Template Selection

${CLAUDE_SKILL_DIR}/scripts/select-adr-template.sh "$TITLE" は推奨ヒントであり権限ではない。決定の意図でテンプレートを選び、スクリプトは出発点として使う。

| Template             | ユースケース                   | 必須 MADR v4 セクション                                                                                                  |
| -------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| technology-selection | ライブラリ、フレームワーク選定 | Title, Context and Problem Statement, Considered Options (2+), Decision Outcome                                          |
| architecture-pattern | 構造、設計方針                 | Title, Context and Problem Statement, Considered Options (2+), Decision Outcome                                          |
| process-change       | ワークフロー、ルール変更       | Title, Context and Problem Statement, Considered Options (2+), Decision Outcome                                          |
| deprecation          | 技術の廃止                     | Title, Context and Problem Statement, Considered Options (2+), Decision Outcome, More Information (deprecation-specific) |

### Keyword Triggers

複数マッチ時の優先度: deprecation > process-change > architecture-pattern > technology-selection (デフォルト)。

| Template             | 英語キーワード                                                                                  | 日本語キーワード                           |
| -------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------ |
| deprecation          | deprecate, remove, retire, sunset, phase out                                                    | 廃止, 非推奨, 削除, 撤廃                   |
| process-change       | process, workflow, procedure, standard, policy, rule, merge, branch, rebase, squash, review, ci | プロセス, ワークフロー, 規約, 規則, 手順   |
| architecture-pattern | pattern, architecture, design, structure, template, gateway, layer, monorepo, boundary          | パターン, アーキテクチャ, 設計, 構造, 統一 |
| technology-selection | adopt, choose, use, select (他に該当しない場合のデフォルト)                                     | (default)                                  |

### Override Rule

スクリプト出力が決定の意図と一致しない場合は上書きする。ADR の Context に理由を記載する。選んだテンプレートが必須セクションを決める。

| タイトル例                                    | スクリプト返却値     | 上書き先             |
| --------------------------------------------- | -------------------- | -------------------- |
| Migrate from squash-merge to rebase-merge     | technology-selection | process-change       |
| Replace REST gateway with tRPC monorepo layer | technology-selection | architecture-pattern |

## Directory Structure

```text
<git-root>/
└── docs/
    └── decisions/
        ├── README.md   # 自動生成インデックス
        ├── 0001-*.md   # 連番 (MADR nnnn-title)
        └── 0002-*.md   # (次)
```

## Rules

| ルール       | 詳細                                                              |
| ------------ | ----------------------------------------------------------------- |
| Immutability | 受理後の決定内容は不変。Supersede Procedure を参照                |
| Brevity      | テンプレート別の行数予算。Line Budget を参照                      |
| Frontmatter  | YAML frontmatter は任意。Frontmatter Conventions を参照           |
| Confirmation | Decision Outcome 配下の `### Confirmation` で遵守の確認方法を記述 |

### Frontmatter Conventions (MADR v4)

```yaml
---
status: "proposed | rejected | accepted | deprecated | superseded by ADR-NNNN"
date: 2026-04-25
decision-makers: list of names or roles
consulted: subject-matter experts (two-way)
informed: stakeholders kept up-to-date (one-way)
---
```

| フィールド      | 必須 | 備考                                    |
| --------------- | ---- | --------------------------------------- |
| status          | 任意 | YAML quote 必須。識別子のみ、リンク不可 |
| date            | 任意 | 作成日 YYYY-MM-DD。supersede 時のみ更新 |
| decision-makers | 任意 | v4 で `deciders` から改名               |

### Supersede Procedure

新しい ADR が既存を置き換える場合:

| Step | アクション                                                                   |
| ---- | ---------------------------------------------------------------------------- |
| 1    | 通常の 6-Phase Process で新規 ADR を作成                                     |
| 2    | 新規 ADR の `More Information` で先行 ADR を引用 (例: `Supersedes ADR-0042`) |
| 3    | 旧 ADR の `status:` を `superseded by ADR-NNNN` に変更                       |
| 4    | 旧 ADR の `date:` を当日に更新                                               |
| 5    | update-index.sh を実行してインデックスを更新                                 |

旧 ADR で変わるのは `status` と `date` のみ。決定内容はそのまま保持する。

### Line Budget

| Templates                                   | 合計予算 | セクション別                                             |
| ------------------------------------------- | -------- | -------------------------------------------------------- |
| technology-selection / architecture-pattern | ~80 行   | Context 3 行, Options 各 3-5 行, Consequences 2-3 bullet |
| process-change / deprecation                | ~100 行  | 同上のセクション別ガイダンス                             |

## Output

- `<git-root>/docs/decisions/XXXX-slug.md` (ADR ファイル)
- `<git-root>/docs/decisions/README.md` (自動生成インデックス)

## References

| トピック  | リソース                                      |
| --------- | --------------------------------------------- |
| MADR      | ${CLAUDE_SKILL_DIR}/references/madr-format.md |
| Fowler    | ${CLAUDE_SKILL_DIR}/references/fowler-adr.md  |
| Templates | ${CLAUDE_SKILL_DIR}/templates/                |
| Scripts   | ${CLAUDE_SKILL_DIR}/scripts/                  |
