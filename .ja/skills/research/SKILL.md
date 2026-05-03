---
name: research
description: プロジェクトの調査と技術的な探索を実装なしで行う。設計計画や SOW/Spec 生成には使わない (代わりに /think を使う)。
when_to_use: 調査して, 調べて, リサーチ, investigate, 分析して, issueやろう, issue見て, 横並びチェック, 類似パターン検出, refactor 横展開
allowed-tools: Bash(tree:*) Bash(git log:*) Bash(git diff:*) Bash(wc:*) Bash(yomu:*) Read LS Task AskUserQuestion Bash(ugrep:*) Bash(bfs:*)
model: opus
context: fork
argument-hint: "[research subject or question]"
---

# /research

ソースに基づく発見事項とともにコードベースを調査する。実装は伴わない。

## 入力

- 調査対象: `$ARGUMENTS` (必須、自由記述のトピックまたは質問)
- `$ARGUMENTS` が空のときは AskUserQuestion で問い合わせる。

## 実行

| Phase | アクション                        | 詳細                                                                                                  |
| ----- | --------------------------------- | ----------------------------------------------------------------------------------------------------- |
| 0     | 過去調査スキャン                  | `.claude/workspace/research/` で同題ファイルを bfs。発見事項 / 制約を引き継ぐ                        |
| 1     | 意図 + ドメインの明確化           | AskUserQuestion で問う (`$ARGUMENTS` から自明なら省略)                                                |
| 2     | ドメインスコープ並列調査          | yomu search + Task(Explore) + 対象を絞った Read/ugrep。ドメインでスコープを限定                        |
| 3     | Strong Inference (Bug の場合のみ) | 仮説 3 つ以上、識別可能なテスト、消去                                                                 |
| 4     | 統合                              | 過去ベースラインの統合、発見事項に対するソースパス。Phase 3 を省略した場合のみ disconfirmation を実施 |

### Phase 0: 過去調査スキャン

`$ARGUMENTS` から subject slug (小文字、ハイフン区切り) を導出。`bfs '.claude/workspace/research/*<slug>*.md'` を実行。一致するファイルごとに以下を抽出する。

| 抽出元               | 引き継ぎ先                                  |
| -------------------- | ------------------------------------------- |
| Key Findings 表      | Phase 4 のベースライン (再検証または上書き) |
| Constraints 表       | Phase 2 の入力 (再発見しない)               |
| Disconfirmation 結果 | Phase 4 の参照                              |

一致なしの場合はスキップし、「No prior research found for `<slug>`」と注記する。

### Phase 1: 意図 + ドメインの明確化

`$ARGUMENTS` から両方が明確なら省略。そうでなければ AskUserQuestion で問う。

| 質問       | 選択肢                                               |
| ---------- | ---------------------------------------------------- |
| 調査の意図 | Feature planning / Bug investigation / Understanding |
| ドメイン   | Data model / API / Infrastructure / General          |

ドメインは Phase 2 のスコープを決める。Domain=General はスコープを適用しない。

### Phase 2: ドメインスコープ並列調査

並列で実行する。

| ツール                                             | 目的                                   | ドメインスコープ                                               |
| -------------------------------------------------- | -------------------------------------- | -------------------------------------------------------------- |
| `yomu search "<subject + domain keywords>"` (Bash) | 概念のセマンティック検索               | ドメインに沿った語を追加 (例: API → "endpoint route handler") |
| `Task(subagent_type: Explore)`                     | ファイル / シンボル / 参照の発見       | プロンプトでドメインの glob ルートを渡す                       |
| Read / ugrep / bfs                                 | 特定済みファイルへの的を絞った読み込み | ドメインの glob ルートを起点に使う                             |

ドメインの glob ルート:

| ドメイン       | 推奨ルート                                                      |
| -------------- | --------------------------------------------------------------- |
| Data model     | `schema/`, `models/`, `db/`, `drizzle/`, `prisma/`, `*.sql`     |
| API            | `routes/`, `handlers/`, `controllers/`, `api/`, `server/`       |
| Infrastructure | `terraform/`, `infra/`, `ci/`, `.github/`, `deploy/`, `docker/` |
| General        | (スコープなし。Explore に発見させる)                            |

Feature planning が意図のときは追加で `Task(subagent_type: explorer-feature)` を起動し、対象の機能領域について実行経路を追跡しアーキテクチャをマッピングする。

蓄積される発見事項にはソースを直接記載する。事実は file:line、推論は "inferred from X"、未検証は "unknown, requires X" を使う。

### Phase 3: Strong Inference (Bug investigation のみ)

`rules/core/OPERATION.md` の Debug Investigation Protocol を適用する。

| Step | アクション                                                              |
| ---- | ----------------------------------------------------------------------- |
| 1    | 観察                                                                    |
| 2    | パターン分析 (動作している類似コードを見つけ、壊れたものとの差分を取る) |
| 3    | 仮説を 3 つ以上生成                                                     |
| 4    | 仮説ごとに識別可能なテスト                                              |
| 5    | 消去、その後に結論                                                      |

意図が Feature planning または Understanding のときは省略。

### Phase 4: 統合

| Step                 | アクション                                                                                                                                              |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 過去ベースライン統合 | Phase 0 で過去調査が見つかれば、引き継いだ発見事項 / 制約を Key Findings に統合し、再検証済み / 上書き済みを示す                                        |
| ソースパス           | 各発見事項にソースを記す。事実は file:line / コマンド出力、推論は "inferred from X (source)"、不足は "unknown, requires X"                              |
| Disconfirmation      | Phase 3 を省略したときは、主要な仮説に反する根拠を 1 つ探す。found / not found を記録。Phase 3 を実施したときは「Covered by Phase 3 elimination」と書く |
| カバレッジチェック   | Phase 1 の質問がすべて回答されているか、または "unknown, requires X" として調査方法とともに記録されているか                                             |

## エラー処理

| エラー                           | アクション                                         |
| -------------------------------- | -------------------------------------------------- |
| Explore が空を返す               | より広いキーワードで再実行、発見事項に注記         |
| yomu search が空を返す           | `yomu rebuild` の実行を提案、ugrep にフォールバック |
| Phase 1 後でも意図が不明瞭       | 停止し、曖昧な点を名指ししてユーザーに問う         |
| ドメインの glob ルートが全て不在 | Domain=General スコープにフォールバック            |

## 出力

Session ID: ${CLAUDE_SESSION_ID}

ファイル: `.claude/workspace/research/YYYY-MM-DD-<slug>.md`

テンプレート: ${CLAUDE_SKILL_DIR}/templates/research.md

## 検証

| チェック                                                                   | 必須 |
| -------------------------------------------------------------------------- | ---- |
| `Prior research` フィールドが埋まっている (slug または `none found`)?      | Yes  |
| すべての発見事項に明示的なソースまたは "unknown, requires X" 注記があるか? | Yes  |
| Disconfirmation が記録されている (Phase 3 を省略した場合)?                 | Yes  |
| 出力が `workspace/research/` に保存された?                                 | Yes  |
| テンプレートの Next Steps セクションが含まれている?                        | Yes  |
