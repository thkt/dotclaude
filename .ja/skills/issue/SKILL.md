---
name: issue
description: 構造化されたタイトルと本文でGitHub Issueを生成。
when_to_use: Issue作って, Issue書いて, Issue作成, GitHub Issue
allowed-tools: Bash(gh:*) Bash(cat:*) Bash(mv:*) Read AskUserQuestion
model: sonnet
argument-hint: "[Issue説明]"
---

# /issue - GitHub Issue生成

## 入力

- Issue説明: `$ARGUMENTS`
- `$ARGUMENTS`が空の場合 → AskUserQuestionでIssue説明を要求
- タイプは説明から推論（bug / feature / docs / chore）

## 実行

| Step | アクション                                                       |
| ---- | ---------------------------------------------------------------- |
| 1    | 説明からtypeを判定（Type Detection 参照）                        |
| 2    | テンプレート読込: ${CLAUDE_SKILL_DIR}/templates/<type>.md        |
| 3    | テンプレートに従ってタイトル + 本文を生成                         |
| 4    | 文章レビュー（下記参照）で body をインラインで修正                |
| 5    | Issueプレビュー → AskUserQuestion: "このIssueを作成する？"       |
| 6    | body-file経由で実行（sandbox互換）                                |
| 7    | コマンド出力からIssue URLを取得                                   |

## Type Detection

| Type      | Prefix    | 用途                                              |
| --------- | --------- | ------------------------------------------------- |
| `bug`     | [Bug]     | 既存のものが壊れている、期待通り動かない          |
| `feature` | [Feature] | 新しい能力・機能拡張の依頼                        |
| `docs`    | [Docs]    | ドキュメントの追加・修正                          |
| `chore`   | [Chore]   | メンテナンス・設定・依存更新                      |

不明な場合は `feature` をデフォルトとする。

## 言語

`~/.claude/settings.json` の `language` を読み、Issue本文をその言語に翻訳する。未設定なら英語をデフォルトとする。技術用語・コード・識別子は翻訳しない。

## テンプレート

| Type    | テンプレート                              |
| ------- | ----------------------------------------- |
| bug     | ${CLAUDE_SKILL_DIR}/templates/bug.md      |
| feature | ${CLAUDE_SKILL_DIR}/templates/feature.md  |
| docs    | ${CLAUDE_SKILL_DIR}/templates/docs.md     |
| chore   | ${CLAUDE_SKILL_DIR}/templates/chore.md    |

## ラベル

| Type    | ラベル                   |
| ------- | ------------------------ |
| Bug     | `bug`, `priority:*`      |
| Feature | `enhancement`, `feature` |
| Task    | `task`, `chore`          |

## 優先度

| ラベル              | 意味             |
| ------------------- | ---------------- |
| `priority:critical` | プロダクション停止 |
| `priority:high`     | 大きな影響       |
| `priority:medium`   | 通常             |
| `priority:low`      | あれば嬉しい     |

## 文章レビュー

### 構造（Issue向け）

| チェック項目       | 問い                                                                 |
| ------------------ | -------------------------------------------------------------------- |
| 問題提起           | 問題・要望が1〜3行で冒頭に書かれているか                             |
| 再現性             | bug: 再現手順が具体的か。feature: ユースケースが具体的か             |
| 期待結果           | 期待する挙動が明示されているか。読み手に推測させていないか           |
| 読み手のアクション | 依頼が具体的か（「仕様レビューしてほしい」「原因を調査してほしい」） |
| スコープ           | 1つの問題に絞られているか。関連する複数の懸念を詰め込んでいないか    |

### AIパターン検出

| パターン           | シグナル                                                                                 | 修正                                         |
| ------------------ | ---------------------------------------------------------------------------------------- | -------------------------------------------- |
| Boilerplate opener | `This issue describes/reports/proposes...`                                               | 問題や要望から書き始める。自己言及で始めない |
| Empty intensifier  | `comprehensive`, `robust`, `seamless`, `thorough`                                        | 削除または具体（件数・名称）に置換           |
| Filler verb        | `leverage`, `utilize`, `facilitate`                                                      | `use`, `do`, `let` を使う                    |
| Vague quantifier   | `various issues`, `multiple concerns`, `several bugs`                                    | 列挙するか数える                             |
| Hedge stacking     | `might potentially`, `could possibly`, `may perhaps`                                     | ヘッジは1回まで、または断言                  |
| Filler phrase      | `It should be noted that...`, `Looking forward to your thoughts`, `Any feedback welcome` | 削除。事実を述べるか、具体的に依頼する       |

## Sandbox互換な作成

```bash
cat > /tmp/claude/issue-body.md << 'EOF'
<body>
EOF
gh issue create --title "<title>" --body-file /tmp/claude/issue-body.md
mv /tmp/claude/issue-body.md ~/.Trash/ 2>/dev/null || true
```

## エラー処理

| エラー              | アクション                       |
| ------------------- | -------------------------------- |
| 説明なし            | 説明を要求                       |
| テンプレ未発見      | デフォルトフォーマットを使用     |
| Gitリポジトリでない | "Gitリポジトリではない" を報告   |
| gh認証失敗          | 認証エラーを報告                 |

## 表示形式

### プレビュー

```markdown
## Issueプレビュー

> <title>

### Body

<body content>
```

### 成功

作成完了: `#<number>` <title> <issue URL>
