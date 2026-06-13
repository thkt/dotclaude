---
name: census
description: ADR の無い設計判断を発掘し、昇格前に各候補を critic-design で challenge する。impact と reversibility でランク付けし、ADR 化候補リストを生成。各候補は登録すべき事実ではなく、ADR 化を主張する立場として扱う。既存 ADR とコードの drift スキャンを担う adrift と組む。
when_to_use: 判断未記録の発掘, undocumented decisions, ADR候補発掘, 設計判断棚卸し, decision archaeology, design rationale audit
allowed-tools: Read Write LS Bash(mkdir:*) Bash(date:*) Bash(python3:*) Bash(ugrep:*) Bash(bfs:*) Bash(wc:*) Task AskUserQuestion
model: opus
argument-hint: "[--threshold=N] [--paths=path,path]"
---

# /census - ADR ギャップ監査

コード内には存在するが ADR に書かれていない設計判断を発掘する。各候補は昇格前に critic-design (Step 6.2) で challenge される。最終リストは初期スキャンが見つけたものではなく、敵対的検証を生き残ったもの。ランク付けした ADR 化候補リストを出力し、次のリファクタリングが完全な判断ベースラインを持てるようにする。

## 使いどころ

- リポジトリに暗黙の判断が積み上がっており、ADR で網羅されていない
- リファクタリング前に「どの判断を尊重し、どの判断を疑うか」のマップが欲しい
- 新規メンテナに「なぜコードがこの形なのか」のマップが必要

### /adrift とのペア

`/census` と `/adrift` は ADR を整理基準にする監査ペア。実行順序は ADR が既にあるかで決まり、固定ではない。

| repo の状態       | 先に実行                                | 次に実行                                   |
| ----------------- | --------------------------------------- | ------------------------------------------ |
| ADR がある        | `/adrift` (ADR とコードの drift を検出) | `/census` (drift で拾えないギャップを発掘) |
| ADR が無い/少ない | `/census` (判断を発掘し ADR 候補化)     | `/adrift` (ADR 追加後に維持を検証)         |

## 入力

`$ARGUMENTS` は全引数文字列。使用前に解析する:

- 空白でトークンに分割
- `--threshold=N`: 整数、省略時または非数値時は `400` を既定 (`> 0` のみ受理)
- `--paths=p1,p2,...`: カンマ区切りのドキュメントパス。省略時は Step 2 の表で自動検出
- `--no-challenge`: critic-design による challenge ステップをスキップ (既定: challenge 実行)
- 不明なフラグは黙って無視せず、明示的にエラーで却下
- すべて任意、引数なしなら全て自動検出 + challenge 実行

## Step 1: 大型ファイル検出

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

既定の閾値は 400 行 (1 画面の上限)。

## Step 2: ドキュメント検出

トップ階層と `docs/` 配下から判断記述を含みやすいドキュメント (README, CONTRIBUTING, SECURITY, THREAT_MODEL, ARCHITECTURE, DESIGN, CLAUDE.md / AGENTS.md, Makefile / justfile, linter 設定) をスキャンする。パターンと内容の全対応表は ${CLAUDE_SKILL_DIR}/references/detection-targets.md を参照。

## Step 3: 大型ファイルからの判断発掘

800 行超のファイル (閾値の 2 倍) はトリアージのサブステップを先に実施する。reviewer に「先頭 200 行をスキャンして検出事項密度 (検出事項/100行) を推定」と指示して起動し、AskUserQuestion で 3 択を提示:

- 全スキャン続行
- 先頭 600 行に切り詰め (モジュール前置きと主要な型をカバー)
- このファイルをスキップ (`skipped_for_size` として記録)

800 行以下のファイルは直接全スキャンに進む。

各大型ファイル (全体または切り詰めたスコープ) について、対応する reviewer を Task で起動する (ルーティングは `/adrift` Step 5 と同様)。reviewer は以下に答える:

- なぜこのファイルはこの粒度の形になっているか?
- コードから読み取れない不変条件や契約を担っているか?
- 根拠を既に記録したコメントや module-doc があるか?
- コメントが現状を記述する一方で、将来の貢献者向けのルールを欠いていないか? (これが `incomplete-contract` パターン)

検出事項の形式: `file:line` + 判断概要 + 根拠 (コードコメント、命名、module-doc) + `documented?` (Yes/Partial/No) + `incomplete-contract?` (Yes/No)。`incomplete-contract` フラグは、コメントが「何が真か」を述べる一方「何が真であり続けるべきか」を述べていないコード (将来の貢献者向けのルールの欠落) に付ける。昇格は Step 6.1 で扱い、例は ${CLAUDE_SKILL_DIR}/references/decision-criteria.md にある。

検出事項の収集後、各検出事項を ADR ディレクトリ (もしあれば) と相互参照する。既存 ADR で覆われているものは除外する (サマリーに "ADR-covered (excluded)" として件数を記録)。

## Step 4: 散文ドキュメントからの抽出

検出された各ドキュメントについて、決定動詞を含む文を検索し、ADR カバレッジをチェック:

- 決定動詞 (英語): "decide", "choose", "adopt", "reject", "deprecate", "must not", "never", "always"
- 決定動詞 (日本語): "決定", "採用", "禁止", "方針", "選定", "排除", "従う", "規約"

各一致を候補化する。続いて各候補について ADR ディレクトリ (もしあれば) を相互参照し、既存 ADR で覆われている候補は除外する。

### External ADR 依存の検出

散文ドキュメントに加えて、ソースコード内の `ADR-NNNN` 参照のうちローカルに未昇格の外部依存を検出する。`python3 ${CLAUDE_SKILL_DIR}/../_lib/external-adr-refs.py --json` を実行する。慣用 ADR ディレクトリ (docs/decisions, docs/adr, architecture/decisions, adr) を自動検出し、コードベースの `ADR-NNNN` 参照のうちローカルの `NNNN-*.md` に一致しない ID を `external_refs` として返す。ADR ディレクトリが無いリポジトリでは全参照が外部扱いになる。

`external_refs` の各 ID を External ADR 依存候補として記録する。External ADR 依存は昇格対象としてフラグ付けする (外部の決定を supersede または取り込む scout-local ADR を書く)。リポジトリ横断の ADR drift は気づかれにくく事後検出が難しいため、既定で impact=H。

## Step 5: impact + reversibility 付与

| Impact | 判定基準                                                     |
| ------ | ------------------------------------------------------------ |
| H      | モジュール境界を跨ぐ、公開 API に影響、2+ サブシステムを支配 |
| M      | 単一モジュールの内部契約                                     |
| L      | 局所的なスタイル / 命名                                      |

| Reversibility | 判定基準                                               |
| ------------- | ------------------------------------------------------ |
| high          | 1 箇所の編集で巻き戻し可能                             |
| medium        | 2-5 ファイルの連動した編集が必要                       |
| low           | マイグレーション / 非推奨サイクル / スキーマ変更が必要 |

## Step 6: ランク付けと Challenge

### 6.1 初期ランク付け

ADR 化候補 = (impact=H) AND (reversibility=low OR medium)。

`incomplete-contract=Yes` の検出事項も `documented?` の値に関わらず昇格する。将来の貢献者向けの欠けたルールこそが ADR の記録するものであり、コメント単体では担えないから。

それ以外の検出事項は記録するが昇格しない (情報提供のみ)。

### 6.2 Devil's Advocate Challenge

`--no-challenge` 指定時はこのサブステップをスキップする。

`critic-design` を Task で起動し、初期の昇格候補リストを渡す。エージェントは各候補に以下で挑む:

- 将来の貢献者はそのルールで本当に得をするか? 読者は誰か?
- ADR ではなくコードコメント + テストで足りるのでは?
- ADR がロックインを生むリスクは無いか (進化すべき決定の過剰文書化)?
- 事実宣言型の設定 (deny.toml, Cargo.toml lints) の場合、設定ファイル自体が既に信頼源で ADR は冗長では?
- モノリシック境界の候補の場合、ADR が現状維持を正当化し分割への圧力を弱めないか?
- 既に強制機構 (型システム、lint、テスト) がありルールが機械的に守られるなら、ADR に追加できるものは何か?
- Bug vs Invariant: 候補は fix-the-bug case (現コードが誤りで変更すべき) か、invariant-to-document case (現コードが意図的で保持すべき) か? bug は bug-fix の後続として提示し、ADR にしない。誤った挙動を意図的と文書化すると bug をロックインする。

ADR 化価値のヒューリスティックと incomplete-contract の例は ${CLAUDE_SKILL_DIR}/references/decision-criteria.md を参照 (候補リストと一緒に critic-design へ渡す)。

各候補について critic-design は以下のいずれかを返す:

| 判定        | 意味                                                                                                                                     |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `keep`      | ADR 化に値する。単独 ADR または関連候補と統合して起票                                                                                    |
| `downgrade` | 単独 ADR ではなく、関連 ADR 内のセクションに吸収またはコメント強化                                                                       |
| `drop`      | ADR 不要。設定/コメント/テストで既に守られている、コスト > 価値、または候補が bug (bug-fix の後続として提示し、誤った挙動を文書化しない) |

challenge 判定を初期ランク付けと並べて記録する。最終候補リスト = `keep` の初期候補 + `downgrade` の候補 (吸収先 ADR を明示)、`drop` は除外。

エージェントが利用不可またはタイムアウトのときは初期ランク付けにフォールバックし、サマリーに `challenge_skipped: timeout` を注記する。

## Step 7: レポート出力

`${CLAUDE_SKILL_DIR}/templates/report-template.md` に従い、placeholder を検出事項から置換してレポートを書く。ファイル毎のサマリー行 `keep N / downgrade N / drop N` を追加する。`--no-challenge` 指定時は Challenge と Final 列を省略し、初期ランク付けをそのまま使用する。書き終えたら 候補数・ADR 化候補数 をコンソールに出力する。

```bash
mkdir -p docs/audit
STAMP=$(date -u +%Y-%m-%d-%H%M%S)  # UTC date + HHMMSS; same-day reruns never collide
REPORT="docs/audit/${STAMP}-adr-gaps.md"
```

## 引き継ぎ

challenge 後の `keep` 候補のみ表示し、各候補について `/adr` での起票を提案するか、`/issue` で単一の追跡 issue にまとめる。`downgrade` 候補はコメント強化タスクとしてリストする (ADR ではない)。`drop` 候補はトレーサビリティのためレポートに記録するが、後続としては提示しない。本 skill は判断の発掘と候補化のみで、ADR 起草は `/adr`、既存 ADR の drift スキャンは `/adrift`、実コード修正と README 本文更新は範囲外 (抽出のみ)。リポジトリ横断のスコープクラスタは `scripts/audit-adr-scopes.py` を直接使う (本 skill は単一リポジトリ設計)。

## 完了条件

以下をすべて満たしたときのみ終了する。満たせない項目は理由をレポートに記録する。

| 項目         | 条件                                                                     |
| ------------ | ------------------------------------------------------------------------ |
| レポート     | `docs/audit/<YYYY-MM-DD>-<HHMMSS>-adr-gaps.md` が存在                    |
| 大型ファイル | 閾値超えの各ファイルにセクション                                         |
| ドキュメント | スキャンした各ドキュメントに抽出セクション ("no decisions found" でも可) |
| タグ         | 各候補に impact + reversibility が付与                                   |
| ADR 化候補   | 末尾にリスト (一行の根拠付き)                                            |
