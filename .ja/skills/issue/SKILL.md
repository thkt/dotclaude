---
name: issue
description: 構造化されたタイトルと本文で GitHub Issue を生成する。premise check と critic-design challenge で下書きの主張を投稿前に検証する。
when_to_use: Issue作って, Issue書いて, Issue作成, GitHub Issue
allowed-tools: Bash(gh:*) Bash(cat:*) Bash(mv:*) Bash(ugrep:*) Read Task AskUserQuestion
model: opus
argument-hint: "[issue description]"
---

# /issue - GitHub Issue 生成

構造化されたタイトルと本文で GitHub Issue を生成し、premise check と critic-design challenge で下書きの主張を投稿前に検証する。

## 入力

`$ARGUMENTS` は Issue 説明。空なら AskUserQuestion で説明を尋ねる。種別は説明から推定する (bug / feature / docs / chore)。

## 実行

ユーザーが本文をそのまま指定している場合は前提チェック・文章レビュー・Adversarial Challenge をスキップし、本文を無変更で投稿する。

1. `.claude/OUTCOME.md` を読む。不在なら /outcome で stub を生成
2. 説明から種別を検出 (§ 種別判定)
3. テンプレートを読む: ${CLAUDE_SKILL_DIR}/templates/<type>.md
4. テンプレートに従いタイトルと本文を生成し、確定/仮をマーク (§ 確信度マーキング)
5. 下書きした主張を前提チェックでフィルタ (§ 前提チェック)
6. `${CLAUDE_SKILL_DIR}/references/prose-review.md` の基準で本文をインライン精査
7. critic-design で本文に反証、feature/bug のみ (§ Adversarial Challenge)
8. Issue プレビュー + 仮項目 → AskUserQuestion: "Create this issue?"
9. body-file で実行 (sandbox 互換)
10. コマンド出力から Issue URL を取得

## 種別判定

判別不能な場合は `feature` をデフォルトとする。

| 種別    | プレフィックス | 用途                                     |
| ------- | -------------- | ---------------------------------------- |
| bug     | [Bug]          | 既存のものが壊れているか期待通り動かない |
| feature | [Feature]      | 新しい能力や拡張要望                     |
| docs    | [Docs]         | ドキュメント追加や訂正                   |
| chore   | [Chore]        | メンテナンス、設定、依存更新             |

## 言語

`${CLAUDE_SKILL_DIR}/../../settings.json` から `language` を読み、その言語で Issue 本文とテンプレートを翻訳する。未設定なら英語をデフォルト。技術用語、コード、識別子は翻訳しない。

## ラベル

| 種別    | ラベル               |
| ------- | -------------------- |
| Bug     | bug, priority:\*     |
| Feature | enhancement, feature |
| Task    | task, chore          |

Bug の `priority:*` は次のいずれかを付ける。

| ラベル            | 意味         |
| ----------------- | ------------ |
| priority:critical | 本番ダウン   |
| priority:high     | 重大な影響   |
| priority:medium   | 通常         |
| priority:low      | あれば嬉しい |

## 確信度マーキング

本文のどの部分が確定でどの部分が仮かをマークし、実装者が「守るべき要件」と「磨き直す出発点」を区別できるようにする。生成時に適用する。検証パスではなく、default-direction はコードベースを走査せず自身で決まる。

| 由来                                                                             | 状態 | 記法                         |
| -------------------------------------------------------------------------------- | ---- | ---------------------------- |
| ユーザーが決めた、または ask そのもの (WHAT, AC, 明示的な Scope/Constraints)     | 確定 | 無印                         |
| AI が推論した HOW (配置、方針、フォーマット)、またはユーザーが残した未決定の判断 | 仮   | `(仮: <着手時のアクション>)` |

マーカー語は言語設定に従う (英語では `tentative`)。

控えめにマークし、実装者のアクションが変わる箇所だけに付ける。全行に注釈を付けると Anti-AI-pattern (Hedge stacking, Compulsive section) と衝突する。すべて確定の本文にはマークが付かない。

仮マークは対象の項目にインラインで置く。Premises セクションは特定行に紐づかない issue レベルの前提 (デザイン参照、全体的な仮定) 専用に保つ。前提チェックの provisional 降格も同じマーカーを出し、アクション句だけで区別する。

| なぜ仮か                                           | アクション句                                  |
| -------------------------------------------------- | --------------------------------------------- |
| 決定が未確定 (AI がもっともらしいデフォルトを推論) | 「着手時に判断」/「より良い案があれば変更可」 |
| 事実が未検証 (前提チェックから引き継ぎ)            | 「着手時に再確認」                            |

## 前提チェック

本文に下書きした主張をフィルタする。調査フェーズではない。この check 内では agent を起動せず (spawn するのは challenge ステップの critic-design のみ)、コードベース横断の audit や下書きした主張を超えた掘り下げも行わない。主張は 2-3 回の targeted probe で決着するか、provisional に降格するかの二択。

| 主張の種類                                 | 動作                                                                                                            |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| 現行コードの主張 (「X は今 Y している」)   | targeted な Read/ugrep probe 2-3 回で確認し、本文に根拠を併記 (「grep 確認済み」)                               |
| probe 後もあいまいなままの主張             | provisional に降格: 断定せず、再確認マーカー付きでインラインにマーク (issue レベルなら Premises)                |
| ソースと矛盾が判明した主張                 | 本文をソースに合わせて書き直す。食い違い自体が重要なら (ユーザー報告 vs コード)、確認依頼付きで Premises に記す |
| 外部デザイン参照 (Figma, 設計 doc, 仕様書) | 常に未確認扱い。ソースが最新かはスキルには分からない。リンク + 「着手前に最新版を確認」を付ける                 |
| 対象ファイル一覧                           | 「調査時点の候補。着手時に再確認」と注記する                                                                    |
| 本文中のコード例                           | 実装そのものでなく参考である旨を注記する: 「参考実装。最終形は着手時に判断」                                    |

## Adversarial Challenge

feature/bug のみ。docs/chore はスキップ。下書きした本文を渡して critic-design を Task で直接 1 spawn する (/challenge は経由しない)。critic は Issue への反証 (隠れた前提、依存の見落とし、スコープ矛盾) を立てる役であり、gate ではない。最終判断は confirm 時のユーザーに残る。

critic の指摘は Issue 本文には決して入れない。confirm 時のレビュー材料であり、プレビューで反映するか却下するかを決める。

| 入力フィールド   | マッピング                              |
| ---------------- | --------------------------------------- |
| source           | /issue                                  |
| artifact_type    | spec                                    |
| approach         | What & Why セクション                   |
| decisions        | Scope (In/Out) + Constraints + Approach |
| trade-offs       | 明示されている trade-off があれば       |
| referenced_files | 対象ファイル + 外部デザイン参照         |

| Verdict        | 扱い                                                                      |
| -------------- | ------------------------------------------------------------------------- |
| confirmed      | プレビューへ進む                                                          |
| weakened       | 受け入れた指摘は本文に反映。残りはプレビューで ephemeral な批評として提示 |
| needs_revision | 本文を 1 回だけ修正する。再 spawn はしない                                |

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

### Tentative items (N)

- <項目>: <着手時のアクション>

### Critic findings (not posted)

- <指摘>: 本文に反映するか却下する
```

仮ブロックは本文中のインライン仮マークと Premises セクションを集約する。新規内容は足さず本文が持つものを写し、短く保つ。仮項目が 0 件ならブロックごと省略。critic ブロックは空のとき (docs/chore、または verdict が confirmed) は省略する。

### 成功

Created: `#<number>` <title> <issue URL>
