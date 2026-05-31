---
name: probe
description: リポジトリの仕様を抽出しつつ、説明を通じてバグ・仕様欠落・一貫性のドリフトを発見する。OUTCOME.md 軸の質問駆動探索、ephemeral 出力。コードレビュー (代わりに /audit や /polish を使う)、機能実装 (/code)、計画のみ (/think)、単独のバグ修正 (/fix) には使わない。
when_to_use: 仕様抽出, 一貫性チェック, ムラ検知, ADR drift, repository spec, バグ発掘, spec gap detection, 暗黙知発掘
allowed-tools: Read Write Edit Bash LS Glob Grep
---

# probe

リポジトリを観点ごとに辿りながら詰まりどころを issue 候補として記録する。「説明しようとする」プロセスが矛盾と穴を浮かび上がらせる。最終アウトプットは Issues、severity 判定なし。出力は findings.md 1 ファイル完結。

## 入力

引数なし。対象は現在の作業ディレクトリにあるリポジトリ全体。スコープは `.claude/OUTCOME.md` から自動導出する。

| 入力       | 必須     | ソース                                                                  |
| ---------- | -------- | ----------------------------------------------------------------------- |
| OUTCOME.md | Yes      | `.claude/OUTCOME.md` (不在時は `rules/core/OUTCOME.md` workflow で生成) |
| ADR        | Optional | `docs/decisions/`                                                       |
| Spec       | Optional | `.claude/workspace/planning/*/spec.md` 等                               |

## 出力

ファイル: `/tmp/probe-{repo}-{YYYYMMDD}/findings.md` (ephemeral)

テンプレート: ${CLAUDE_SKILL_DIR}/templates/findings.md

## プロセス

### Step 1: Outcome Loading

`.claude/OUTCOME.md` の Behavior / Non-goals / Constraints の各項目を観点リストに追加する。ADR があれば見出しと status を列挙する。

### Step 2: Pass-by-Aspect Exploration

観点ごとに sequential：

1. 観点に対応する実装箇所を探索する
2. 仕様を頭の中で要約しながら読む (書き出さない)
3. 詰まったら止める
4. findings.md の Issues セクションに issue 候補として記録する (現状 / 課題 / 提案 / 影響を body に inline)
5. 必要なら 1 問だけ問う
6. 次の観点へ

### Step 3: Inconsistency Sweep

各観点パス完了後、grep で検知する。

| 対象                | 例                                                               |
| ------------------- | ---------------------------------------------------------------- |
| 用語ズレ            | ADR/README の用語 vs 実装シンボル vs テスト assert               |
| 概念重複            | 同名で異なる意味のフィールド                                     |
| ログ整合性          | redact ラッパー vs ログ文での素値                                |
| ADR Call Site Index | ADR に記載された関数名が現存するか / 行番号が drift していないか |

### Step 4: Question Phase

詰まったときに 1 問だけ問う。回答がなければ「未解決」マークを付けて進める。findings.md の Open Questions に durable に記録する。

### Step 5: Self-Reflection

findings.md 末尾に skill 挙動を記録する (質問数、詰まり箇所のパターン、Positive issue の有無、観点パスの破綻有無)。

## Issue カテゴリ

| カテゴリ           | 内容                                                   |
| ------------------ | ------------------------------------------------------ |
| Bug candidate      | 動作不良につながる実装の傷                             |
| Spec gap           | OUTCOME / Spec で想定すべきだが実装に未反映            |
| Non-goals leakage  | OUTCOME.md Non-goals に該当する実装混入                |
| Constraints breach | OUTCOME.md Constraints の遵守欠落                      |
| Inconsistency      | 同責務コードのパターン乖離                             |
| ADR drift          | ADR の Call Site Index / 関数名 / 数値が現状と乖離     |
| Implicit knowledge | コードに存在するが未記録                               |
| Positive           | OUTCOME / ADR / 実装が一致していることを動的検証で確認 |
