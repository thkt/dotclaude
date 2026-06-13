---
name: audit-adr-drift
description: ADR の Decision section と現コードの drift を体系 scan し、修正方向と優先度付きレポートを生成。ADR が無い repo では使わない (audit-adr-gaps を先に使う)。
when_to_use: ADR と コードの整合性確認, ADR drift, ADR vs code, ADR audit, 意思決定の風化チェック, decision record divergence
allowed-tools: Read Write Edit LS Bash(git:*) Bash(gh:*) Bash(ugrep:*) Bash(bfs:*) Task AskUserQuestion
model: opus
argument-hint: "[adr-directory]"
---

# /audit-adr-drift - ADR とコードの drift スキャナー

各 ADR の Decision section と現コードを照合し、drift を file:line + 修正方向 + 優先度で記録する。ADR を refactor の整理基準として使えるよう gap を可視化する。

## 使いどころ

- repo に ADR が存在し、Decision 本文と現コードの整合性が体系的に確認されていない
- refactor 前に「ADR を整理基準として信頼できるか」を確認したい
- ADR への Note 追加や本文 update の要否を判断したい

ADR ディレクトリが無い repo では本 skill は使わず、先に `/audit-adr-gaps` を実行する。

### /audit-adr-gaps とのペア

`/audit-adr-gaps` と `/audit-adr-drift` は ADR を整理基準にする監査ペア。実行順序は ADR が既にあるかで決まり、固定ではない。

| repo の状態       | 先に実行                                         | 次に実行                                        |
| ----------------- | ------------------------------------------------ | ----------------------------------------------- |
| ADR がある        | `/audit-adr-drift` (ADR と code の drift を検出) | `/audit-adr-gaps` (drift で拾えない gap を発掘) |
| ADR が無い/少ない | `/audit-adr-gaps` (判断を発掘し ADR 候補化)      | `/audit-adr-drift` (ADR 追加後に維持を検証)     |

## 入力

`$ARGUMENTS` は単一 ADR ディレクトリパスを含み得る。使用前に parse する。

- 空白を trim、空文字列は "auto-detect" として扱う
- 非空の場合、repo root 相対のパスとして扱う。存在しなければ reject
- auto-detect 順序: `docs/decisions/`, `docs/adr/`, `architecture/decisions/`, `adr/`
- 複数該当時は AskUserQuestion で選択
- 全て該当なしの場合は "No ADRs found, run /audit-adr-gaps first" で abort

## 実行

| Step | アクション                                                               |
| ---- | ------------------------------------------------------------------------ |
| 1    | ADR ディレクトリ検出 (auto-detect or `$ARGUMENTS`)                       |
| 2    | ADR 一覧化と Status 抽出 (Accepted / Superseded / Proposed)              |
| 3    | ADR ごとに Decision section と言及シンボル (関数・型・モジュール) を抽出 |
| 4    | ugrep/bfs で参照検索し、drift 候補を作成                                 |
| 5    | repo 言語に応じた reviewer agent を候補箇所に対して spawn                |
| 6    | 各 finding に修正方向 (code-fix / adr-update / accept) を付与            |
| 7    | 各 finding に優先度 (H / M / L) を付与                                   |
| 8    | レポートを `docs/audit/<YYYY-MM-DD>-<HHMMSS>-adr-drift.md` に出力        |
| 9    | H priority drift を follow-up issue 候補としてリスト                     |

### Step 1: ADR 検出

トップ階層と `docs/` 配下から ADR の慣用パスを検索。複数該当時はユーザーに尋ねる。

| Path                      | 多いプロジェクト      |
| ------------------------- | --------------------- |
| `docs/decisions/`         | MADR スタイル         |
| `docs/adr/`               | adr-tools スタイル    |
| `architecture/decisions/` | 大規模 monorepo       |
| `adr/`                    | root-level 配置の慣習 |

### Step 2: Status 抽出

各 ADR の front matter または冒頭 section から Status を解析。`Superseded by [...]` リンクで後継 ADR を辿る。

### Step 3: Decision からのシンボル抽出

各 ADR の Decision section から code-identifier (関数名・型名・モジュール名・ファイルパス) と bullet 単位の決定事項を抽出。prose のみの ADR は "unverifiable, prose-only" として記録。

### Step 4: 参照検索

抽出した各シンボルに以下を適用する。

- `ugrep -r "<symbol>"` で literal マッチ
- ADR ファイル自体と test fixture は除外

#### External ADR クロスチェック

加えて、codebase 全体を `ADR-NNNN` (大文字) と `adr-nnnn` (小文字) 参照パターンで scan する。

```bash
ugrep -r -n -E "ADR-[0-9]{4}|adr-[0-9]{4}" --include="*.rs" --include="*.md" --include="*.toml" .
```

捕捉した各 ADR id について、Step 1 で検出した ADR ディレクトリに `NNNN-*.md` が存在するか確認。local に無い ADR id への参照は External ADR dependency として別 section (Step 8) に記録。これは meta ADR が別 repo (例: 共有 dotclaude config) にあるが local に未昇格 (promote) の case を捕捉する。

### Step 5: Reviewer 選択

manifest ファイルで repo 言語を判定し、対応する reviewer を Task で spawn。reviewer には候補 file:line リストと ADR Decision 本文を渡す。clippy や grep で拾えない semantic gap を判定させる。

| 検出                           | spawn する Reviewer                          |
| ------------------------------ | -------------------------------------------- |
| `Cargo.toml`                   | reviewer-rust + reviewer-design              |
| `package.json` で `*.tsx` 含む | reviewer-strictness + reviewer-react-pattern |
| `package.json` (それ以外)      | reviewer-strictness + reviewer-design        |
| `pyproject.toml` / `setup.py`  | reviewer-design (言語非依存のみ)             |
| `go.mod`                       | reviewer-design (言語非依存のみ)             |
| その他 / 不明                  | reviewer-design                              |

### Step 6: 修正方向

| 方向         | 判定基準                                                             |
| ------------ | -------------------------------------------------------------------- |
| `code-fix`   | ADR が現契約として正しく、コードが drift                             |
| `adr-update` | コードが現契約として正しく、ADR が outdated (Note 追記 or supersede) |
| `accept`     | drift は cosmetic / deprecated comment / ドキュメント済              |

### Step 7: 優先度

| 優先度 | 判定基準                                                |
| ------ | ------------------------------------------------------- |
| H      | 公開 API への影響、または 2+ downstream consumer に影響 |
| M      | 内部 API、単一 consumer                                 |
| L      | doc-string のみ、dead reference、comment レベル         |

### Step 8: レポート出力

日付時刻は `date -u +%Y-%m-%d-%H%M%S` (UTC ISO 日付 + HHMMSS) で算出し、同日再走でも衝突せず時系列ソート可能にする。出力ディレクトリの存在を保証する。

```bash
mkdir -p docs/audit
STAMP=$(date -u +%Y-%m-%d-%H%M%S)
REPORT="docs/audit/${STAMP}-adr-drift.md"
```

下記フォーマットで保存する。

```markdown
# ADR Drift Scan: <YYYY-MM-DD>-<HHMMSS>

## Summary

| Metric            | Value |
| ----------------- | ----- |
| ADRs scanned      | N     |
| Drift findings    | N     |
| H priority        | N     |
| M priority        | N     |
| L priority        | N     |
| Unverifiable ADRs | N     |

## Per-ADR Findings

### ADR <id>: <title>

Status: <Accepted/Superseded>

| #   | File:Line   | 説明 | Direction | Priority |
| --- | ----------- | ---- | --------- | -------- |
| 1   | src/x.rs:42 | ...  | code-fix  | H        |

(ADR ごとに繰り返す)

## External ADR Dependencies

| #   | File:Line     | External ADR ref     | Recommended action                        |
| --- | ------------- | -------------------- | ----------------------------------------- |
| 1   | src/foo.rs:55 | ADR-NNNN (not local) | scout-local ADR に昇格 or local supersede |

## Follow-up Issue Candidates

- [ ] ADR <id> drift at <file:line>: <one-line summary>
```

### Step 9: 後続 hand-off

H priority の follow-up 候補を表示し、`/issue` で個別起票するかを user に確認。

## 出力

- レポートパス: `docs/audit/<YYYY-MM-DD>-<HHMMSS>-adr-drift.md`
- コンソール summary: ADR 数、finding 数、H/M/L 内訳
- option: H priority drift について `/issue` で起票

## 対象外

- 実コード修正 (別途)
- ADR 本文の本格的書き換え (Note 追記レベルは含む。大幅変更は新 ADR + Supersedes リンク)
- ADR が無い領域の発掘 (`/audit-adr-gaps` で扱う)

## 受け入れ基準

- [ ] `docs/audit/<YYYY-MM-DD>-<HHMMSS>-adr-drift.md` が存在
- [ ] 各 ADR について drift section が存在 (findings or "no drift" or "unverifiable")
- [ ] 各 drift finding に file:line, ADR ref, direction, priority が記録
- [ ] superseded ADR は Note 追記 vs 本文書き換えの推奨が結論付き
- [ ] H priority drift が follow-up 候補としてリストアップ
