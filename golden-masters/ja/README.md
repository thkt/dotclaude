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

## 関連ドキュメント

- [sow-spec-reviewer](../agents/reviewers/sow-spec.md)
- [SOWテンプレート](../templates/sow.md)（Phase 4で作成予定）
- [Specテンプレート](../templates/spec.md)（Phase 4で作成予定）

## 更新履歴

| 日付 | 変更内容 |
|------|----------|
| 2025-12-16 | 初版作成（Spec駆動開発プラクティス導入） |
| 2025-12-16 | 構造統合（documents/ + outputs/） |
