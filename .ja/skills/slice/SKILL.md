---
name: slice
description: 計画 / spec / PRD を独立して着手可能な tracer-bullet 垂直スライス issue 群に分解し、依存順で GitHub に公開する。各 issue は全レイヤーを貫く 1 本の細い縦串。
when_to_use: 計画を issue に分解, plan を issue 化, spec を issue 群に, vertical slice, tracer bullet, issue 分割, slice
allowed-tools: Bash(gh:*) Bash(cat:*) Bash(mv:*) Bash(ugrep:*) Bash(bfs:*) Read LS Task AskUserQuestion
model: opus
argument-hint: "[plan / spec / PRD / issue ref]"
---

# /slice - 計画を垂直スライス issue に分解

## 入力

`$ARGUMENTS` から計画のソースを取る。番号 / URL / パスの issue 参照なら `gh issue view <N>` で本文とコメントを取得する。空ならまず会話文脈にある計画を使い、無ければ何を分解するか AskUserQuestion で問う。

## 他スキルとの区別

| スキル        | 産物                         | 媒体 / タイミング          |
| ------------- | ---------------------------- | -------------------------- |
| /slice (これ) | 依存順の永続 GitHub issue 群 | 後で人間が拾うためのキュー |
| /issue        | 単一 issue                   | 1 件の要求を起票する       |

/slice は分解と依存順 publish が価値。1 件だけなら /issue を使う。slice が生む issue には `## Plan` がまだ無く、そのまま /build に渡すと build が ephemeral plan を自動生成して進み、人間レビュー未経由の assumption が付く。plan の精度を上げたいスライスは、/think で plan を作り issue の `## Plan` 節へ書き足してから /build に渡す。既に構造化 plan を手元に持つなら /code を使う。

## Phase 1: 文脈を集める

会話文脈にある計画から作業する。`$ARGUMENTS` に issue 参照があれば本文とコメントを読む。

## Phase 2: コードベース探索 (任意)

未探索なら現状を把握する。issue のタイトル / 説明はプロジェクトの用語集に従い、触る領域の ADR を尊重する。実装を楽にする prefactor の機会を探す。横断的な探索が要るときだけ Explore エージェントを 1 体起動する。per-slice の spawn はしない。

## Phase 3: 垂直スライスを起草する

計画を tracer bullet issue に割る。横スライス (1 レイヤーだけ) ではなく縦スライス。

| ルール       | 内容                                                     |
| ------------ | -------------------------------------------------------- |
| 全レイヤー   | 各スライスは全レイヤー (schema / API / UI / test) を貫く |
| 単独検証可能 | 完了スライスはそれ単体で demo または検証できる           |
| prefactor 先 | prefactor が要るなら最初のスライスに置く                 |

### 被覆チェック

起草後、user story / acceptance criteria / FR 相当の要求単位を列挙し、どのスライスにも割り当てられていない単位を抽出する。取りこぼしを偽検出より重く扱い、疑わしい単位は未カバーに含める。未カバーは Phase 4 のプレビューに明示する。

## Phase 4: ユーザーに確認する

提案分解を番号付きリストで提示する。各スライスに以下を示す。

| 項目         | 内容                                     |
| ------------ | ---------------------------------------- |
| Title        | 短い説明的な名前                         |
| Blocked by   | 先に完了すべき他スライス (あれば)        |
| User stories | このスライスが満たす user story (あれば) |

次を問う。粒度は粗すぎず細かすぎないか。依存関係は正しいか。merge / split すべきスライスはあるか。未カバー単位をどう扱うか。扱いの選択肢は既存スライスへの割り当て / 新スライス / 理由付きの意図的除外。ユーザーが承認するまで反復する。

## Phase 5: issue を publish する

承認後、batch publish の前に AskUserQuestion で「これら N 件の issue を作成する?」と最終確認する。N 件作成は外向きで巻き戻しにくいため、確認なしの自動 publish はしない。

承認したら blocker を先にする依存順で publish する。"Blocked by" に実 issue 番号を書けるよう、blocker を先に作りその番号を捕捉する。各 issue は下記 template と Sandbox-Compatible Create を使う。triage label は付けない。AFK consumer 連携は対象外。親 issue は close も変更もしない。

## Issue Template

```markdown
## Parent

親 issue への参照 (ソースが既存 issue の場合のみ。無ければこのセクション省略)。

## What to build

この垂直スライスの簡潔な説明。レイヤーごとの実装手順でなく、端から端までの振る舞いを書く。具体的なファイルパスやコードスニペットは陳腐化が速いので避ける。例外は prototype が生んだ、散文より正確に決定を符号化する state machine / reducer / schema / 型のスニペットのみ。その場合は prototype 由来と一言添え、決定に効く部分だけに刈り込む。

## Acceptance criteria

- [ ] 基準 1
- [ ] 基準 2
- [ ] 基準 3

## Blocked by

- blocker チケットへの参照 (あれば)

blocker が無ければ "None - すぐ着手可能"。
```

## Language

${CLAUDE_SKILL_DIR}/../../settings.json の `language` を読み、issue 本文をその言語に翻訳する。未設定なら英語。技術用語 / コード / 識別子は翻訳しない。

## Sandbox-Compatible Create

```bash
cat > /tmp/claude/slice-body.md << 'EOF'
<body>
EOF
gh issue create --title "<title>" --body-file /tmp/claude/slice-body.md
mv /tmp/claude/slice-body.md ~/.Trash/ 2>/dev/null || true
```

複数スライスは依存順にこの手順を繰り返し、各 publish の出力から issue 番号を捕捉して後続の "Blocked by" に差し込む。

## Error Handling

| Error                | Action                                     |
| -------------------- | ------------------------------------------ |
| 計画ソース無し       | 何を分解するか AskUserQuestion で問う      |
| issue 参照が解決不可 | ref を報告して停止                         |
| No git repository    | "Not a git repo" を報告                    |
| gh auth failure      | auth エラーを報告                          |
| publish 途中失敗     | 作成済み番号を報告し、残りの再開可否を問う |

## Display Format

### Preview (Phase 4)

```markdown
## Slice 分解 (N 件)

1. <Title>
   - Blocked by: <slices or なし>
   - User stories: <ids or なし>

未カバー: <どのスライスにも載らない要求単位 or なし>
```

### Success

publish 済みを依存順に列挙する。

```markdown
Created (依存順):

- #<number> <title> (blocked by: #<n> | なし)
```
