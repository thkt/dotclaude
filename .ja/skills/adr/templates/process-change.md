# プロセス変更テンプレート

ワークフロー、ルール、レビュープロセス、品質ゲートの変更判断を記録するためのガイド。

## 使用場面

| シナリオ                                         |
| ------------------------------------------------ |
| 開発ワークフローや規約の変更                     |
| レビュープロセスや品質ゲートの修正               |
| 新しいルールの導入や古いルールの非推奨化         |

## 必須セクション (MADR コア)

| # | セクション                    | 目的                                                  |
| - | ----------------------------- | ----------------------------------------------------- |
| 1 | Title                         | アクション指向。例: `YにXプロセスを採用`              |
| 2 | Status                        | `proposed` / `accepted` / `deprecated` / `superseded` |
| 3 | Context and Problem Statement | なぜ今この判断が必要か                                |
| 4 | Decision Drivers              | 判断に影響を与える要因                                |
| 5 | Considered Options            | 最低 2 つの選択肢。各々に Good / Bad の箇条書き       |
| 6 | Decision Outcome              | `Chosen option: X, because Y` 形式                    |
| 7 | Consequences                  | ポジティブ・ネガティブな影響                          |

メタデータ行: `- Confidence: {level}. {根拠}`。再評価は Consequences の後に任意の `## Reassessment Triggers` セクションで。

## テンプレート固有セクション

| セクション                     | 目的                                               |
| ------------------------------ | -------------------------------------------------- |
| Current Process vs New Process | Before / After 比較 (表)                           |
| Transition Plan                | フェーズ分割と各フェーズの成功基準                 |
| Team Impact                    | 影響を受ける役割、必要な研修                       |
| Rollback Plan                  | 変更失敗時の撤退方法                               |
| Review Schedule                | 効果測定のタイミング                               |

## 例

```markdown
# オーディエンス最適化テンプレートの採用

- Status: accepted
- Deciders: プロジェクトオーナー
- Date: 2026-01-28
- Confidence: medium. テンプレートと実態の乖離は観測済み。最適フォーマットは未検証。

## Context and Problem Statement

SOW、Spec、ADR は異なる読者を持つが、全てのテンプレートが同じプレースホルダーリスト形式だった。結果として ADR テンプレートは実質未使用で、24 件の SOW がテンプレート構造から逸脱していた。

## Decision Drivers

- AI 読者には構造化された表が最適
- 人間読者には散文とガイドラインが最適
- テンプレートと実ドキュメントの乖離が大きい

## Considered Options

### オーディエンス最適化

SOW と Spec は構造化された表のまま。ADR はガイドライン形式に切り替え。

- Good: 各ドキュメントの読者に最適なフォーマット
- Good: テンプレートと実態の乖離を解消
- Bad: テンプレート種別間の統一性が下がる

### 統一プレースホルダー形式

全テンプレートをプレースホルダー形式のまま保持。

- Good: 一貫性
- Bad: ADR の実態乖離が残る

## Decision Outcome

オーディエンス最適化アプローチを採用。

### Positive Consequences

- テンプレートが実際に使われる
- ドキュメント品質が向上

### Negative Consequences

- テンプレート管理の複雑性が増える

## Current Process vs New Process

| 観点           | Before                     | After                          |
| -------------- | -------------------------- | ------------------------------ |
| SOW テンプレ   | 過剰な ID (8 種類)         | 実態ベース (AC-N)              |
| ADR テンプレ   | プレースホルダーリスト     | ガイドライン + 例              |
| Reviewer       | テンプレートと不一致       | テンプレートと同期             |

## Review Schedule

- 1 週間. テンプレートの使いやすさを確認。
- 1 ヶ月. SOW と ADR の定量的な品質評価。

## Reassessment Triggers

- 新規 ADR でテンプレート使用率が 50% を下回った場合
```
