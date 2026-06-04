---
name: issue
description: 構造化されたタイトルと本文で GitHub Issue を生成する。premise check と critic-design challenge で下書きの主張を投稿前に検証する。
when_to_use: Issue作って, Issue書いて, Issue作成, GitHub Issue
allowed-tools: Bash(gh:*) Bash(cat:*) Bash(mv:*) Bash(ugrep:*) Read Task AskUserQuestion
model: opus
argument-hint: "[issue description]"
---

# /issue - GitHub Issue 生成

## 入力

- Issue 説明: `$ARGUMENTS`
- `$ARGUMENTS` が空 → AskUserQuestion で説明を尋ねる
- 種別は説明から推定 (bug / feature / docs / chore)

## 実行

| Step | 動作                                                                           |
| ---- | ------------------------------------------------------------------------------ |
| 0    | `.claude/OUTCOME.md` を読む。不在なら stub を生成 (rules/core/OUTCOME.md 参照) |
| 1    | 説明から種別を検出 (Type Detection を参照)                                     |
| 2    | テンプレートを読む: ${CLAUDE_SKILL_DIR}/templates/<type>.md                    |
| 3    | テンプレートに従いタイトルと本文を生成                                         |
| 4    | 下書きした主張を premise check でフィルタ (Premise Check を参照)               |
| 5    | prose review で本文をインライン精査 (下記参照)                                 |
| 6    | critic-design で本文に反証、feature/bug のみ (Adversarial Challenge を参照)    |
| 7    | Issue プレビュー + 未確認前提 → AskUserQuestion: "Create this issue?"          |
| 8    | body-file で実行 (sandbox 互換)                                                |
| 9    | コマンド出力から Issue URL を取得                                              |

ユーザーが本文をそのまま指定している場合は Step 4-6 をスキップし、本文を無変更で投稿する。

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
| Bug     | bug, priority:\*     |
| Feature | enhancement, feature |
| Task    | task, chore          |

## 優先度

| ラベル            | 意味         |
| ----------------- | ------------ |
| priority:critical | 本番ダウン   |
| priority:high     | 重大な影響   |
| priority:medium   | 通常         |
| priority:low      | あれば嬉しい |

## Premise Check

本文に下書きした主張をフィルタする。調査フェーズではない: この check 内では agent を起動しない (このスキルで spawn するのは challenge ステップの critic-design のみ)。コードベース横断の audit、下書きした主張を超えた掘り下げも行わない。主張は 2-3 回の targeted probe で決着するか、provisional に降格するかの二択。確認のために調査を広げない。

| 主張の種類                                 | 動作                                                                                            |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| 現行コードの主張 (「X は今 Y している」)   | targeted な Read/ugrep probe 2-3 回で確認し、本文に根拠を併記 (「grep 確認済み」)               |
| probe 後もあいまいなままの主張             | provisional に降格: 断定せず、再確認マーカー付きで Premises に置く                              |
| ソースと矛盾が判明した主張                 | 本文をソースに合わせて書き直す。食い違い自体が重要なら (ユーザー報告 vs コード)、確認依頼付きで Premises に記す |
| 外部デザイン参照 (Figma, 設計 doc, 仕様書) | 常に未確認扱い。ソースが最新かはスキルには分からない。リンク + 「着手前に最新版を確認」を付ける |
| 対象ファイル一覧                           | 「調査時点の候補。着手時に再確認」と注記する                                                    |
| 本文中のコード例                           | 実装そのものでなく参考である旨を注記する: 「参考実装。最終形は着手時に判断」                    |

## Prose Review

文脈を共有しリンク先を開けるチームメイトに向けて書く。ゼロ文脈の読者向けではない。Issue が運ぶのは差分、背景はリンクが運ぶ。

### 構造 (Issue 固有)

| チェック          | 質問                                                                           |
| ----------------- | ------------------------------------------------------------------------------ |
| Problem stated    | 問題や要望が冒頭の 1-3 行で述べられているか                                    |
| Reproducible      | Bug: 再現手順が具体的か。Feature: ユースケースが具体的か                       |
| Expected outcome  | 期待される振る舞いが明示されており、読者の推測に任されていないか               |
| Reader action     | 求めるアクションが具体的か ("review spec", "investigate cause", "decide by X") |
| Scope             | 1 つの問題に集中しており、関連する懸念をまとめて投げ込んでいないか             |
| Outcome alignment | Outcome state に貢献するか。Non-goals に踏み込むなら body で明示的にフラグする |

### Anti-AI-pattern

| パターン           | シグナル                                                                                 | 修正                                                                                              |
| ------------------ | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Boilerplate opener | `This issue describes/reports/proposes...`                                               | 自己紹介でなく問題から始める                                                                      |
| Empty intensifier  | `comprehensive`, `robust`, `seamless`, `thorough`                                        | 削除するか具体 (件数、名前) に置換                                                                |
| Filler verb        | `leverage`, `utilize`, `facilitate`                                                      | `use`, `do`, `let` を使う                                                                         |
| Vague quantifier   | `various issues`, `multiple concerns`, `several bugs`                                    | 列挙するか件数を示す                                                                              |
| Hedge stacking     | `might potentially`, `could possibly`, `may perhaps`                                     | hedge は最大 1 つ、または断言する                                                                 |
| Filler phrase      | `It should be noted that...`, `Looking forward to your thoughts`, `Any feedback welcome` | 削除。事実を述べるか直接尋ねる                                                                    |
| Doc transcription  | リンク済み設計 doc の内容を Issue 内で再説明する                                         | リンク + 要点 1 行。差分だけ書く                                                                  |
| Repeated rationale | 同じ設計理由を 1 Issue 内で 2 回説明する                                                 | 決定が着地する箇所で 1 回だけ述べる                                                               |
| Bold overuse       | 太字が数行おきに散在する                                                                 | 構造は見出しに任せ、太字は警告のみ                                                                |
| Over-specified AC  | 受け入れ条件に書き方の詳細 (story 名, addon 設定) を列挙する                             | criterion は残し書き方の詳細を削る。UI コンポーネント issue では Storybook/a11y を DoD として残す |
| Compulsive section | 書くことがないのに optional セクションを埋める                                           | 空の optional セクションは省略する                                                                |

## Adversarial Challenge

feature/bug のみ。docs/chore はスキップ。下書きした本文を渡して critic-design を Task で直接 1 spawn する (/challenge は経由しない)。critic は Issue への反証 (隠れた前提、依存の見落とし、スコープ矛盾) を立てる役であり、gate ではない。最終判断は confirm 時のユーザーに残る。

| 入力フィールド   | マッピング                        |
| ---------------- | --------------------------------- |
| source           | /issue                            |
| artifact_type    | spec                              |
| approach         | What & Why セクション             |
| decisions        | Scope (In/Out) + Constraints      |
| trade-offs       | 明示されている trade-off があれば |
| referenced_files | 対象ファイル + 外部デザイン参照   |

| Verdict        | 扱い                                                                      |
| -------------- | ------------------------------------------------------------------------- |
| confirmed      | プレビューへ進む                                                          |
| weakened       | 受け入れた指摘は本文に反映。残りはプレビューで ephemeral な批評として提示 |
| needs_revision | 本文を 1 回だけ修正する。再 spawn はしない                                |

critic の指摘は Issue 本文には決して入れない。confirm 時のレビュー材料であり、プレビューで反映するか却下するかを決める。本文の Premises セクションは真に検証不能な依存 (デザイン参照、provisional な主張) 専用に保ち、人間の書き方と揃える。

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

### Unverified premises (N)

- <主張>: <読者が確認すべきこと>

### Critic findings (not posted)

- <指摘>: 本文に反映するか却下する
```

未確認ブロックは本文 Premises セクションの写しであり、プレビュー時に新規内容を足さない。載せるのは外部デザイン参照と provisional な主張のみ。確認済みの主張は本文中の根拠併記に留め、ここで繰り返さない。未確認 0 件ならブロックごと省略。短く保つ。

critic ブロック: 空のとき (docs/chore、または verdict が confirmed) は省略する。

### 成功

Created: `#<number>` <title> <issue URL>
