---
name: slice
description: 計画 / spec / PRD を独立して着手可能な tracer-bullet 垂直スライス issue 群に分解し、依存順で GitHub に公開する。各 issue は全レイヤーを貫く 1 本の細い縦串。
when_to_use: 計画を issue に分解, plan を issue 化, spec を issue 群に, vertical slice, tracer bullet, issue 分割, slice
allowed-tools: Bash(gh:*) Bash(cat:*) Bash(mv:*) Bash(ugrep:*) Bash(bfs:*) Read LS Task AskUserQuestion
model: opus
argument-hint: "[plan / spec / PRD / issue ref]"
---

# /slice - 計画を垂直スライス issue に分解

計画を独立して着手可能な issue 群へ分解する。各 issue は tracer bullet、つまり schema / API / UI / test の全レイヤーを端から端まで貫く 1 本の細い縦串で、単独で demo または検証できる。

## 入力

`$ARGUMENTS` から計画のソースを取る。issue 参照 (番号 / URL / パス) なら `gh issue view <N>` で本文とコメントを取得する。空ならまず会話文脈にある計画を使い、無ければ何を分解するか AskUserQuestion で問う。

## 他スキルとの区別

| スキル                     | 産物                                 | 媒体 / タイミング            |
| -------------------------- | ------------------------------------ | ---------------------------- |
| /slice (これ)              | 依存順の永続 GitHub issue 群         | 後で人間が拾うためのキュー   |
| /issue                     | 単一 issue (premise + critic 検証)   | 1 件の要求を起票する         |
| architect-feature + /swarm | session 内の一時的並列実装 blueprint | 今すぐ並列実装するための設計 |

/slice は分解と依存順 publish が価値。1 件だけなら /issue を使う。今すぐ実装するなら /swarm を使う。

## Phase 1: 文脈を集める

会話文脈にある計画から作業する。`$ARGUMENTS` に issue 参照があれば本文とコメントを読む。

## Phase 2: コードベース探索 (任意)

未探索なら現状を把握する。issue のタイトル / 説明はプロジェクトの用語集に従い、触る領域の ADR を尊重する。実装を楽にする prefactor の機会を探す ("変更を楽にしてから、楽な変更をする")。横断的な探索が要るときだけ Explore エージェントを 1 体起動する。per-slice の spawn はしない。

## Phase 3: 垂直スライスを起草する

計画を tracer bullet issue に割る。横スライス (1 レイヤーだけ) ではなく縦スライス。

| ルール       | 内容                                                     |
| ------------ | -------------------------------------------------------- |
| 全レイヤー   | 各スライスは全レイヤー (schema / API / UI / test) を貫く |
| 単独検証可能 | 完了スライスはそれ単体で demo または検証できる           |
| prefactor 先 | prefactor が要るなら最初のスライスに置く                 |

## Phase 4: ユーザーに確認する

提案分解を番号付きリストで提示する。各スライスに以下を示す。

| 項目         | 内容                                     |
| ------------ | ---------------------------------------- |
| Title        | 短い説明的な名前                         |
| Blocked by   | 先に完了すべき他スライス (あれば)        |
| User stories | このスライスが満たす user story (あれば) |

次を問う。粒度は妥当か (粗すぎ / 細かすぎ)。依存関係は正しいか。merge / split すべきスライスはあるか。ユーザーが承認するまで反復する。

## Phase 5: issue を publish する

承認後、batch publish の前に AskUserQuestion で最終確認する ("これら N 件の issue を作成する?")。N 件作成は外向きで巻き戻しにくいため、確認なしの自動 publish はしない。

承認したら依存順 (blocker 先) に publish する。"Blocked by" に実 issue 番号を書けるよう、blocker を先に作りその番号を捕捉する。各 issue は下記 template と Sandbox-Compatible Create を使う。triage label は付けない (AFK consumer 連携は対象外)。親 issue は close も変更もしない。

## Issue Template

```markdown
## Parent

親 issue への参照 (ソースが既存 issue の場合のみ。無ければこのセクション省略)。

## What to build

この垂直スライスの簡潔な説明。レイヤーごとの実装手順でなく、端から端までの振る舞いを書く。具体的なファイルパスやコードスニペットは陳腐化が速いので避ける。例外は prototype が生んだ、散文より正確に決定を符号化するスニペット (state machine / reducer / schema / 型) のみ。その場合は prototype 由来と一言添え、決定に効く部分だけに刈り込む。

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
```

### Success

publish 済みを依存順に列挙する。

```markdown
Created (依存順):

- #<number> <title> (blocked by: #<n> | なし)
```
