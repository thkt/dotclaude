---
name: audit-skill-craft
description: SKILL.md を craft 軸 (単一責務、description の識別性、命令形、検証可能な完了、キャリブレーション、progressive disclosure) で判定し、監査が surface した修正を適用。format 有無チェックには使わない (reviewer-prompt)、再現性ループには使わない (/tuning)。
when_to_use: スキルの書き味, skill craft, スキル品質監査, SKILL.md 監査, skill audit, 書き味判定, mattpocock パターン, スキル整形
allowed-tools: Read Write Edit LS Bash(ugrep:*) Bash(bfs:*) Bash(git:*) Task AskUserQuestion
model: opus
argument-hint: "[skill-path]"
---

# /audit-skill-craft - Skill Craft Auditor

rules/conventions/SKILLS.md の craft 軸と MARKDOWN.md の format ルールに照らして SKILL.md を判定し、監査が surface した修正を適用する。reviewer-prompt の format 有無判定に、craft 品質判定と in-place 修正を組み合わせる。

## When to Use

- SKILL.md は動くが読みにくい、肥大している、または description が曖昧
- 外部 collection から取り込んだ skill を本規約に変換する必要がある
- 新規作成した skill を commit 前に craft の観点で点検したい

## Distinction

prompt ファイルに触れるツールは 4 つ。この table が境界を引き、監査が重複を避ける。

| Tool                     | スコープ                                                | ファイル編集        |
| ------------------------ | ------------------------------------------------------- | ------------------- |
| audit-skill-craft (this) | SKILL.md の craft 品質と、surface した format 修正      | あり (Edit)         |
| reviewer-prompt          | format 有無 (bold、frontmatter フィールド、prose→table) | なし (read-only)    |
| tuning                   | fresh subagent による経験的再現性ループ                 | あり (1 patch/iter) |
| polish                   | 任意ファイルの汎用 AI-slop 除去                         | あり                |

## Input

`$ARGUMENTS` は skill パスと任意フラグを含み得る。使用前に解決する。

- 空白で split; 非フラグの token が skill パス、空文字列は auto-detect
- SKILL.md またはその親ディレクトリへのパスを受け付ける。ディレクトリは SKILL.md に解決
- auto-detect 順序: `git status` で最も最近変更された `skills/*/SKILL.md`、次に mtime
- `--no-format` は Step 4 の reviewer-prompt spawn を skip し craft のみで判定
- 未知のフラグは黙って無視せず明示エラーで reject
- 解決したファイルが SKILL.md でなければ理由付きで abort

## Execution

| Step | アクション                                                                     |
| ---- | ------------------------------------------------------------------------------ |
| 1    | 対象 SKILL.md を解決 (auto-detect or `$ARGUMENTS`)                             |
| 2    | 判定基準をロード: SKILLS.md の Craft 軸 + MARKDOWN.md の format ルール         |
| 3    | 対象を 6 つの craft 軸で判定; 各 verdict を line 根拠付きで記録                |
| 4    | format finding のため reviewer-prompt を Task で spawn (`--no-format` で skip) |
| 5    | craft + format finding を統合; 各修正を mechanical か judgment に分類          |
| 6    | mechanical 修正を Edit で適用; judgment 修正は確認のため提示                   |
| 7    | ファイルを再読; 失敗していた軸が pass し新たな違反が無いことを検証             |
| 8    | 軸・verdict・適用修正の summary table を出力                                   |

### Step 3: Craft Judgment

SKILLS.md の Craft section の 6 軸で判定する。各軸について pass/fail と verdict を引いた line を記録。パターン詳細と Good/Bad ペアは ${CLAUDE_SKILL_DIR}/references/mattpocock-patterns.md にある。

### Step 5: Fix Classification

mechanical 修正は意味を保つ; judgment 修正は語句や構造を変える。judgment 修正は提案テキストとして surface し、確認されたものだけ適用する。

| Class      | 例                                                            | 扱い               |
| ---------- | ------------------------------------------------------------- | ------------------ |
| Mechanical | bold→table、pseudo-heading→heading、末尾 summary 削除、filler | Edit で適用        |
| Judgment   | description 書き換え、責務分割、stop condition 追加           | 提案; 確認後に適用 |

### Step 6: Responsibility Split

軸が無関係な責務を 2 つ以上 flag したら、黙って統合や分割をしない。分割境界を提示し、兄弟 skill に分割するか、例外を記録して現状維持するかを AskUserQuestion で尋ねる。

### Step 7: Dogfood Verification

編集後のファイルを再読する。失敗していた全軸が pass し、どの修正も新たな MARKDOWN.md 違反を導入していないことを確認。違反を別の違反と交換する修正は未完了。

## Output

- mechanical 修正と確認済み judgment 修正を適用した SKILL.md
- コンソール summary: 軸ごとの verdict、適用した修正、保留した提案
- 別レポートファイルは作らない; diff が成果物

## Out of Scope

- skill のゼロからの作成 (先に SKILL.md を書き、それから監査)
- reference ファイルのドメイン内容 (craft 軸は SKILL.md の構造が対象)

## Acceptance Criteria

- [ ] 対象 SKILL.md を解決し存在を確認
- [ ] 6 つの craft 軸すべてを line 根拠付きで判定
- [ ] mechanical 修正を適用; judgment 修正は確認・適用済みか保留として記録
- [ ] 編集後ファイルが新たな MARKDOWN.md 違反を導入しない (dogfood 再読)
- [ ] summary が全軸の verdict を列挙
