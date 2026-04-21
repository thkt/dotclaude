# 非推奨化テンプレート

技術、API、レガシーコードパスを廃止し、それを置き換える移行計画を記録するためのガイド。

## 使用場面

| シナリオ                                     |
| -------------------------------------------- |
| ライブラリ、フレームワーク、ツールの廃止     |
| 非推奨化された API やパターンの置き換え      |
| レガシーコードの削除計画                     |

## 必須セクション (MADR コア)

| # | セクション                    | 目的                                                  |
| - | ----------------------------- | ----------------------------------------------------- |
| 1 | Title                         | アクション指向。例: `YのためにXを非推奨化`            |
| 2 | Status                        | `proposed` / `accepted` / `deprecated` / `superseded` |
| 3 | Context and Problem Statement | なぜ今この判断が必要か                                |
| 4 | Decision Drivers              | 判断に影響を与える要因                                |
| 5 | Considered Options            | 最低 2 つの選択肢 (移行 vs 維持)                      |
| 6 | Decision Outcome              | `Chosen option: X, because Y` 形式                    |
| 7 | Consequences                  | ポジティブ・ネガティブな影響                          |

メタデータ行: `- Confidence: {level}. {根拠}`。再評価は Consequences の後に任意の `## Reassessment Triggers` セクションで。

## テンプレート固有セクション (必須)

非推奨化 ADR は他テンプレートより要件が厳しい。

| セクション                 | 必須? | 目的                                                |
| -------------------------- | ----- | --------------------------------------------------- |
| Deprecation Target         | Yes   | 名前、バージョン、使用箇所                          |
| Replacement Technology     | Yes   | 置き換え対象とその根拠                              |
| Impact Analysis            | Yes   | コード影響、依存影響、チーム影響                    |
| Migration Plan             | Yes   | フェーズ毎の成功基準を伴うタイムライン              |
| Deprecation Warning Period | Yes   | ソフト非推奨、ハード非推奨、削除の各日付            |
| Rollback Plan              | Yes   | トリガー条件とロールバック手順                      |
| Communication              | Yes   | 告知スケジュールとドキュメント更新                  |

## 例

```markdown
# date-fns への移行のため moment.js を非推奨化

- Status: accepted
- Deciders: フロントエンドチーム
- Date: 2026-01-15
- Confidence: high. 公式の非推奨化通知あり。バンドルサイズの明確なデータあり。

## Context and Problem Statement

moment.js はメンテナンスモードに入っており、バンドルサイズ (67 KB gzip) はアプリケーションの 15% を占める。ツリーシェイク不可のため、未使用機能もバンドルに含まれる。

## Decision Drivers

- バンドルサイズ削減の要求
- moment.js の公式非推奨化通知
- セキュリティパッチ終了のリスク

## Considered Options

### date-fns へ移行

- Good: ツリーシェイク可能、メンテナンス継続
- Good: 類似 API で学習コスト低
- Bad: 移行中は両ライブラリが共存

### ラッパー経由で moment.js 維持

- Good: 移行工数ゼロ
- Bad: バンドルサイズ 67 KB のまま
- Bad: セキュリティパッチリスクが時間と共に増加

## Deprecation Target

| 属性     | 値                                          |
| -------- | ------------------------------------------- |
| Name     | moment.js                                   |
| Version  | 2.29.4                                      |
| 使用箇所 | src/utils/date.ts, src/components/Calendar/ |

## Replacement Technology

| 属性     | 値                                              |
| -------- | ----------------------------------------------- |
| Name     | date-fns                                        |
| Rationale | ツリーシェイク可能。TypeScript ネイティブ。軽量。|

## Decision Outcome

moment.js を非推奨化し、date-fns に段階的に移行する。

### Positive Consequences

- バンドルサイズ ~60 KB 削減
- ツリーシェイク最適化が有効に

### Negative Consequences

- 移行中は両ライブラリが共存
- API 差異による学習コスト

## Migration Plan

| Phase   | 期間   | ゴール                             | 成功基準      |
| ------- | ------ | ---------------------------------- | ------------- |
| 準備    | 1 週間 | date-fns 追加、互換レイヤー作成     | テスト通過    |
| 段階移行 | 2 週間 | 使用箇所を段階的に置換              | 80% 完了      |
| 完全移行 | 1 週間 | 残りを置換、moment 削除             | 依存ゼロ      |

## Deprecation Warning Period

| 段階          | メカニズム                     |
| ------------- | ------------------------------ |
| ソフト非推奨  | ESLint ルールで警告             |
| ハード非推奨  | CI で moment.js import をブロック|
| 完全削除      | package.json から削除            |

## Rollback Plan

トリガー. date-fns で moment.js の挙動を再現できないバグが発生した場合。

手順.

1. 互換レイヤーを moment.js に戻す
2. 移行済みファイルを revert
3. ESLint ルールを無効化

## Reassessment Triggers

- date-fns がロケール処理に影響する破壊的変更を導入した場合
- moment.js がツリーシェイクサポートを追加して復活した場合
```
