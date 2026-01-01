# テンプレート

コマンドで参照される構造テンプレート。

## 目的

- **構造ガイド**: SOW/Spec/Summaryに必要なセクションとフォーマットを定義
- **最小限のコンテキスト**: コマンド実行時に必要な情報のみを提供
- **品質基準**: 信頼度マーカー `[C: X.X]` フォーマットの使用例を示す

## ディレクトリ構造

```text
templates/
├── README.md           # このファイル
├── sow/
│   └── workflow-improvement.md   # SOWテンプレート
├── spec/
│   └── workflow-improvement.md   # Specテンプレート
├── summary/
│   └── review-summary.md         # Summaryテンプレート
├── rules/
│   └── from-adr.md               # ADRからのルールテンプレート
└── research/
    └── context.md                # リサーチコンテキストテンプレート
```

## コマンドでの使用

| コマンド | テンプレート | 目的 |
| --- | --- | --- |
| `/think` | sow/, spec/, summary/ | 計画ドキュメント生成 |
| `/sow` | sow/workflow-improvement.md | SOW生成 |
| `/spec` | spec/workflow-improvement.md | Spec生成 |
| `/rulify` | rules/from-adr.md | ADRからのルール生成 |
| `/research` | research/context.md | リサーチコンテキスト出力 |

## golden-masters/との関係

詳細: [golden-masters/README.md](../../golden-masters/README.md#relationship-with-templates)

## カスタマイズ

テンプレートをカスタマイズする際:

1. 必須セクション（## ヘッダー）を維持
2. 信頼度マーカー `[C: X.X]` フォーマットを維持（0.0-1.0の値）
3. プレースホルダーを適切に配置（[Feature Name]など）
4. ID規約を維持（I-001, AC-001, FR-001など）

## 参考

- 品質基準: [golden-masters/QUALITY_CRITERIA.md](../../golden-masters/QUALITY_CRITERIA.md)
- 実装例: [golden-masters/documents/](../../golden-masters/documents/)
