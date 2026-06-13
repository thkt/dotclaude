---
name: challenge
description: 提案、設計、計画、分析を 2 フェーズで challenge する。Phase 1 は 1 問ずつインタビューで前提と trade-off を引き出す grill。Phase 2 は引き出した素材を critic-design に渡して devil's advocate spawn する。コードレビュー findings には使わない (/audit を使用)。outcome assertion にも使わない (/assert に組み込み adversarial testing がある)。
when_to_use: devils advocate, 反論, チャレンジ, challenge, 叩いて, 穴探し, 質問攻め, 詰めて, grill me, 壁打ち
allowed-tools: Read LS Task Bash(ugrep:*) Bash(bfs:*) AskUserQuestion
model: opus
argument-hint: "[proposal file | description]"
---

# /challenge

2 フェーズ challenge。Phase 1 で grill、Phase 2 で critic-design を spawn する。

## 入力

- `$ARGUMENTS`: challenge 対象 (proposal ファイルパスまたは記述)
- `$ARGUMENTS` が空: 停止して対象指定をユーザーに求める。会話からの暗黙的対象推論は誤射リスクが高い。

## Phase 1 Grill

1 問ずつ質問する。各質問には推奨回答を含め、AskUserQuestion の最上位選択肢として提示する。設計ツリーの各分岐を辿り、依存関係を 1 つずつ解決していく。

### ルール

| ルール             | 詳細                                                                                                      |
| ------------------ | --------------------------------------------------------------------------------------------------------- |
| コードで分かる質問 | 答えがコードにあるなら ugrep / bfs で確認、ユーザーには聞かない                                           |
| 質問数上限         | フェーズ全体で 7 問まで。上限到達時に未解決分岐があれば、未解決セットを要約してユーザーに継続判断を求める |
| 終了条件           | 全分岐解決、ユーザーが "enough" 宣言、または上限到達                                                      |

### Phase 2 への出力

grill findings を critic-design 入力スキーマに集約してから spawn する。

| Field            | 出所                                                             |
| ---------------- | ---------------------------------------------------------------- |
| source           | "user-grill"                                                     |
| artifact_type    | $ARGUMENTS から推定 (spec / plan / design / ADR / doc)           |
| approach         | proposal core の 1 行要約                                        |
| decisions        | grill 中に固まったアーキレベル判断 (用語確認や scope 細部は除外) |
| trade-offs       | grill 中に表面化した trade-off                                   |
| referenced_files | grill 中に参照または読まれたファイル                             |

## Phase 2 Devil

| Step | アクション                                                                                                                    |
| ---- | ----------------------------------------------------------------------------------------------------------------------------- |
| 1    | Phase 1 集約 + 元の $ARGUMENTS コンテキストから Phase 2 入力を組み立てる                                                      |
| 2    | Task で critic-design を spawn する (subagent_type: critic-design, background: false)。ARCHITECTURE.md 等が存在すれば言及する |
| 3    | 完了待機、verdict + weaknesses を取得                                                                                         |

## 出力

| セクション       | 内容                                                   |
| ---------------- | ------------------------------------------------------ |
| Grill summary    | 表面化した assumption、decisions、trade-offs (各 1 行) |
| Devil verdict    | critic-design 出力をそのまま提示                       |
| Actionable items | 具体アクションのトップ 3 (keep / remove / revise)      |
