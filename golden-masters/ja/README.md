# Golden Masters - 品質基準リファレンス

## 目的

理想的な成果物を蓄積し、プロンプトチューニングと出力検証の基準とする。

> ゴールデンマスター手法: 理想的な成果物を人間が先に作成し、コマンド出力と比較してプロンプトをチューニング

## ディレクトリ構造

```text
golden-masters/
├── README.md             # このファイル
├── documents/            # ドキュメント品質基準
│   ├── sow/              # 理想的なSOW例
│   │   └── example-*.md
│   └── spec/             # 理想的なSpec例
│       └── example-*.md
└── outputs/              # コマンド出力検証
    ├── README.md         # 出力検証ガイド
    ├── fix-output.md     # /fix 出力形式
    ├── think-sow.md      # /think SOW出力
    └── code-output.md    # /code 出力形式
```

## 2つの用途

### 1. documents/ - ドキュメント品質基準

SOW/Specの品質をスコアリングし、プロンプトを改善するための参照例。

**使用場面**:

- `/think` または `/sow` + `/spec` でドキュメント生成時
- `sow-spec-reviewer` でスコアリング後の改善
- プロンプトチューニング

詳細: [documents/README.md](documents/README.md)（作成予定）

### 2. outputs/ - コマンド出力検証

各コマンドの期待出力形式を定義し、回帰テストに使用。

**使用場面**:

- コマンド修正後の出力形式確認
- 新規コマンド作成時のフォーマット参照
- CI/CD での自動検証

詳細: [outputs/README.md](outputs/README.md)

## 品質基準

### SOW評価観点（100点満点）

| 観点 | 配点 | 評価項目 |
|------|------|----------|
| 構造 | 25点 | 必須セクションの網羅 |
| 明確性 | 25点 | ✓/→/? マーカーの適切な使用 |
| 実行可能性 | 25点 | 具体的なAcceptance Criteria |
| リスク評価 | 25点 | 現実的なリスク識別と軽減策 |

### Spec評価観点（100点満点）

| 観点 | 配点 | 評価項目 |
|------|------|----------|
| 実装可能性 | 25点 | コードに直接変換可能 |
| テスト可能性 | 25点 | Given-When-Then形式 |
| SOW整合性 | 25点 | ACとFRの1:1対応 |
| 完全性 | 25点 | NFR、移行ガイドの網羅 |

### 合格基準

| スコア | 判定 | アクション |
|--------|------|-----------|
| 90点以上 | ✅ PASS | 実装フェーズへ進行可能 |
| 70-89点 | ⚠️ CONDITIONAL | 指摘事項を修正後、再レビュー |
| 70点未満 | ❌ FAIL | 大幅な見直しが必要 |

## 収録例

### documents/sow/

| ファイル | 特徴 | スコア |
|----------|------|--------|
| `example-workflow-improvement.md` | Phase分割、段階的改善 | 95点 |
| `example-storybook-integration.md` | Frontend機能、Component API | - |
| `example-config-optimization.md` | 設定最適化、パフォーマンス | - |

### documents/spec/

| ファイル | 特徴 | スコア |
|----------|------|--------|
| `example-workflow-improvement.md` | FR/NFR明確、TypeScript interface | 95点 |
| `example-storybook-integration.md` | Component API、Stories定義 | - |
| `example-config-optimization.md` | 設定スキーマ、移行ガイド | - |

## メンテナンスガイドライン

### 更新トリガー（イベント駆動）

以下の場合にゴールデンマスターを更新する：

| トリガー | アクション |
|---------|-----------|
| より良い出力が見つかった | 現行と比較し、優れていれば差し替え |
| 現在の例が制約になっている | 緩和または削除 |
| 新しい要件が出てきた | 新規例を追加 |
| 現実との乖離を検出 | 現在のベストプラクティスに合わせて修正 |

### レビュープロセス

**時間ベースのリマインダー**: `Last Reviewed` が3ヶ月以上前なら「まだ有効？」と自問する。

**更新手順**:

1. 候補を特定（より良い出力、または古くなった例）
2. 現行のゴールデンマスターと比較
3. 差し替える場合: ファイル更新 + メタデータに `Update Reason` を追加
4. アーカイブする場合: 理由とともに `archived/` に移動
5. このREADMEの「収録例」テーブルを更新

### メタデータテンプレート

各ゴールデンマスターファイルには以下のメタデータブロックを含める：

```markdown
<!--
Golden Master: [種類] - [名前]

Selection criteria:
- [この例を選んだ理由]
- [該当する場合はスコア]

Features:
- [主な特徴]

Source: [元ファイルのパス]

Last Reviewed: YYYY-MM-DD
Update Reason: [最後に更新した理由、または "Initial creation"]
Previous Version: [アーカイブされたバージョンのパス、または "N/A"]
-->
```

### アーカイブ

ゴールデンマスターを差し替える場合：

1. 古いファイルを `archived/[種類]/[ファイル名]-[日付].md` に移動
2. なぜ置き換えられたかの注記を追加
3. 参照用に保持（削除しない）

## 関連ドキュメント

- [sow-spec-reviewer](../agents/reviewers/sow-spec.md)
- [SOWテンプレート](../templates/sow.md)（Phase 4で作成予定）
- [Specテンプレート](../templates/spec.md)（Phase 4で作成予定）

## 更新履歴

| 日付 | 変更内容 |
|------|----------|
| 2025-12-17 | メンテナンスガイドライン追加（更新トリガー、レビュープロセス、メタデータテンプレート） |
| 2025-12-16 | 初版作成（Spec駆動開発プラクティス導入） |
| 2025-12-16 | 構造統合（documents/ + outputs/） |
