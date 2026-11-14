# Research: regomark-dr-lint-pilot

Generated: 2026-11-08
Session: 0d63a60f-0a72-499a-bee6-6f794820d006
Intent: [#775](https://github.com/thkt/dotclaude/issues/775)の Plan 前の pilot。regomark 0.3.0 で dotclaude の DR を検査できるか、意味の判定が使える信号を出すかを確かめる
Domain: Harness
Prior research: none found

## Purpose

regomark を採用する前に、dotclaude の DR（MADR v4、YAML frontmatter）を regomark のポリシーで検査できるかを確かめる。あわせて、Decision Outcome の仕様化を LLM に判定させたときの yes の件数、精度、1 回の費用を実測する。

## Setup

- 対象: dotclaude `d0fe37c34d7c6d709e142866a9b7a85a7f573a58` をスクラッチへ clone した DR 122 件。`docs/decisions/README.md` は除外した。本体の作業ツリーは変更していない
- regomark: v0.3.0 の `regomark_darwin_arm64.tar.gz`。`regomark_0.3.0_checksums.txt` で照合した
- judge: `claude -p` の sonnet。フラグは末尾の `.regomark.yaml` のとおり。`parallel: 6`、`max_questions: 100`
- 質問の対象: status が accepted の DR の Decision Outcome 節。h2 の Decision Outcome から次の見出し（どの階層でも）の手前までのブロック
- 質問 v1: `Besides the decision and its reasons, does this Decision Outcome enumerate details that go stale whenever the code changes, such as lists of agent, file or function names, counts of them, constants, configuration values, or work steps?`
- 質問 v2: 末尾の `meaning.rego` の `ask`。他所で定義されたものの列挙・件数に限り、DR 自身が決めた値は数えないと明示した

## Results

| 項目 | 値 |
| --- | --- |
| frontmatter の入力形 | `rule` ブロックと、frontmatter の各行を本文に持つ setext H2 の `heading` ブロック（`regomark dump` で確認） |
| deny（status-value、supersede-target、supersede-backref、missing-link） | 0 件 |
| warn: proposed-stale（90 日超） | 17 件: 0016 0017 0019 0021 0022 0023 0027 0028 0030 0031 0032 0033 0038 0039 0041 0064 0101 |
| warn: missing-date | 7 件: 0004 0005 0007 0008 0012 0014 0020 |
| 質問の数 | 79 件。accepted 83 件のうち 0004 0005 0020 0037 は Decision Outcome の直後が見出しで、渡すブロックが無い |
| spec-detail の yes（v1） | 31/79 |
| spec-detail の yes（v2） | 44/79。v1 から外れたのは 0012 0018、加わったのは 15 件 |
| 実行時間 | v1 61 秒、v2 62 秒（79 問、キャッシュなし） |
| 1 回の費用 | 記事の judge コマンドのまま $0.37。設定を外したフラグで $0.013（`$TMPDIR` から実行）と $0.005（CLAUDE.md のある clone の直下から実行、キャッシュ読み込みあり）。どちらも DR-0108 の 1 問 |
| 79 問全体の費用 | 測っていない。1 回 $0.013 から推定すると 79 問で約 $1 |

v1 の yes: 0012 0018 0051 0056 0058 0061 0074 0078 0081 0084 0085 0087 0088 0089 0094 0095 0096 0098 0099 0100 0102 0103 0105 0106 0108 0111 0116 0118 0119 0120 0122

v2 の yes: 0011 0014 0015 0045 0048 0049 0051 0056 0058 0061 0062 0063 0074 0078 0079 0081 0083 0084 0085 0087 0088 0089 0093 0094 0095 0096 0098 0099 0100 0102 0103 0104 0105 0106 0108 0110 0111 0115 0116 0117 0118 0119 0120 0122

### 手作業の確認

各行で「この決定を見直さないコード変更が、その文を偽にするか」を判定した。

| DR | v1 | v2 | 手で見た判定 | 根拠の行 |
| --- | --- | --- | --- | --- |
| 0108 | yes | yes | 該当 | L41。拒否対象の 26 エージェント名の列挙 |
| 0098 | yes | yes | 該当 | L35。`agent` フィールドを持つ wrapper 8 件 |
| 0105 | yes | yes | 該当 | L32。「7 本すべて」の workflow の本数 |
| 0087 | yes | yes | 該当 | L29。`UNIT_CAPS = { files: 3, tests: 4 }`、関数名、停止値 |
| 0118 | yes | yes | 該当 | L40。biome.json の設定値と `files.includes` のパス |
| 0012 | yes | no | 非該当。DR 自身が決めたティア閾値 | L50 |
| 0099 | yes | yes | 非該当寄り。severity の振り分けは DR の決定だが、v2 は ADR-0077 の規則の再掲と判定した | L36 |
| 0093 | no | yes | 非該当寄り。`kind` の 3 値は決定そのもの。v2 は却下案の理由にある「open な Plan 3 件」を拾った | L34 |
| 0121 | no | no | 該当（見逃し）。「`settings.json` now carries 29 hook handlers」 | Decision Outcome の 2 段落目 |

yes は新しい DR に偏る。v1 では DR-0074 以降が 41 件中 25 件、それより前が 38 件中 6 件だった。

## Key Findings

| Priority | Finding | Source | Next Action |
| --- | --- | --- | --- |
| High | regomark のポリシーはリポジトリの中にしか置けない。絶対パスは `must be relative to the repository root`、`../` で外を指すと `must be inside the repository` で終了コード 2 | 2026-11-08 に scout のリポジトリで `regomark check --config <外部>` を実行 | #775 は regomark を dotclaude にだけ置き、他リポジトリへの配布をスコープ外にした |
| High | 意味の判定は質問の言い回しで揺れる。v1 と v2 で 79 件中 17 件が入れ替わった | 上の Results | #775 は LLM の答えを warn にだけ流す。質問の文言は Plan で決める |
| High | 記事の judge コマンドのままだと、ユーザー設定を読み込んで 1 回 $0.37 かかる。`--setting-sources ""` などのフラグで $0.005〜0.013 になり、判定は変わらなかった | 上の Results | #775 の Proposed solution にフラグを記載した |
| Medium | frontmatter は metadata として読まれないが、rego のライブラリで status と date を読める | `internal/input/markdown.go:18`（goldmark の拡張は `extension.Table` だけ）と `regomark dump` の出力 | 末尾の `drlib.rego` を Plan の出発点にする |
| Medium | 構造の deny は現状 0 件。複数の DR にまたがる規則とリンク先の検査は、違反の予防として入れる | 上の Results | record only |
| Medium | 既存 DR の 122 件中 60 件は `validate-dr.ts` の `missing_section:Confirmation` で error になる | 2026-11-08 に `node skills/dr/scripts/validate-dr.ts` を全 DR に実行 | #775 は CI で PR が変更した DR だけに `validate-dr.ts` を走らせる |
| Low | 手作業の確認は 9 件で、精度の推定には足りない | 上の手作業の確認 | record only |

## Constraints

| Category | Constraint |
| --- | --- |
| Tool | regomark の README は自身を「under development」と書く。v0.3.0 は 2026-11-03 公開、3 日で 3 リリース。入力は `schema_version: 2` |
| Tool | `claude --bare` は ANTHROPIC_API_KEY を必須にするので、OAuth の環境では使えない |
| Repo | `.gitignore` は `docs/research/` の直下の `*.md` だけを追跡する。ポリシーをこのファイルに埋め込んだのはこのため |
| Rule ownership | `status-value` と `missing-date` は `validate-dr.ts` の 1 ファイル規則と重なる。#775 の分担では rego に入れない |

## Policy (as run)

v2 の実行時の内容。`judge.cache` はスクラッチのパスだったので削った。

```yaml
documents: docs/decisions
policy: .regomark/policy
entrypoint: dr
exclude: [docs/decisions/README.md]
judge:
  command: [sh, -c, 'claude -p --output-format json --model sonnet --tools "" --setting-sources "" --strict-mcp-config --no-session-persistence --exclude-dynamic-system-prompt-sections --system-prompt "You answer questions about Markdown documents with a JSON object." --json-schema "$REGOMARK_ANSWER_SCHEMA"']
  parallel: 6
  timeout: 120s
  max_questions: 100
```

`.regomark/policy/lib/drlib.rego` は次のとおり。

```rego
package drlib

# goldmark (Table extension only) parses YAML frontmatter as a thematic break
# followed by a setext H2 whose text holds the frontmatter lines.
frontmatter(doc) := b if {
	doc.blocks[0].kind == "rule"
	b := doc.blocks[1]
	b.kind == "heading"
	b.level == 2
}

field(doc, name) := v if {
	some line in split(frontmatter(doc).text, "\n")
	startswith(line, concat("", [name, ":"]))
	v := trim(trim_space(substring(line, count(name) + 1, -1)), "\"")
}

field_line(doc, name) := frontmatter(doc).line + i if {
	some i, line in split(frontmatter(doc).text, "\n")
	startswith(line, concat("", [name, ":"]))
}

number(doc) := substring(doc.name, 0, 4) if regex.match(`^\d{4}-`, doc.name)

section_end(doc, i) := min({k | some k, b in doc.blocks; k > i; b.kind == "heading"} | {count(doc.blocks)})

# Blocks under a level-2 heading, up to the next heading of any level
# (Consequences is an h3 inside Decision Outcome in MADR v4).
section(doc, title) := [b |
	some k, b in doc.blocks
	k > i
	k < section_end(doc, i)
] if {
	some i, h in doc.blocks
	h.kind == "heading"
	h.level == 2
	h.text == title
}

section_line(doc, title) := h.line if {
	some h in doc.blocks
	h.kind == "heading"
	h.level == 2
	h.text == title
}
```

`.regomark/policy/structure.rego` は次のとおり。

```rego
package dr

import data.drlib

schema_version := 2

rule_ids := {"status-value", "supersede-target", "supersede-backref", "missing-link", "missing-date", "proposed-stale", "spec-detail", "judge-failed"}

numbered := {drlib.number(d): d | some d in input.documents}

deny contains {"rule": "status-value", "path": doc.path, "line": drlib.field_line(doc, "status"), "message": msg} if {
	some doc in input.documents
	s := drlib.field(doc, "status")
	not regex.match(`^(proposed|accepted|rejected|deprecated|superseded by DR-\d{4})$`, s)
	msg := sprintf("status %q is outside the lifecycle", [s])
}

superseded_by(doc) := substring(s, count("superseded by DR-"), -1) if {
	s := drlib.field(doc, "status")
	startswith(s, "superseded by DR-")
}

deny contains {"rule": "supersede-target", "path": doc.path, "line": drlib.field_line(doc, "status"), "message": msg} if {
	some doc in input.documents
	t := superseded_by(doc)
	not numbered[t]
	msg := sprintf("superseded by DR-%s, which does not exist", [t])
}

deny contains {"rule": "supersede-backref", "path": doc.path, "line": drlib.field_line(doc, "status"), "message": msg} if {
	some doc in input.documents
	t := superseded_by(doc)
	succ := numbered[t]
	ref := concat("", ["DR-", drlib.number(doc)])
	not mentions(succ, ref)
	msg := sprintf("DR-%s never mentions %s", [t, ref])
}

mentions(doc, s) if {
	some b in doc.blocks
	contains(b.text, s)
}

deny contains {"rule": "missing-link", "path": doc.path, "line": l.line, "message": msg} if {
	some doc in input.documents
	drlib.field(doc, "status") == "accepted"
	some l in doc.links
	l.kind in {"missing", "outside"}
	msg := sprintf("link %q points to %s", [l.dest, l.kind])
}

warn contains {"rule": "missing-date", "path": doc.path, "line": 1, "message": "frontmatter has no date"} if {
	some doc in input.documents
	drlib.frontmatter(doc)
	not drlib.field(doc, "date")
}

stale_days := 90

warn contains {"rule": "proposed-stale", "path": doc.path, "line": drlib.field_line(doc, "status"), "message": msg} if {
	some doc in input.documents
	drlib.field(doc, "status") == "proposed"
	d := drlib.field(doc, "date")
	days := (time.now_ns() - time.parse_ns("2006-01-02", d)) / (24 * 3600 * 1000000000)
	days > stale_days
	msg := sprintf("proposed for %d days (since %s)", [floor(days), d])
}
```

v2 の質問を入れた `.regomark/policy/meaning.rego` は次のとおり。

```rego
package dr

import data.drlib

questions contains {"id": "spec-detail", "path": doc.path, "line": drlib.section_line(doc, "Decision Outcome"), "blocks": blocks, "ask": ask} if {
	some doc in input.documents
	drlib.field(doc, "status") == "accepted"
	blocks := drlib.section(doc, "Decision Outcome")
	count(blocks) > 0
	ask := "Does this Decision Outcome list or count things that are defined elsewhere in the repository, such as agent, skill, hook, file or function names, how many of them exist, or step-by-step work instructions, so that a later code change that does not revisit this decision would make the sentence false? Values, thresholds and options that this record itself decides do not count."
}

warn contains {"rule": "spec-detail", "path": j.path, "line": j.evidence_line, "message": j.reason} if {
	some j in input.judgments
	j.id == "spec-detail"
	j.status == "ok"
	j.verdict == "yes"
}

warn contains {"rule": "judge-failed", "path": j.path, "line": j.line, "message": sprintf("%s: %s", [j.status, j.error])} if {
	some j in input.judgments
	j.status in {"provider_failed", "invalid_answer"}
}
```

## Disconfirmation Check

deny が 0 件なのはポリシーの書き間違いではないかを、regomark を通さずに確かめた。

- supersede の検査: シェルのループで、superseded の DR 14 件それぞれについて後継のファイルの存在と前任の番号への言及を調べ、14 行すべてが `OK` だった。最初の実行は何も出力しなかったので、`OK` の行を出す形で再実行して件数を確かめた
- リンクの検査: `regomark dump` のリンクの `kind` は `external` 26 件、`file` 67 件で、`missing` と `outside` は 0 件だった。`ugrep` で相対リンクを抜き出して存在を調べた結果（67 件中切れ 0 件）と一致した

## References

| Path | Description |
| --- | --- |
| [ADR を rego で lint する](https://zenn.dev/babarot/articles/regomark-adr-checker) | regomark の紹介記事。構造は deny、意味は LLM に質問して warn に流す設計 |
| [babarot/regomark](https://github.com/babarot/regomark) | README（入力の形、questions、judge の設定）と `internal/input/markdown.go` |
| [#775](https://github.com/thkt/dotclaude/issues/775) | この pilot を根拠にした Issue |
| `skills/dr/scripts/validate-dr.ts` | 1 ファイルの規則（節、status、選択肢の数、タイトル） |
| `tests/decision-records.test.ts` | CI にある DR の検査（番号の重複、タイトルの番号） |

## Coverage Notes

- 同じ質問を繰り返したときの揺れは測っていない。v1 と v2 の入れ替わり 17 件は、言い回しの差と実行ごとの揺れが混ざっている。regomark は答えをキャッシュするため、再実行には `judge.cache` を空にする必要がある
- 精度は手作業の 9 件でしか見ていない。質問の文言を決めるときは、yes と no の両方から抜き出して確かめる
- `opa test` は実行していない（手元に opa が無い）。ポリシーは `regomark check` が終了コード 0 で評価できることだけを確かめた
- 79 問全体の費用は測っていない。1 回の費用からの推定である
- Advisor: pilot 中に 2 回。frontmatter の推論を `regomark dump` で確かめること、yes の手作業の確認、CLAUDE.md のあるディレクトリからの費用の再計測を指摘され、すべて実施した

## Next Steps

| Intent | Next Command |
| --- | --- |
| Feature planning | `/think`（#775 の Plan） |
