---
name: census
description: コードに存在するが ADR の無い設計判断を発掘し、impact と reversibility でランク付けした ADR 化候補リストを生成する。既存 ADR とコードの drift スキャンを担う adrift と組む。
when_to_use: 判断未記録の発掘, undocumented decisions, ADR候補発掘, 設計判断棚卸し, decision archaeology, design rationale audit
allowed-tools: Read Write LS Bash(mkdir:*) Bash(date:*) Bash(python3:*) Bash(ugrep:*) Task AskUserQuestion
model: opus
argument-hint: "[file or directory]"
---

# /census - ADR ギャップ監査

コード内には存在するが ADR に書かれていない設計判断を発掘する。ランク付けした ADR 化候補リストを出力し、次のリファクタリングが完全な判断ベースラインを持てるようにする。

## 入力

`$ARGUMENTS` は監査スコープを表す任意のパス。スコープに応じて下表のとおり動く。スコープを限定したときは部分的な判断ベースラインになるため、レポート Summary の Scope 行に対象を記録する。

| `$ARGUMENTS`     | スコープ                                                               |
| ---------------- | ---------------------------------------------------------------------- |
| なし             | リポジトリ全体。Step 1 でソースファイル、Step 2 で docs を列挙         |
| ファイルパス     | そのファイルのみ発掘する。ソースファイルなら docs 系ステップはスキップ |
| ディレクトリパス | その subtree に Step 1 / Step 2 を限定                                 |

## 判定基準

判定に関わる基準 (impact / reversibility、incomplete-contract の定義、ADR 化価値のヒューリスティック、challenge 観点) はすべて `${CLAUDE_SKILL_DIR}/references/decision-criteria.md` にある。各 Step はこれを基準として適用する。

## Step 1: ソースファイル列挙

ファイルが直接指定された場合はこのステップをスキップし、そのファイルを Step 3 の対象とする。それ以外は `python3 ${CLAUDE_SKILL_DIR}/scripts/list-source-files.py <scope>` を実行し、ソースファイルの一覧を取得する (`<scope>` はディレクトリ指定時はそのパス、引数なし時はリポジトリルート)。

ファイル数が多い (目安 20 件超、リポジトリ規模に応じて調整) 場合は、Step 3 の reviewer fan-out に入る前に AskUserQuestion でフォーカスを確認する (サブディレクトリ / 上位 N 件 / 特定モジュールなど)。目安以下ならフォーカス確認を省き、全件を Step 3 に渡す。

## Step 2: ドキュメント検出

対象がソースファイル単体のときはこのステップをスキップする。ディレクトリ指定時はその subtree、引数なし時はトップ階層と `docs/` 配下を対象に、判断記述を含みやすいドキュメントをスキャンする。対象パターンは `${CLAUDE_SKILL_DIR}/references/detection-targets.md`。

## Step 3: ソースファイルからの判断発掘

各ソースファイルについて、その言語に合う reviewer subagent を Task で起動する。reviewer は以下に答える。

- なぜこのファイルはこの粒度・形になっているか
- コードから読み取れない不変条件や契約を担っているか
- 根拠を記録したコメントや module-doc があるか
- コメントが現状だけを述べ、将来の貢献者向けのルールを欠いていないか (`incomplete-contract` パターン)

各検出事項は `file:line` + 判断概要 + 根拠 (コメント / 命名 / module-doc) + `documented?` + `incomplete-contract?` で記録する。収集後、ADR ディレクトリがあれば相互参照し、既存 ADR で覆われたものは除外する (サマリーに "ADR-covered (excluded)" の件数を記録)。

## Step 4: 散文ドキュメントからの抽出

検出された各ドキュメントについて、決定動詞 (一覧は detection-targets.md) を含む文を検索し、各一致を候補化する。続いて各候補について ADR ディレクトリ (もしあれば) を相互参照し、既存 ADR で覆われている候補は除外する。

## Step 5: ランク付けと Challenge

### 5a タグ付けと初期ランク付け

Step 3 と Step 4 の各候補に impact と reversibility を付与する。ADR 化候補は `(impact = H) AND (reversibility = low OR medium)` を満たすもの。

`incomplete-contract=Yes` の検出事項は `documented?` の値に関わらず昇格する。それ以外の検出事項は記録するが昇格しない (情報提供のみ)。

### 5b Devil's Advocate Challenge

`critic-design` を Task で起動し、初期の昇格候補リストと decision-criteria.md を渡す。critic-design は challenge 観点で各候補に挑み、下表のいずれかを返す。判定は初期ランク付けと並べて記録する。最終候補リストは `keep` と、吸収先 ADR を明示した `downgrade` で構成し、`drop` は除外する。

| 判定        | 意味                                                                                                                                   |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `keep`      | ADR 化に値する。単独 ADR または関連候補と統合して起票                                                                                  |
| `downgrade` | 単独 ADR ではなく、関連 ADR 内のセクションに吸収またはコメント強化                                                                     |
| `drop`      | ADR 不要。設定 / コメント / テストで既に守られている、コストが価値を上回る、または候補が bug (bug-fix の後続として提示し ADR にしない) |

## Step 6: レポート出力

`${CLAUDE_SKILL_DIR}/templates/report-template.md` に従い、placeholder を検出事項から置換してレポートを書く。ファイル毎のサマリー行 `keep N / downgrade N / drop N` を追加する。書き終えたら 候補数 / ADR 化候補数 をコンソールに出力する。

```bash
mkdir -p docs/audit
STAMP=$(date -u +%Y-%m-%d-%H%M%S)  # UTC date + HHMMSS; same-day reruns never collide
REPORT="docs/audit/${STAMP}-adr-gaps.md"
```

## 引き継ぎ

- challenge 後の `keep` 候補のみ表示し、各候補を `/adr` で起票するか `/issue` で単一の追跡 issue にまとめる
- `downgrade` 候補はコメント強化タスクとしてリストする (ADR ではない)。`drop` 候補はレポートに記録するのみで後続にしない
- 本 skill は発掘と候補化のみ。ADR 起草は `/adr`、既存 ADR の drift スキャンは `/adrift`、実コード修正と README 更新は範囲外
- ADR が既にあるリポジトリでは `/adrift` を先に実行し、drift で拾えないギャップをこの skill で発掘する

## 完了条件

以下をすべて満たしたときのみ終了する。満たせない項目は理由をレポートに記録する。

| 項目           | 条件                                                                     |
| -------------- | ------------------------------------------------------------------------ |
| レポート       | `docs/audit/<YYYY-MM-DD>-<HHMMSS>-adr-gaps.md` が存在                    |
| ソースファイル | レビューした各ファイルにセクション                                       |
| ドキュメント   | スキャンした各ドキュメントに抽出セクション ("no decisions found" でも可) |
| タグ           | 各候補に impact と reversibility が付与                                  |
| ADR 化候補     | 末尾にリスト (一行の根拠付き)                                            |
