---
name: audit-adr-gaps
description: ADR の無い設計判断を発掘し、promotion 前に各候補を critic-design で challenge する。impact と reversibility でランク付けし、ADR 化候補リストを生成。各候補は登録すべき事実ではなく、ADR 化を主張する position として扱う。既存 ADR とコードの drift スキャンを担う audit-adr-drift と組む。
when_to_use: 判断未記録の発掘, undocumented decisions, ADR候補発掘, 設計判断棚卸し, decision archaeology, design rationale audit
allowed-tools: Read Write Edit LS Bash(git:*) Bash(gh:*) Bash(ugrep:*) Bash(bfs:*) Bash(wc:*) Task AskUserQuestion
model: opus
argument-hint: "[--threshold=N] [--paths=path,path]"
---

# /audit-adr-gaps - ADR gap 監査

コード内には存在するが ADR に書かれていない設計判断を発掘する。各候補は promotion 前に critic-design (Step 6.2) で challenge される。最終リストは初期スキャンが見つけたものではなく、adversarial pass を生き残ったもの。ranked された ADR 化候補リストを出力し、次の refactor が完全な判断ベースラインを持てるようにする。

## 使いどころ

- repo に暗黙の判断が積み上がっており、ADR で網羅されていない
- refactor 前に「どの判断を尊重し、どの判断を疑うか」のマップが欲しい
- 新規メンテナに「なぜコードがこの形なのか」のマップが必要

### /audit-adr-drift とのペア

`/audit-adr-gaps` と `/audit-adr-drift` は ADR を整理基準にする監査ペア。実行順序は ADR が既にあるかで決まり、固定ではない。

| repo の状態       | 先に実行                                         | 次に実行                                        |
| ----------------- | ------------------------------------------------ | ----------------------------------------------- |
| ADR がある        | `/audit-adr-drift` (ADR と code の drift を検出) | `/audit-adr-gaps` (drift で拾えない gap を発掘) |
| ADR が無い/少ない | `/audit-adr-gaps` (判断を発掘し ADR 候補化)      | `/audit-adr-drift` (ADR 追加後に維持を検証)     |

## 入力

`$ARGUMENTS` は全引数文字列。使用前に parse する:

- 空白で token に split
- `--threshold=N`: 整数、省略時または非数値時は `400` を default (`> 0` のみ受理)
- `--paths=p1,p2,...`: カンマ区切りのドキュメントパス。省略時は Step 2 の表で auto-detect
- `--no-challenge`: critic-design による challenge step をスキップ (default: challenge 実行)
- 不明なフラグは silently ignore せず、明示的にエラーで reject
- すべて optional、引数なしなら全て auto-detect + challenge 実行

## 実行

| Step | アクション                                                                                  |
| ---- | ------------------------------------------------------------------------------------------- |
| 1    | 閾値超え (default >400行) の大型ファイル検出                                                |
| 2    | 判断記述を含みやすい prose ドキュメント検出 (README, CONTRIBUTING など)                     |
| 3    | 言語に応じた reviewer を大型ファイル毎に spawn、既存 ADR と相互参照                         |
| 4    | prose ドキュメントから decision-shaped sentence を抽出、既存 ADR と相互参照                 |
| 5    | 各候補に impact (H/M/L) と reversibility (high/medium/low) を付与                           |
| 6    | 初期 ADR 化候補をランク付け、critic-design で challenge (`--no-challenge` 指定時はスキップ) |
| 7    | レポートを `docs/audit/<YYYY-MM-DD>-<HHMMSS>-adr-gaps.md` に出力                            |
| 8    | challenge 後の ADR 化候補を follow-up issue としてリスト                                    |

### Step 1: 大型ファイル検出

```bash
# Find source files exceeding the threshold
# NOTE: Do not use awk '$1 > t' here. SKILL loader expands `$1` to the second
# whitespace-token of $ARGUMENTS (0-indexed split). Use find+while instead.
bfs <repo-root> -type f \( -name '*.rs' -o -name '*.ts' -o -name '*.tsx' -o -name '*.py' -o -name '*.go' -o -name '*.swift' \) \
  -not -path '*/target/*' -not -path '*/node_modules/*' -not -path '*/.git/*' \
  -print0 \
  | while IFS= read -r -d '' file; do
      lines=$(wc -l < "$file")
      [ "$lines" -gt "$THRESHOLD" ] && printf '%s %s\n' "$lines" "$file"
    done | sort -rn
```

default 閾値は 400 行 (one-screen 上限)。

### Step 2: ドキュメント検出

トップ階層と `docs/` 配下から判断記述を含みやすいドキュメント (README, CONTRIBUTING, SECURITY, THREAT_MODEL, ARCHITECTURE, DESIGN, CLAUDE.md / AGENTS.md, Makefile / justfile, linter 設定) をスキャンする。パターンと内容の全対応表は ${CLAUDE_SKILL_DIR}/references/detection-targets.md を参照。

### Step 3: 大型ファイルからの判断発掘

800 行超のファイル (threshold の 2x) は triage sub-step を先に実施する。reviewer に「先頭 200 行をスキャンして finding density (findings/100行) を推定」と指示して spawn し、AskUserQuestion で 3 択を提示:

- 全スキャン続行
- 先頭 600 行に truncate (module preamble と主要 type をカバー)
- このファイルをスキップ (`skipped_for_size` として記録)

800 行以下のファイルは直接 full scan に進む。

各大型ファイル (full または truncated scope) について、対応する reviewer を Task で spawn する (ルーティングは `/audit-adr-drift` Step 5 と同様)。reviewer は以下に答える:

- なぜこのファイルはこの粒度の形になっているか?
- コードから読み取れない不変条件や契約を担っているか?
- rationale を既に記録した comment や module-doc があるか?
- comment が現状を記述する一方で、future contributor 向けの rule を欠いていないか? (これが `incomplete-contract` パターン)

finding 形式: `file:line` + 判断概要 + 根拠 (code comment、命名、module-doc) + `documented?` (Yes/Partial/No) + `incomplete-contract?` (Yes/No)。`incomplete-contract` フラグは、comment が「何が真か」を述べる一方「何が真であり続けるべきか」を述べていないコード (future contributor 向けの rule の欠落) に付ける。promotion は Step 6.1 で扱い、例は ${CLAUDE_SKILL_DIR}/references/decision-criteria.md にある。

finding 収集後、各 finding を ADR ディレクトリ (もしあれば) と相互参照する。既存 ADR で覆われているものは除外する (summary に "ADR-covered (excluded)" として件数を記録)。

### Step 4: prose ドキュメントからの抽出

検出された各ドキュメントについて、決定動詞を含む文を検索し、ADR coverage をチェック:

- 決定動詞 (英語): "decide", "choose", "adopt", "reject", "deprecate", "must not", "never", "always"
- 決定動詞 (日本語): "決定", "採用", "禁止", "方針", "選定", "排除", "従う", "規約"

各マッチを候補化する。続いて各候補について ADR ディレクトリ (もしあれば) を相互参照し、既存 ADR で覆われている候補は除外する。

#### External ADR Dependency 検出

prose docs に加えて、source code 内の `per ADR-NNNN` / `see ADR-NNNN` / `ADR-NNNN` 参照パターンを scan する:

```bash
ugrep -r -n -E "(per |see |governed by )?ADR-[0-9]{4}" --include="*.rs" --include="*.ts" --include="*.tsx" --include="*.py" --include="*.go" --include="*.md" --include="*.toml" .
```

捕捉した各 ADR id について、local ADR ディレクトリに `NNNN-*.md` が存在するか確認する:

- local match あり → 既存 ADR coverage、skip
- local match 無し → External ADR Dependency 候補として記録

External ADR dependency は promotion 対象として flag する (external の決定を supersede または import する scout-local ADR を書く)。cross-repo の ADR drift は silent で事後検出が難しいため、default で impact=H。

### Step 5: impact + reversibility 付与

| Impact | 判定基準                                                   |
| ------ | ---------------------------------------------------------- |
| H      | モジュール境界を跨ぐ、公開 API に影響、2+ subsystem を支配 |
| M      | 単一モジュールの内部契約                                   |
| L      | ローカルなスタイル / 命名                                  |

| Reversibility | 判定基準                                             |
| ------------- | ---------------------------------------------------- |
| high          | 1 箇所の編集で reverse 可能                          |
| medium        | 2-5 ファイルの coordinated 編集が必要                |
| low           | migration / deprecation cycle / schema change が必要 |

### Step 6: ランク付けと Challenge

#### 6.1 初期ランク付け

ADR 化候補 = (impact=H) AND (reversibility=low OR medium)。

`incomplete-contract=Yes` の finding も `documented?` の値に関わらず promotion する。future contributor 向けの欠けた rule こそが ADR の記録するものであり、comment 単体では担えないから。

それ以外の finding は記録するが promotion しない (informational)。

#### 6.2 Devil's Advocate Challenge

`--no-challenge` 指定時はこの sub-step をスキップする。

`critic-design` を Task で spawn し、初期 promotion 候補リストを渡す。agent は各候補に以下で挑む:

- future contributor はその rule で本当に得をするか? 読者は誰か?
- ADR ではなく code comment + test で足りるのでは?
- ADR が lock-in を生むリスクは無いか (進化すべき決定の過剰文書化)?
- 事実宣言型 config (deny.toml, Cargo.toml lints) の場合、config ファイル自体が既に source of truth で ADR は冗長では?
- monolithic 境界の候補の場合、ADR が現状維持を正当化し分割への圧力を弱めないか?
- 既に enforcement mechanism (型システム、lint、test) があり rule が機械的に守られるなら、ADR に追加できるものは何か?
- Bug vs Invariant: 候補は fix-the-bug case (現コードが誤りで変更すべき) か、invariant-to-document case (現コードが意図的で保持すべき) か? bug は bug-fix follow-up として surface し、ADR にしない。誤った挙動を意図的と文書化すると bug を lock in する。

ADR worth ヒューリスティックと incomplete-contract の例は ${CLAUDE_SKILL_DIR}/references/decision-criteria.md を参照 (候補リストと一緒に critic-design へ渡す)。

各候補について critic-design は以下のいずれかを返す:

| 判定        | 意味                                                                                                                                                 |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `keep`      | ADR worth、単独 ADR または関連候補と統合して起票                                                                                                     |
| `downgrade` | 単独 ADR ではなく、関連 ADR 内の section に吸収 or コメント強化                                                                                      |
| `drop`      | ADR 不要。config/comment/test で既に守られている、cost > value、または候補が bug (bug-fix follow-up として surface し、誤った挙動を document しない) |

challenge 判定を初期ランク付けと並べて記録する。最終候補リスト = `keep` の初期候補 + `downgrade` の候補 (吸収先 ADR を明示)、`drop` は除外。

agent が利用不可または timeout のときは初期ランク付けにフォールバックし、summary に `challenge_skipped: timeout` を注記する。

### Step 7: レポート出力

```bash
mkdir -p docs/audit
STAMP=$(date -u +%Y-%m-%d-%H%M%S)  # UTC date + HHMMSS; same-day reruns never collide
REPORT="docs/audit/${STAMP}-adr-gaps.md"
```

${CLAUDE_SKILL_DIR}/templates/report-template.md に従ってレポートを書き、placeholder (`<YYYY-MM-DD>-<HHMMSS>`, `<source>:<line>`, `<summary>`) を findings から置換する。ファイル毎のサマリー行 `keep N / downgrade N / drop N` を追加する。`--no-challenge` 指定時は Challenge と Final 列を省略し、初期ランク付けをそのまま使用する。

### Step 8: 後続 hand-off

challenge 後の `keep` 候補のみ表示し、各候補について `/adr` での起票を提案するか、`/issue` で単一の tracking issue にまとめる。`downgrade` 候補はコメント強化タスクとしてリストする (ADR ではない)。`drop` 候補はトレーサビリティのためレポートに記録するが、follow-up として surface しない。

## 出力

- レポートパス: `docs/audit/<YYYY-MM-DD>-<HHMMSS>-adr-gaps.md`
- コンソール summary: 候補数、ADR 化候補数
- option: `/adr` で ADR 起草、または `/issue` で tracking issue 起票

## 対象外

- ADR 本文の起草 (本 skill が候補リストを出した後に `/adr` を使う)
- 実コード修正
- README/CONTRIBUTING 等の本文更新 (本 skill は抽出のみ)
- 既存 ADR に対する drift scan (`/audit-adr-drift` を使う)
- cross-repo の scope cluster 検出 (`scripts/audit-adr-scopes.py` を直接使う。本 skill は設計上 single-repo)

## 受け入れ基準

- [ ] `docs/audit/<YYYY-MM-DD>-<HHMMSS>-adr-gaps.md` が存在
- [ ] 閾値超えの大型ファイルごとに section が存在
- [ ] スキャンした各ドキュメントに extraction section が存在 ("no decisions found" でも可)
- [ ] 各候補に impact + reversibility タグが付与
- [ ] ADR 化候補が末尾にリストアップ (one-line rationale 付き)
