# OUTCOME

各リポジトリのアウトカム状態を定義する場所。CLAUDE.md の Foundation Outcome-driven をリポジトリ単位で具体化する。

このファイルはルール定義 (OUTCOME.md とは何か、どう運用するか)。実体は各リポジトリの `.claude/OUTCOME.md`。

## なぜ必要か

CLAUDE.md の Foundation で Outcome-driven を掲げているが、リポジトリ単位のアウトカム状態は実際には曖昧なまま放置されやすい。曖昧なアウトカムは後段の判断 (スコープ、優先度、何を捨てるか) を全部汚染する。OUTCOME.md は曖昧なアウトカムを見える状態に変える。書く行為そのものが discovery moment になる。

## 配置

各リポジトリの `.claude/OUTCOME.md`。

CLAUDE.md と独立して読めるようメタ層に置く。リポルートには置かない。

## アウトカムとは何か

アウトカムは在り方の状態。プロジェクトが完了状態にあるとき、世界がどう見えるかを示す。世界とはプロジェクトが影響を与える主体すべて。人間ユーザー、プロジェクトを利用する AI エージェント、プロジェクトがゲートするシステムを含む。

Behavior が主軸。Time、Error rate、Value は Behavior を裏付ける Indicators。「エラー率 < 0.1%」のようなメトリクス単独は Indicator だが、「エラー率が 0.1% 未満で安定するからエージェントはリトライせず編集を完了する」のように行動の帰結を付ければアウトカムになる。

Behavior の主体は次のいずれか。

| 主体            | 例                                                         |
| --------------- | ---------------------------------------------------------- |
| 人間ユーザー    | 開発者、エンドユーザー、運用者                             |
| AI エージェント | Claude Code、プロジェクトを利用する AI アシスタント        |
| システム        | プロジェクトがゲートする下流ツール、パイプライン、サービス |

## アウトカムテスト

アウトカム文の候補を以下のチェックで判定する。1 つでも fail なら書き直す。

| チェック             | pass 条件                                                           |
| -------------------- | ------------------------------------------------------------------- |
| 主体が明示されている | 主体 (人間 / AI エージェント / システム) の状態変化を文が指している |
| 実装非依存           | 実装を一から書き換えても文が成立する                                |
| 完了状態             | 完了状態を述べている (活動の途中ではない)                           |
| 観察可能             | ソースを読まずに外部観察者が状態を検証できる                        |

## 中身

3 セクション構成。Outcome state は 3 つの slot を持つ。任意の冒頭文 (プロジェクトの存在意義) + Behavior 主軸 + 任意の Indicators (Behavior を裏付ける)。Behavior は rules/conventions/VAGUE_TERMS.md を厳格に守る。冒頭文と Indicators は理想方向の表現を許容する (曖昧表現はこの 2 slot のみ可)。

| Section       | What                                                                                                                 |
| ------------- | -------------------------------------------------------------------------------------------------------------------- |
| Outcome state | 任意の冒頭文 (プロジェクトの存在意義)。完了状態の Behavior (必須、≥1)。Indicators (Time / Error rate / Value) は任意 |
| Non-goals     | 明示的にスコープ外とするもの                                                                                         |
| Constraints   | 動かせない技術、法的、組織的制約                                                                                     |

## CLAUDE.md との関係

additive な層。既存 CLAUDE.md の migration は強制しない。「なぜ存在するか」が CLAUDE.md に混入しているリポジトリ (kiku, mimi, miyo, tally, okr-dashboard) は、次に作者が触るときに why 部分を OUTCOME.md に切り出す。

| File       | Scope                  | 答える質問                                         |
| ---------- | ---------------------- | -------------------------------------------------- |
| OUTCOME.md | なぜ存在し、何が完了か | なぜこのリポが存在するか、何が達成されたら done か |
| CLAUDE.md  | どう作業するか         | どう作業するか (技術スタック、コマンド、規約)      |
| ADR        | 技術判断               | なぜこの技術判断を選んだか                         |
| SOW        | タスクスコープ         | このタスクの範囲は何か                             |
| Spec       | 機能仕様               | この機能の仕様は何か                               |

## Workflow 接続点

active set は /think, /issue, /code, /fix, /research, /assert。/assert は outcome-based assertion なので assert 対象となる outcome 自体が必要。ゲート判定は「この変更が完了状態の Behavior に近づけるか」から導出される。/audit と /polish はコード品質を見るレイヤなので out のまま。scope drift 検出が必要になったら同様に追加を検討する。

| Skill     | 読むタイミング                 | 用途                                                                                                                   |
| --------- | ------------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| /think    | Why Discovery の前             | OUTCOME.md を Why Statement の前提として読む                                                                           |
| /issue    | Issue 本文生成時               | OUTCOME.md と照合。非ゴール踏みなら body に注意喚起                                                                    |
| /code     | SOW Context と並列             | outcome 状態を Scope Guard に反映                                                                                      |
| /fix      | Triage 前                      | 修正対象が outcome 範囲内か確認。範囲外なら /code にエスカレ                                                           |
| /research | 調査スコープ決定時             | 非ゴール領域への調査は明示確認                                                                                         |
| /assert   | Pre-flight + Phase 3 + Phase 4 | Intent Assertion の intent source として読む。Behavior / Non-goals / Constraints を enhancer-evidence に文脈として渡す |

## 不在時の振る舞い

`.claude/OUTCOME.md` が無い状態で接続点 workflow が起動した場合、workflow が対話的に stub を生成してから進む。hard-stop は新規リポ立ち上げが重くなりルール自体が削除されるため不採用。warn のみで進むのは曖昧なまま作業が進むため不採用。Behavior が空、または全 section が TBD のファイルは、次回起動時に不在として扱われる。

| Step | 動作                                                                                                        |
| ---- | ----------------------------------------------------------------------------------------------------------- |
| 1    | OUTCOME.md の不在を検知                                                                                     |
| 2    | AskUserQuestion で Behavior (≥1、主体明示)、Non-goals、Constraints を収集 (3 問)                            |
| 3    | 各 Behavior をアウトカムテストに通してから書く                                                              |
| 4    | `~/.claude/.ja/rules/core/templates/outcome.md` を読み、template に流し込んで `.claude/OUTCOME.md` を Write |
| 5    | 元の workflow に復帰                                                                                        |

## Template と例

stub template と 3 つのプロジェクト形態の例は `templates/outcome.md` にある (常時ロードから外している)。不在時の振る舞いフロー (step 4) が stub 生成時に読む。

## 更新トリガー

更新 commit は単独で切ると OUTCOME.md の変更履歴が読みやすくなる。

| トリガー                   | 動作                                             |
| -------------------------- | ------------------------------------------------ |
| Outcome state が達成された | 埋めた Behavior と Indicators を次フェーズに更新 |
| Non-goals が変わった       | Non-goals を更新                                 |
| Constraints が変わった     | Constraints を更新                               |
| 半年経過                   | 全 section を見直す                              |
