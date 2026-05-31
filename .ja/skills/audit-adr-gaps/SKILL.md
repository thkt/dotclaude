---
name: audit-adr-gaps
description: ADR の無い設計判断・方針を発掘し、impact と reversibility でランク付けして ADR 化候補リストを生成。既存 ADR の drift チェックは audit-adr-drift と組む。
when_to_use: 判断未記録の発掘, undocumented decisions, ADR候補発掘, 設計判断棚卸し, decision archaeology, design rationale audit
allowed-tools: Read Write Edit LS Bash(git:*) Bash(gh:*) Bash(ugrep:*) Bash(bfs:*) Bash(yomu:*) Bash(sqlite3:*) Bash(wc:*) Task AskUserQuestion
model: opus
argument-hint: "[--threshold=N] [--paths=path,path]"
---

# /audit-adr-gaps - ADR Gaps Audit

コード内には存在するが ADR に書かれていない設計判断を発掘する。ranked された ADR 化候補リストを出力し、次の refactor の整理基準を完成させる。

## When to Use

- repo に暗黙の判断が積み上がっており、ADR で網羅されていない
- refactor 前に「どの判断を尊重し、どの判断を疑うか」のマップが欲しい
- 新規メンテナに「なぜコードがこの形なのか」のマップが必要

### /audit-adr-drift とのペア

`/audit-adr-gaps` と `/audit-adr-drift` は ADR を整理基準にする監査ペア。実行順序は ADR が既にあるかで決まり、固定ではない。

| repo の状態       | 先に実行                                         | 次に実行                                        |
| ----------------- | ------------------------------------------------ | ----------------------------------------------- |
| ADR がある        | `/audit-adr-drift` (ADR と code の drift を検出) | `/audit-adr-gaps` (drift で拾えない gap を発掘) |
| ADR が無い/少ない | `/audit-adr-gaps` (判断を発掘し ADR 候補化)      | `/audit-adr-drift` (ADR 追加後に維持を検証)     |

## Input

`$ARGUMENTS` は全引数文字列。使用前に parse する:

- 空白で token に split
- `--threshold=N`: 整数、省略時または非数値時は `400` を default (`> 0` のみ受理)
- `--paths=p1,p2,...`: カンマ区切りのドキュメントパス。省略時は Step 2 の表で auto-detect
- `--no-challenge`: critic-design による challenge step をスキップ (default: challenge 実行)
- 不明なフラグは silently ignore せず、明示的にエラーで reject
- すべて optional、引数なしなら全て auto-detect + challenge 実行

## Execution

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
# 閾値超えのソースファイルを検出
# NOTE: ここで awk '$1 > t' は使えない。SKILL loader が `$1` を
# $ARGUMENTS の 2番目の whitespace-token (0-indexed) に置換する。
# 代わりに find+while で実装する。
bfs <repo-root> -type f \( -name '*.rs' -o -name '*.ts' -o -name '*.tsx' -o -name '*.py' -o -name '*.go' -o -name '*.swift' \) \
  -not -path '*/target/*' -not -path '*/node_modules/*' -not -path '*/.git/*' \
  -print0 \
  | while IFS= read -r -d '' file; do
      lines=$(wc -l < "$file")
      [ "$lines" -gt "$THRESHOLD" ] && printf '%s %s\n' "$lines" "$file"
    done | sort -rn
```

default 閾値は 400 行 (one-screen 上限、`rules/development/THRESHOLDS.md` 参照)。

### Step 2: ドキュメント検出

トップ階層と `docs/` 配下から下記パターンを検索:

| ファイルパターン                                                   | 含まれやすい内容                 |
| ------------------------------------------------------------------ | -------------------------------- |
| `README.md`                                                        | 設計意図、命名、禁止事項         |
| `CONTRIBUTING.md`                                                  | コードスタイル決定、ワークフロー |
| `SECURITY.md`                                                      | 信頼境界、セキュリティ方針       |
| `THREAT_MODEL.md`                                                  | 信頼境界、緩和策                 |
| `ARCHITECTURE.md`                                                  | モジュール分解、レイヤ方針       |
| `DESIGN.md` / `*.design.md`                                        | コンポーネント rationale         |
| `CLAUDE.md` / `AGENTS.md`                                          | AI エージェント運用判断          |
| `Makefile` / `justfile`                                            | ビルドフローの判断               |
| Linter 設定 (`Cargo.toml` `[lints.*]`, `.eslintrc`, `oxlint.json`) | ルール選定の rationale           |

### Step 3: 大型ファイルからの判断発掘

800 行超のファイル (threshold の 2x) は triage sub-step を先に実施: reviewer に「先頭 200 行をスキャンして finding density (findings/100行) を推定」と指示し、AskUserQuestion で 3 択を提示:

- 全スキャン続行
- 先頭 600 行に truncate (module preamble + 主要 type をカバー)
- スキップ (`skipped_for_size` として記録)

800 行以下のファイルは直接 full scan に進む。

各大型ファイル (full または truncated scope) について、言語ルーティング (`/audit-adr-drift` Step 5 と同様) で対応 reviewer を Task spawn。reviewer は以下を答える:

- なぜこの粒度でこのファイルがあるか?
- コードから読み取れない不変条件 / 契約があるか?
- 既に module-doc / コメントで rationale が記録されているか?
- コメントが「現状」を記述するが「未来 contributor 向けの rule」を欠いているか? (これが `incomplete-contract` パターン)

finding 形式: `file:line` + 判断概要 + 根拠 (code comment / 命名 / module-doc) + `documented?` (Yes/Partial/No) + `incomplete-contract?` (Yes/No)。

`incomplete-contract` フラグは「コメントは事実を記述するが、将来も維持すべき rule を記述してない」findings を捕捉する。例: SSRF-safe HTTP client の field に「redirect disabled for SSRF」と注記があるが「future の user URL handling command は MUST この client を使う」という rule が無い場合。このパターンは security invariant や設計 rationale で頻出で、reader が「この状態は維持すべき」と推測することに依存している。`incomplete-contract=Yes` の finding は `documented?` の値に関わらず ADR 化候補として強い。なぜなら ADR が記述するのはまさにその「未来の rule」やから。

finding 収集後、各 finding を ADR ディレクトリ (もしあれば) と相互参照。既存 ADR で覆われているものは除外 (summary に "ADR-covered (excluded)" として件数記録)。

### Step 4: prose ドキュメントからの抽出

検出された各ドキュメントについて、決定動詞を含む文を検索し、ADR coverage をチェック:

- 決定動詞 (英語): "decide", "choose", "adopt", "reject", "deprecate", "must not", "never", "always"
- 決定動詞 (日本語): "決定", "採用", "禁止", "方針", "選定", "排除", "従う", "規約"

各マッチを候補化、ADR ディレクトリ (もしあれば) で相互参照し、ADR 済みは除外。

#### External ADR Dependency 検出

prose docs に加えて、source code 内の `per ADR-NNNN` / `see ADR-NNNN` / `ADR-NNNN` 参照パターンを scan:

```bash
ugrep -r -n -E "(per |see |governed by )?ADR-[0-9]{4}" --include="*.rs" --include="*.ts" --include="*.tsx" --include="*.py" --include="*.go" --include="*.md" --include="*.toml" .
```

捕捉した各 ADR id について、local ADR ディレクトリに `NNNN-*.md` が存在するか確認:

- local match あり → 既存 ADR coverage、skip
- local match 無し → **External ADR Dependency** 候補として記録

External ADR dependency は ADR 昇格 (scout-local ADR を書いて supersede or import) のため flag。cross-repo ADR drift は silent で事後検出困難なため、impact=H default。

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

`incomplete-contract=Yes` の finding も `documented?` の値に関わらず promotion する。理由は、未来 contributor 向けの rule がまさに ADR の役割であり、コメントだけでは記述できないから。

それ以外は informational として記録するが promotion しない。

#### 6.2 Devil's Advocate Challenge

`--no-challenge` 指定時はこの sub-step をスキップ。

`critic-design` を Task で spawn し、初期 promotion 候補リストを渡して挑む。agent は各候補に以下を疑う:

- 未来 contributor がその rule で本当に得をするか? 読者は誰か?
- ADR ではなく code コメント + test で足りるのでは?
- ADR を作ることで lock-in を生まないか (進化すべき決定の過剰文書化)?
- 事実宣言型の config (deny.toml, Cargo.toml lints) は config 自体が source of truth で、ADR が冗長では?
- monolithic 境界の候補: ADR が現状維持の正当化に使われるリスクは?
- 既に enforcement mechanism (型、lint、test) があり、rule が機械的に守られるなら ADR は何を追加するか?
- **Bug vs Invariant**: 候補は fix-the-bug case (現コードが間違っており修正すべき) か、invariant-to-document case (現コードが意図的で保持すべき) か? bug は bug-fix follow-up として surface し、ADR にはしない。誤動作を意図的と documenting すると bug を lock in してしまう。

各候補について critic-design が以下のどれかを返す:

| 判定        | 意味                                                                                                                                                   |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `keep`      | ADR worth、単独 ADR または関連候補と統合して起票                                                                                                       |
| `downgrade` | 単独 ADR ではなく、関連 ADR 内の section に吸収 or コメント強化                                                                                        |
| `drop`      | ADR 不要、config/comment/test で既に守られている or cost > value、**または候補が bug** (bug-fix follow-up として surface し、誤動作を document しない) |

challenge 判定を初期ランク付けと並べて記録。最終候補リスト = 初期候補のうち `keep` + `downgrade` (吸収先 ADR を明示)、`drop` は除外。

agent が利用不可 or timeout のときは初期ランク付けにフォールバックし、summary に `challenge_skipped: timeout` を注記。

ADR worth ヒューリスティック (scout 試運転 2026-05-13 で実証): 既存の enforcement mechanism (lint 設定、型システム、自動 test) は機械的決定について ADR より強い。ADR は mechanism で守れない以下 2 領域に限定する:

1. tools で強制できない不変条件 (例: 「field X は Y と同時に使ってはいけない」が両方同型のとき)
2. 公開 API 互換性のコミットメント (例: exit code 規約、JSON 出力 schema)

事実宣言型 config (deny.toml, Cargo.toml `[lints.*]`) は自体が source of truth で、ADR に複製すると drift リスクを生む。config block 先頭に policy コメント 1-2 行で十分。

### Step 7: レポート出力

日付時刻は `date -u +%Y-%m-%d-%H%M%S` (UTC ISO 日付 + HHMMSS) で算出し、同日再走でも衝突せず時系列ソート可能にする。出力ディレクトリの存在を保証:

```bash
mkdir -p docs/audit
STAMP=$(date -u +%Y-%m-%d-%H%M%S)
REPORT="docs/audit/${STAMP}-adr-gaps.md"
```

下記フォーマットで保存:

```markdown
# ADR Gaps Audit: <YYYY-MM-DD>-<HHMMSS>

## Summary

| Metric                   | Value |
| ------------------------ | ----- |
| Large files scanned      | N     |
| Documents scanned        | N     |
| Decision candidates      | N     |
| ADR-covered (excluded)   | N     |
| Net new candidates       | N     |
| ADR promotion candidates | N     |

## Large File Decisions

### src/foo.rs (NNN lines)

| #   | Line | Decision | Documented? | Incomplete-contract? | Impact | Reversibility |
| --- | ---- | -------- | ----------- | -------------------- | ------ | ------------- |
| 1   | 42   | ...      | Partial     | Yes                  | H      | low           |

## Prose Document Decisions

### README.md

| #   | Line | Decision Verb | Decision | ADR Coverage |
| --- | ---- | ------------- | -------- | ------------ |
| 1   | 12   | 禁止          | ...      | None         |

## ADR Promotion Candidates (post-challenge)

| #   | Candidate                       | Initial | Challenge | Final          |
| --- | ------------------------------- | ------- | --------- | -------------- |
| 1   | `<source>:<line>` — `<summary>` | promote | keep      | ADR            |
| 2   | `<source>:<line>` — `<summary>` | promote | downgrade | inline-comment |
| 3   | `<source>:<line>` — `<summary>` | promote | drop      | skip           |

ファイル毎のサマリー行: `keep N / downgrade N / drop N`。

`--no-challenge` 指定時は Challenge と Final 列を省略し、初期ランク付けをそのまま使用。
```

### Step 8: 後続 hand-off

challenge 後の `keep` 候補のみ表示し、各候補について `/adr` で起票するか、`/issue` で tracking issue にまとめるかを user に確認。`downgrade` 候補は「コメント強化タスク」として list (ADR ではない)。`drop` 候補はトレース用にレポート内には記録するが follow-up として surface しない。

## Output

- レポートパス: `docs/audit/<YYYY-MM-DD>-<HHMMSS>-adr-gaps.md`
- コンソール summary: 候補数、ADR 化候補数
- option: `/adr` で ADR 起票、または `/issue` で tracking issue 起票

## Out of Scope

- ADR 本文の起草 (候補リストを基に `/adr` で起票)
- 実コード修正
- README/CONTRIBUTING 等の本文更新 (本 skill は抽出のみ)
- 既存 ADR に対する drift scan (`/audit-adr-drift` で扱う)

## Acceptance Criteria

- [ ] `docs/audit/<YYYY-MM-DD>-<HHMMSS>-adr-gaps.md` が存在
- [ ] 閾値超えの大型ファイルごとに section が存在
- [ ] スキャンした各ドキュメントに extraction section が存在 ("no decisions found" でも可)
- [ ] 各候補に impact + reversibility タグが付与
- [ ] ADR 化候補が末尾にリストアップ (one-line rationale 付き)
