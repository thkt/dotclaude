---
name: issue
description: 構造化されたタイトルと本文で GitHub Issue を生成する。
when_to_use: Issue作って, Issue書いて, Issue作成, GitHub Issue
allowed-tools: Bash(gh:*) Bash(cat:*) Bash(mv:*) Read AskUserQuestion
model: opus
argument-hint: "[issue description]"
---

# /issue - GitHub Issue 生成

## 入力

- Issue 説明: `$ARGUMENTS`
- `$ARGUMENTS` が空 → AskUserQuestion で説明を尋ねる
- 種別は説明から推定 (bug / feature / docs / chore)

## 実行

| Step | 動作                                                        |
| ---- | ----------------------------------------------------------- |
| 1    | 説明から種別を検出 (Type Detection を参照)                  |
| 2    | テンプレートを読む: ${CLAUDE_SKILL_DIR}/templates/<type>.md |
| 3    | テンプレートに従いタイトルと本文を生成                      |
| 4    | prose review で本文をインライン精査 (下記参照)              |
| 5    | Issue プレビュー → AskUserQuestion: "Create this issue?"   |
| 6    | body-file で実行 (sandbox 互換)                             |
| 7    | コマンド出力から Issue URL を取得                           |

## 種別判定

| 種別    | プレフィックス | 用途                                     |
| ------- | -------------- | ---------------------------------------- |
| bug     | [Bug]          | 既存のものが壊れているか期待通り動かない |
| feature | [Feature]      | 新しい能力や拡張要望                     |
| docs    | [Docs]         | ドキュメント追加や訂正                   |
| chore   | [Chore]        | メンテナンス、設定、依存更新             |

判別不能な場合は `feature` をデフォルトとする。

## 言語

${CLAUDE_SKILL_DIR}/../../settings.json から `language` を読み、その言語で Issue 本文を翻訳する。未設定なら英語をデフォルト。技術用語、コード、識別子は翻訳しない。

## テンプレート

| 種別    | テンプレート                             |
| ------- | ---------------------------------------- |
| bug     | ${CLAUDE_SKILL_DIR}/templates/bug.md     |
| feature | ${CLAUDE_SKILL_DIR}/templates/feature.md |
| docs    | ${CLAUDE_SKILL_DIR}/templates/docs.md    |
| chore   | ${CLAUDE_SKILL_DIR}/templates/chore.md   |

## ラベル

| 種別    | ラベル               |
| ------- | -------------------- |
| Bug     | bug, priority:*      |
| Feature | enhancement, feature |
| Task    | task, chore          |

## 優先度

| ラベル            | 意味         |
| ----------------- | ------------ |
| priority:critical | 本番ダウン   |
| priority:high     | 重大な影響   |
| priority:medium   | 通常         |
| priority:low      | あれば嬉しい |

## Prose Review

### 構造 (Issue 固有)

| チェック         | 質問                                                                           |
| ---------------- | ------------------------------------------------------------------------------ |
| Problem stated   | 問題や要望が冒頭の 1-3 行で述べられているか                                    |
| Reproducible     | Bug: 再現手順が具体的か。Feature: ユースケースが具体的か                       |
| Expected outcome | 期待される振る舞いが明示されており、読者の推測に任されていないか               |
| Reader action    | 求めるアクションが具体的か ("review spec", "investigate cause", "decide by X") |
| Scope            | 1 つの問題に集中しており、関連する懸念をまとめて投げ込んでいないか             |

### Anti-AI-pattern

| パターン           | シグナル                                                                                 | 修正                               |
| ------------------ | ---------------------------------------------------------------------------------------- | ---------------------------------- |
| Boilerplate opener | `This issue describes/reports/proposes...`                                               | 自己紹介でなく問題から始める       |
| Empty intensifier  | `comprehensive`, `robust`, `seamless`, `thorough`                                        | 削除するか具体 (件数、名前) に置換 |
| Filler verb        | `leverage`, `utilize`, `facilitate`                                                      | `use`, `do`, `let` を使う          |
| Vague quantifier   | `various issues`, `multiple concerns`, `several bugs`                                    | 列挙するか件数を示す               |
| Hedge stacking     | `might potentially`, `could possibly`, `may perhaps`                                     | hedge は最大 1 つ、または断言する  |
| Filler phrase      | `It should be noted that...`, `Looking forward to your thoughts`, `Any feedback welcome` | 削除。事実を述べるか直接尋ねる     |

## Sandbox 互換の作成

```bash
cat > /tmp/claude/issue-body.md << 'EOF'
<body>
EOF
gh issue create --title "<title>" --body-file /tmp/claude/issue-body.md
mv /tmp/claude/issue-body.md ~/.Trash/ 2>/dev/null || true
```

## エラー処理

| エラー               | 動作                    |
| -------------------- | ----------------------- |
| 説明なし             | 説明を尋ねる            |
| テンプレート未検出   | デフォルト形式を使う    |
| Git リポジトリでない | "Not a git repo" を報告 |
| gh 認証失敗          | 認証エラーを報告        |

## 表示形式

### プレビュー

```markdown
## Issue Preview

> <title>

### Body

<body content>
```

### 成功

Created: `#<number>` <title> <issue URL>
