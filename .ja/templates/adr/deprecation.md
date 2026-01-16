# 非推奨化テンプレート

## 構造

````markdown
# {title}

- ステータス: {status}
- 決定者: {deciders}
- 日付: {date}

技術ストーリー: {technical_story_link}

## 背景と課題

{context}

## 決定要因

- {driver_1}
- {driver_2}
- {driver_3}
- 技術的負債の削減
- セキュリティリスクの軽減
- 保守コストの最適化

## 非推奨化対象

### 現行技術

- **名称**: {deprecated_tech_name}
- **バージョン**: {deprecated_tech_version}
- **導入日**: {deprecated_tech_start_date}
- **使用箇所**: {usage_locations}

### 非推奨化の理由

- {deprecation_reason_1}
- {deprecation_reason_2}
- {deprecation_reason_3}

## 代替技術

- **名称**: {replacement_tech_name}
- **バージョン**: {replacement_tech_version}
- **選定理由**: {replacement_rationale}

## 決定結果

採用オプション: "{deprecated_tech_name} を非推奨化し {replacement_tech_name} へ移行"、理由: {rationale}

### 結果

#### ポジティブな結果

- {positive_1} - 技術的負債の削減
- {positive_2} - パフォーマンスの向上
- {positive_3} - 保守性の向上

#### ネガティブな結果

- {negative_1} - 移行コスト
- {negative_2} - 一時的な複雑性の増加

## 影響分析

### コードへの影響

- 影響ファイル数: {affected_files_count}
- 主な変更箇所:
  - {change_location_1}
  - {change_location_2}
  - {change_location_3}

### 依存関係への影響

- 直接依存: {direct_dependencies}
- 間接依存: {indirect_dependencies}
- 互換性レイヤーの必要性: {compatibility_layer_needed}

### チームへの影響

- 影響を受けるチーム: {affected_teams}
- 必要なスキルセット: {required_skills}
- 学習コスト: {learning_cost} 時間/人

## 移行計画（必須）

### タイムライン

| フェーズ                  | 期間             | 目標           | 成功基準           |
| ------------------------- | ---------------- | -------------- | ------------------ |
| フェーズ1: 準備           | {phase_1_period} | {phase_1_goal} | {phase_1_criteria} |
| フェーズ2: パイロット移行 | {phase_2_period} | {phase_2_goal} | {phase_2_criteria} |
| フェーズ3: 段階的移行     | {phase_3_period} | {phase_3_goal} | {phase_3_criteria} |
| フェーズ4: 完全移行       | {phase_4_period} | {phase_4_goal} | {phase_4_criteria} |
| フェーズ5: クリーンアップ | {phase_5_period} | {phase_5_goal} | {phase_5_criteria} |

### 非推奨化警告期間

- 警告開始日: {warning_start_date}
- ソフト非推奨: {soft_deprecation_date}（警告ログ出力）
- ハード非推奨: {hard_deprecation_date}（新規使用禁止）
- 完全削除: {removal_date}

### 移行ステップ

#### ステップ1: 互換性レイヤーの作成

```text
{compatibility_layer_code}
```

#### ステップ2: 段階的な置換

- [ ] {migration_task_1}
- [ ] {migration_task_2}
- [ ] {migration_task_3}

#### ステップ3: 検証

- [ ] ユニットテストの更新
- [ ] 統合テストの実行
- [ ] パフォーマンスの測定

#### ステップ4: レガシーコードの削除

- [ ] 非推奨コードの削除
- [ ] 互換性レイヤーの削除（該当する場合）
- [ ] ドキュメントの更新

### 移行チェックリスト

- [ ] 影響範囲の特定完了
- [ ] 移行計画のレビュー完了
- [ ] パイロット移行の成功
- [ ] すべてのテストがグリーン
- [ ] パフォーマンスベースラインの達成
- [ ] ドキュメント更新の完了
- [ ] チームトレーニングの完了

## 検証

### 成功基準

- {success_criteria_1}
- {success_criteria_2}
- {success_criteria_3}

### メトリクス

- パフォーマンス: {performance_metric}
- エラー率: {error_rate_metric}
- 移行完了率: {migration_completion_metric}

### モニタリング

- 移行進捗ダッシュボード: {dashboard_link}
- アラート設定: {alert_config}

## ロールバック計画（必須）

### トリガー条件

- {rollback_trigger_1}
- {rollback_trigger_2}
- {rollback_trigger_3}

### ロールバック手順

1. {rollback_step_1}
2. {rollback_step_2}
3. {rollback_step_3}

### ロールバックタイムライン

- 検知から判断まで: {detection_to_decision} 分
- ロールバック実行: {rollback_execution} 分
- 復旧確認: {recovery_verification} 分

### データの考慮事項

- データ移行の必要性: {data_migration_needed}
- ロールバック時のデータ処理: {data_rollback_strategy}

## コミュニケーション

### アナウンス

| 日付              | 内容           | 対象       | チャネル    |
| ----------------- | -------------- | ---------- | ----------- |
| {announce_date_1} | 非推奨化の通知 | 全開発者   | {channel_1} |
| {announce_date_2} | 移行開始       | 関連チーム | {channel_2} |
| {announce_date_3} | 完了報告       | 全開発者   | {channel_3} |

### ドキュメント更新

- [ ] README.md
- [ ] 技術ドキュメント
- [ ] APIドキュメント
- [ ] 移行ガイド

## 関連ADR

<!-- update-index.sh により自動生成 -->

## 参考文献

<!-- collect-references.sh により自動収集 -->

---

_作成日: {date}_
_作成者: {author}_
_ADR番号: {number}_
````
