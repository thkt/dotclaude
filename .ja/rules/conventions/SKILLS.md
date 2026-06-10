---
paths:
  - ".claude/skills/**"
---

# Skill Conventions

`.claude/skills/` 配下の skill ファイルに対する規約。

## YAML Frontmatter

```yaml
---
name: skill-name # lowercase-hyphens, ≤64 chars
description: Brief summary. # ≤1024 chars, 三人称
when_to_use: scenario, keyword1, キーワード # 英語/日本語のトリガー句
allowed-tools: Read Write # space-separated
agent: agent-name # Optional: agents/ にリンク
context: fork # Optional: fork = sub-agent, inline = main
user-invocable: false # Optional: デフォルト true (false は / メニュー非表示、内部 skill 用)
---
```

## 命名

カテゴリ別に選ぶ。

| user-invocable | バインド   | パターン              | 例                                              |
| -------------- | ---------- | --------------------- | ----------------------------------------------- |
| true           | -          | 短縮名                | commit, fix, audit                              |
| false          | CLI ラップ | `use-cli-<cli>`       | use-cli-recall, use-cli-scout                   |
| false          | Agent 専用 | `use-context-<agent>` | use-context-reviewer-security                   |
| false          | Workflow   | `use-workflow-<noun>` | use-workflow-code, use-workflow-spec-validation |
| any            | 避ける     | -                     | helper, utils, tools                            |

## ディレクトリ構造

```text
skill-name/
├── SKILL.md (required)
└── references/ (optional)
    └── detailed-guide.md
```

Claude は SKILL.md を最初に読み、必要なときだけ references を読む。

## 参照記法

SKILL.md, scripts/, templates/, references/ 内の参照パスはベアな `${CLAUDE_SKILL_DIR}` 置換で書く。

| 形式                                            | 用途         | 理由                                                                          |
| ----------------------------------------------- | ------------ | ----------------------------------------------------------------------------- |
| `${CLAUDE_SKILL_DIR}/references/foo.md` (bare)  | 常用         | ハーネスが変数を絶対パスに展開する。Read ツールが直接解決                     |
| `${CLAUDE_SKILL_DIR}/../<dir>/foo.md` (sibling) | クロス skill | ハーネスが展開し、Read が `..` を正規化する。skills 横断の `_lib/` 共有に使う |
| `[references/foo.md](references/foo.md)` (link) | 不可         | ハーネスは markdown リンクを展開しない。AI が相対パスを推論する必要がある     |
| `` `${CLAUDE_SKILL_DIR}/references/foo.md` ``   | 避ける       | バッククォート内のハーネス挙動は未文書。安全のため省く                        |

## 引数変数

Skill 入力引数は起動時に展開される。

| 変数            | 戻り値                     | 例 (args=`alpha beta gamma`) |
| --------------- | -------------------------- | ---------------------------- |
| `$ARGUMENTS`    | 全引数文字列               | `alpha beta gamma`           |
| `$ARGUMENTS[N]` | `split(' ')[N]` (0 始まり) | `[0]`=`alpha`, `[1]`=`beta`  |
| `$N`            | `$ARGUMENTS[N]` の短縮形   | `$0`=`alpha`, `$1`=`beta`    |

| ユースケース                   | 使う            |
| ------------------------------ | --------------- |
| 複数語の自由テキストを取り込む | `$ARGUMENTS`    |
| 最初の語を明示的に取得         | `$ARGUMENTS[0]` |

## サイズ制限

| ルール               | 閾値   | アクション                 |
| -------------------- | ------ | -------------------------- |
| SKILL.md 本文        | 200 行 | リファレンスファイルに分割 |
| リファレンスファイル | 200 行 | トピックでの分割を検討     |

## Craft

frontmatter とサイズ規約を超えた品質軸。skill は機械的ルールを全て満たしても読みにくくなり得る。

| 軸                         | 合格条件                                                                             | 不合格サイン                                            |
| -------------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------- |
| 単一責務                   | 1 skill 1 タスク。無関係な 2 つ目のトリガーは分割サイン                              | description が無関係な機能を 2 つ以上連結               |
| description の識別性       | 1 文目が capability を名指し、description だけで agent が兄弟 skill と区別して選べる | 多くの skill に当てはまる汎用動詞 (helps with, manages) |
| 命令形                     | 本文が agent に直接命令する                                                          | skill が何をするかの受動的説明                          |
| 検証可能な完了             | step が検証可能な条件と明示的な stop point (Do not proceed until X) で終わる         | done 状態が無い、または「うまくやる」止まり             |
| 具体的なキャリブレーション | 判断ごとに Good/Bad ペア、Yes/Not 対比、数値閾値のいずれか 1 つ                      | ルールが抽象的で例が無い                                |
| progressive disclosure     | SKILL.md は薄く保ち、詳細は references/ に置く                                       | references/ に置くべき内容の inline 詰め込み            |
