---
name: research
description: プロジェクトと技術的な質問を調査する。findings は結論ではなく、明示的なソース付きで challenge されるべき position。Phase 5 の advisor パスが、確定前の synthesis に反論する。設計計画や SOW/Spec 生成には使わない (代わりに /think を使う)。
when_to_use: 調査して, 調べて, リサーチ, investigate, 分析して, issueやろう, issue見て, 横並びチェック, 類似パターン検出, refactor 横展開
allowed-tools: Bash(tree:*) Bash(git log:*) Bash(git diff:*) Bash(git show:*) Bash(wc:*) Bash(scout:*) Read LS Task AskUserQuestion Bash(ugrep:*) Bash(bfs:*)
model: opus
context: fork
argument-hint: "[research subject or question]"
---

# /research

ソースに基づく発見事項とともにコードベースを調査する。実装は伴わない。findings は challenge されるべき position。Phase 5 の advisor パスが、確定前の synthesis に反論する。

## 入力

- 調査対象: `$ARGUMENTS` (必須、自由記述のトピックまたは質問)
- `$ARGUMENTS` が空のときは AskUserQuestion で問い合わせる。

## 実行

| Phase | アクション                        | 詳細                                                                                                                                                                                                                              |
| ----- | --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0     | Outcome Anchor                    | `.claude/OUTCOME.md` を読む。不在なら /outcome で stub を生成。調査スコープが outcome 状態に整合するか確認                                                                                                                        |
| 1     | 過去調査スキャン                  | `.claude/workspace/research/` で同題ファイルを bfs。発見事項 / 制約を引き継ぐ                                                                                                                                                     |
| 2     | 意図 + ドメインの明確化           | AskUserQuestion で問う (`$ARGUMENTS` から自明なら省略)                                                                                                                                                                            |
| 3     | ドメインスコープ並列調査          | Task(Explore) + 対象を絞った Read/ugrep/bfs。ドメインでスコープを限定。コマンドと raw 出力を scratch に記録。PR スコープを駆動するか repo を跨ぐ場合は cross-method で検証。末尾で load-bearing な外部仕様 claim の一次ソース検証 |
| 4     | Strong Inference (Bug の場合のみ) | 仮説 3 つ以上、識別可能なテスト、消去。root cause 確定後に same-origin artifact sweep                                                                                                                                             |
| 5     | Advisor 事前統合チェック          | パラメータなしで `advisor()` を起動。Phase 5 セクションの条件で省略                                                                                                                                                               |
| 6     | 統合                              | 過去ベースラインの統合、発見事項に対するソースパス。Phase 4 を省略した場合のみ disconfirmation を実施                                                                                                                             |

### Phase 0: Outcome Anchor

`.claude/OUTCOME.md` を読む。不在なら /outcome で stub を生成する。調査スコープが outcome 状態に整合するか確認する。調査が Non-goals に踏み込む場合は、進める前に明示的にユーザーに確認する。

### Phase 1: 過去調査スキャン

`$ARGUMENTS` から subject slug (小文字、ハイフン区切り) を導出。`bfs .claude/workspace/research -name '*<slug>*.md'` を実行。一致なしの場合はスキップし、「No prior research found for `<slug>`」と注記する。一致するファイルごとに、以下の表の引き継ぎマッピングを適用する。

| 抽出元               | 引き継ぎ先                                  |
| -------------------- | ------------------------------------------- |
| Key Findings 表      | Phase 6 のベースライン (再検証または上書き) |
| Constraints 表       | Phase 3 の入力 (再発見しない)               |
| Disconfirmation 結果 | Phase 6 の参照                              |

### Phase 2: 意図 + ドメインの明確化

`$ARGUMENTS` から両方が明確なら省略。そうでなければ AskUserQuestion で問う。ドメインは Phase 3 のスコープを決める。Domain=General はスコープを適用しない。

| 質問       | 選択肢                                               |
| ---------- | ---------------------------------------------------- |
| 調査の意図 | Feature planning / Bug investigation / Understanding |
| ドメイン   | Data model / API / Infrastructure / General          |

### Phase 3: ドメインスコープ並列調査

並列で実行する。Feature planning が意図のときは追加で `Task(subagent_type: explorer-feature)` を起動し、対象の機能領域について実行経路を追跡しアーキテクチャをマッピングする。蓄積される発見事項にはソースを直接記載する。事実は file:line、推論は "inferred from X"、未検証は "unknown, requires X" を使う。

| ツール                         | 目的                                   | ドメインスコープ                                              |
| ------------------------------ | -------------------------------------- | ------------------------------------------------------------- |
| `Task(subagent_type: Explore)` | ファイル / シンボル / 参照の発見       | プロンプトでドメインの glob ルートを渡す                      |
| `ugrep` / `bfs` (Bash)         | パターン / 識別子検索                  | ドメインに沿った語を追加 (例: API → "endpoint route handler") |
| Read                           | 特定済みファイルへの的を絞った読み込み | ドメインの glob ルートを起点に使う                            |

ドメインの glob ルートは以下のとおり。

| ドメイン       | 推奨ルート                                                      |
| -------------- | --------------------------------------------------------------- |
| Data model     | `schema/`, `models/`, `db/`, `drizzle/`, `prisma/`, `*.sql`     |
| API            | `routes/`, `handlers/`, `controllers/`, `api/`, `server/`       |
| Infrastructure | `terraform/`, `infra/`, `ci/`, `.github/`, `deploy/`, `docker/` |
| General        | (スコープなし。Explore に発見させる)                            |

### 監査証跡の記録

Phase 3 の検索を実行する間、各コマンドと生の出力をこの会話の scratch バッファに verbatim で追記する。Phase 6 の Disconfirmation はその scratch から直接引用する。再構築しない。実行されたコマンドと実際の出力こそが監査証跡である。

### Cross-method 検証

「該当の caller が無い」「X が唯一の Y」「X が Y の網羅的な一覧」「[repo set] で未使用」のような発見事項が、後段の PR スコープを駆動する、または repo を跨ぐとき、ugrep / bfs、Task(Explore)、対象を絞った Read のうち少なくとも 2 つで検証する。結果が食い違うときは差異をフラグし、ツールエラーを特定してから記録する。単一ツールでの 0 件結果は疑わしい状態であって、決定的ではない。

### 一次ソース検証 (Phase 3 の締め)

Phase 3 の末尾で、Source が「このセッションで実行していない外部システムの振る舞い」(hook の発火タイミング、action/parser の要求 schema、ライブラリ API の挙動、引用文献の主張) を参照し、かつ load-bearing (結論、Next Action、Disconfirmation のいずれかがその claim の正しさに依存) な発見事項を抽出する。トリガーは構造的に適用する。両条件に一致する全 finding が対象で、self-judge による除外は認めない。

抽出した claim を一括で一次ソースと突合する。web docs は `scout fetch <公式 docs URL>`、GitHub 上のソースは `scout repo-read` / `scout repo-overview` を使う。verbatim の引用を監査証跡 scratch に記録する。ライブラリ API 挙動の verify は `~/.claude/rules/development/SOURCING.md` (framework-behavior authority) を、/code の write-time と同じ知識で verify-time に適用したものにあたる。

一次ソースが辿れない場合 (paywall、docs 不在、fetch 失敗) は finding を残しつつ `unverified external claim` とマークする。unverified な claim を Disconfirmation の根拠や Next Action の前提に使ってはならない。

### Phase 4: Strong Inference (Bug investigation のみ)

`~/.claude/rules/core/OPERATION.md` の Debug Investigation Protocol を適用する。

| Step | アクション                                                              |
| ---- | ----------------------------------------------------------------------- |
| 1    | 観察                                                                    |
| 2    | パターン分析 (動作している類似コードを見つけ、壊れたものとの差分を取る) |
| 3    | 仮説を 3 つ以上生成                                                     |
| 4    | 仮説ごとに識別可能なテスト                                              |
| 5    | 消去、その後に結論                                                      |
| 6    | Same-origin artifact sweep (下記)                                       |

意図が Feature planning または Understanding のときは省略。

### Same-origin artifact sweep (root cause 確定後)

root cause がちょうど 1 ファイルだけを壊すことは稀である。同じ origin を共有する artifact 群を sweep して兄弟欠陥を探す。兄弟欠陥は root cause と別種でありうる (root cause が placeholder 混入でも、兄弟は consumer の schema 違反かもしれない)。

| Step | アクション                                                                                                                                                                                              |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | root cause ファイルの導入コミットを特定し (`git log --follow --diff-filter=A`)、そのコミットの全ファイルを列挙する (`git show --stat`)                                                                  |
| 2    | コミットメッセージやファイルヘッダに生成元表記 ("auto-generated from X"、template/deploy 注記) があれば、X 由来の全ファイルも sweep 対象に加える                                                        |
| 3    | 各兄弟について consumer (それを読む action / parser / loader) を特定し、consumer の要求仕様をその場で fetch して (一次ソース検証と同じ scout 手順) 兄弟を突合する                                       |
| 4    | 兄弟同士が値を参照し合う場合 (config の keys / block-list とフォームの options 等)、値集合同士を diff し、自滅的な整合 (block-list が選択可能な全値を含む、どの兄弟も定義しない値への参照) をフラグする |
| 5    | 兄弟ごとに pass / 同種欠陥 / 別種欠陥を根拠付きで記録する                                                                                                                                               |

### Phase 5: Advisor 事前統合チェック

パラメータなしで `advisor()` を起動する。advisor は会話履歴全体 (Phase 2 の回答、Phase 3 の発見事項、監査証跡 scratch を含む) を参照する。

以下の条件がすべて成立するとき省略する。

- Phase 1 で過去調査がヒットし、現在の実行は引き継ぎのみ
- Intent = Understanding かつ Domain = General
- repo を跨ぐ主張や PR スコープを駆動する主張がない

advisor が見落とし領域や弱い推論を指摘したら、Phase 3 に戻ってスコープを絞り直す。省略した場合はその理由を出力に記録する。

### Phase 6: 統合

| Step                 | アクション                                                                                                                                                                                                                                   |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 過去ベースライン統合 | Phase 1 で過去調査が見つかれば、引き継いだ発見事項 / 制約を Key Findings に統合し、再検証済み / 上書き済みを示す                                                                                                                             |
| ソースパス           | 各発見事項にソースを記す。事実は file:line / コマンド出力、推論は "inferred from X (source)"、不足は "unknown, requires X"                                                                                                                   |
| Disconfirmation      | Phase 4 を省略したときは、Phase 3 の scratch から実行コマンドと生の出力を verbatim で引用する (再構築禁止)。0 件の結果は「不在」と断じる前に「ツール誤用の可能性」とみなす。Phase 4 を実施したときは「Covered by Phase 4 elimination」と書く |
| カバレッジチェック   | Phase 2 の質問がすべて回答されているか、または "unknown, requires X" として調査方法とともに記録されているか                                                                                                                                  |

## エラー処理

| エラー                                 | アクション                                                                                                   |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Explore が空を返す                     | より広いキーワードで再実行、発見事項に注記                                                                   |
| Phase 2 後でも意図が不明瞭             | 停止し、曖昧な点を名指ししてユーザーに問う                                                                   |
| ドメインの glob ルートが全て不在       | Domain=General スコープにフォールバック                                                                      |
| scout が使えない (不在 / network 失敗) | 影響を受けた finding を Coverage Notes に `unverified (tool unavailable)` と記録。サイレントな検証 skip 禁止 |

## 出力

| 項目         | 値                                                |
| ------------ | ------------------------------------------------- |
| Session ID   | ${CLAUDE_SESSION_ID}                              |
| ファイル     | `.claude/workspace/research/YYYY-MM-DD-<slug>.md` |
| テンプレート | ${CLAUDE_SKILL_DIR}/templates/research.md         |

## 検証

| チェック                                                                            | 必須         |
| ----------------------------------------------------------------------------------- | ------------ |
| OUTCOME.md が存在 (Phase 0)?                                                        | Yes          |
| `Prior research` フィールドが埋まっている (slug または `none found`)?               | Yes          |
| すべての発見事項に明示的なソースまたは "unknown, requires X" 注記があるか?          | Yes          |
| Phase 3 の監査証跡 scratch を取得した (コマンドと生出力を verbatim で)?             | Yes          |
| 「該当 caller なし」「網羅的列挙」のような主張に対し cross-method 検証を実施したか? | Yes (or N/A) |
| load-bearing な外部仕様 claim を一次ソースと突合したか (または unverified マーク)?  | Yes (or N/A) |
| Same-origin artifact sweep を実施したか (Bug intent で root cause 確定時)?          | Yes (or N/A) |
| Phase 5 の advisor を起動したか、または省略理由を記録したか?                        | Yes          |
| Disconfirmation が記録されている (Phase 4 を省略した場合)?                          | Yes          |
| 出力が `workspace/research/` に保存された?                                          | Yes          |
| テンプレートの Next Steps セクションが含まれている?                                 | Yes          |
