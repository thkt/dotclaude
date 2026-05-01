---
paths:
  - ".claude/skills/**"
---

# Skill Conventions

`.claude/skills/` 配下の skill ファイルに対する規約。

## YAML Frontmatter

```yaml
---
name: skill-name               # lowercase-hyphens, ≤64 chars
description: Brief summary.    # ≤1024 chars
when_to_use: scenario, keyword1, キーワード
allowed-tools: Read Write      # space-separated
agent: agent-name              # Optional: agents/ にリンク
context: fork                  # Optional: fork = sub-agent, inline = main
user-invocable: false          # Optional: デフォルト false
---
```

## description と triggers

| フィールド  | 要件                    |
| ----------- | ----------------------- |
| description | 三人称のみ              |
| when_to_use | 英語/日本語のトリガー句 |

## 命名

カテゴリ別に選ぶ。

| `user-invocable` | バインド   | パターン              | 例                                                  |
| ---------------- | ---------- | --------------------- | --------------------------------------------------- |
| `true`           | -          | 短縮名                | `commit`, `fix`, `audit`                            |
| `false`          | CLI ラップ | `use-cli-<cli>`       | `use-cli-yomu`, `use-cli-recall`                    |
| `false`          | Agent 専用 | `use-context-<agent>` | `use-context-reviewer-security`                     |
| `false`          | Workflow   | `use-workflow-<noun>` | `use-workflow-code`, `use-workflow-spec-validation` |
| any              | 避ける     | -                     | `helper`, `utils`, `tools`                          |

## ディレクトリ構造

```text
skill-name/
├── SKILL.md (required)
└── references/ (optional)
    └── detailed-guide.md
```

Claude は SKILL.md を最初に読み、必要なときだけ references を読む。

## 参照記法

SKILL.md, scripts/, templates/, references/ ファイル内の参照パスは markdown リンクではなく、ベアな `${CLAUDE_SKILL_DIR}` 置換を使う。

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

| ルール                | 閾値   | アクション                  |
| --------------------- | ------ | --------------------------- |
| SKILL.md 本文         | 500 行 | リファレンス ファイルに分割 |
| リファレンス ファイル | 200 行 | トピックでの分割を検討      |
