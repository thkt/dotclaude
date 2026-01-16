# {{TITLE}}

- ステータス: {{STATUS}}
- 決定者: {{DECIDERS}}
- 日付: {{DATE}}

技術ストーリー: {{TECHNICAL_STORY_LINK}}

## 背景と課題

{{CONTEXT}}

## 決定要因

- {{DRIVER_1}}
- {{DRIVER_2}}
- {{DRIVER_3}}
- 技術的負債の削減
- セキュリティリスクの軽減
- 保守コストの最適化

## 非推奨化対象

### 現行技術

- **名称**: {{DEPRECATED_TECH_NAME}}
- **バージョン**: {{DEPRECATED_TECH_VERSION}}
- **導入日**: {{DEPRECATED_TECH_START_DATE}}
- **使用箇所**: {{USAGE_LOCATIONS}}

### 非推奨化の理由

- {{DEPRECATION_REASON_1}}
- {{DEPRECATION_REASON_2}}
- {{DEPRECATION_REASON_3}}

## 代替技術

- **名称**: {{REPLACEMENT_TECH_NAME}}
- **バージョン**: {{REPLACEMENT_TECH_VERSION}}
- **選定理由**: {{REPLACEMENT_RATIONALE}}

## 決定結果

採用オプション: "{{DEPRECATED_TECH_NAME}} を非推奨化し {{REPLACEMENT_TECH_NAME}} へ移行"、理由: {{RATIONALE}}

### 結果

#### ポジティブな結果

- {{POSITIVE_1}} - 技術的負債の削減
- {{POSITIVE_2}} - パフォーマンスの向上
- {{POSITIVE_3}} - 保守性の向上

#### ネガティブな結果

- {{NEGATIVE_1}} - 移行コスト
- {{NEGATIVE_2}} - 一時的な複雑性の増加

## 影響分析

### コードへの影響

- 影響ファイル数: {{AFFECTED_FILES_COUNT}}
- 主な変更箇所:
  - {{CHANGE_LOCATION_1}}
  - {{CHANGE_LOCATION_2}}
  - {{CHANGE_LOCATION_3}}

### 依存関係への影響

- 直接依存: {{DIRECT_DEPENDENCIES}}
- 間接依存: {{INDIRECT_DEPENDENCIES}}
- 互換性レイヤーの必要性: {{COMPATIBILITY_LAYER_NEEDED}}

### チームへの影響

- 影響を受けるチーム: {{AFFECTED_TEAMS}}
- 必要なスキルセット: {{REQUIRED_SKILLS}}
- 学習コスト: {{LEARNING_COST}} 時間/人

## 移行計画（必須）

### タイムライン

| フェーズ                  | 期間               | 目標             | 成功基準             |
| ------------------------- | ------------------ | ---------------- | -------------------- |
| フェーズ1: 準備           | {{PHASE_1_PERIOD}} | {{PHASE_1_GOAL}} | {{PHASE_1_CRITERIA}} |
| フェーズ2: パイロット移行 | {{PHASE_2_PERIOD}} | {{PHASE_2_GOAL}} | {{PHASE_2_CRITERIA}} |
| フェーズ3: 段階的移行     | {{PHASE_3_PERIOD}} | {{PHASE_3_GOAL}} | {{PHASE_3_CRITERIA}} |
| フェーズ4: 完全移行       | {{PHASE_4_PERIOD}} | {{PHASE_4_GOAL}} | {{PHASE_4_CRITERIA}} |
| フェーズ5: クリーンアップ | {{PHASE_5_PERIOD}} | {{PHASE_5_GOAL}} | {{PHASE_5_CRITERIA}} |

### 非推奨化警告期間

- 警告開始日: {{WARNING_START_DATE}}
- ソフト非推奨: {{SOFT_DEPRECATION_DATE}}（警告ログ出力）
- ハード非推奨: {{HARD_DEPRECATION_DATE}}（新規使用禁止）
- 完全削除: {{REMOVAL_DATE}}

### 移行ステップ

#### ステップ1: 互換性レイヤーの作成

```text
{{COMPATIBILITY_LAYER_CODE}}
```

#### ステップ2: 段階的な置換

- [ ] {{MIGRATION_TASK_1}}
- [ ] {{MIGRATION_TASK_2}}
- [ ] {{MIGRATION_TASK_3}}

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

- {{SUCCESS_CRITERIA_1}}
- {{SUCCESS_CRITERIA_2}}
- {{SUCCESS_CRITERIA_3}}

### メトリクス

- パフォーマンス: {{PERFORMANCE_METRIC}}
- エラー率: {{ERROR_RATE_METRIC}}
- 移行完了率: {{MIGRATION_COMPLETION_METRIC}}

### モニタリング

- 移行進捗ダッシュボード: {{DASHBOARD_LINK}}
- アラート設定: {{ALERT_CONFIG}}

## ロールバック計画（必須）

### トリガー条件

- {{ROLLBACK_TRIGGER_1}}
- {{ROLLBACK_TRIGGER_2}}
- {{ROLLBACK_TRIGGER_3}}

### ロールバック手順

1. {{ROLLBACK_STEP_1}}
2. {{ROLLBACK_STEP_2}}
3. {{ROLLBACK_STEP_3}}

### ロールバックタイムライン

- 検知から判断まで: {{DETECTION_TO_DECISION}} 分
- ロールバック実行: {{ROLLBACK_EXECUTION}} 分
- 復旧確認: {{RECOVERY_VERIFICATION}} 分

### データの考慮事項

- データ移行の必要性: {{DATA_MIGRATION_NEEDED}}
- ロールバック時のデータ処理: {{DATA_ROLLBACK_STRATEGY}}

## コミュニケーション

### アナウンス

| 日付                | 内容           | 対象       | チャネル      |
| ------------------- | -------------- | ---------- | ------------- |
| {{ANNOUNCE_DATE_1}} | 非推奨化の通知 | 全開発者   | {{CHANNEL_1}} |
| {{ANNOUNCE_DATE_2}} | 移行開始       | 関連チーム | {{CHANNEL_2}} |
| {{ANNOUNCE_DATE_3}} | 完了報告       | 全開発者   | {{CHANNEL_3}} |

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

_作成日: {{DATE}}_
_作成者: {{AUTHOR}}_
_ADR番号: {{NUMBER}}_
