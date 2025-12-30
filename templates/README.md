# Templates

コマンドが参照する構造テンプレート集。

## Purpose

- **構造ガイド**: SOW/Spec/Summary 等の必須セクションと形式を定義
- **最小限のコンテキスト**: コマンド実行時に必要な情報のみを提供
- **品質の基準**: 信頼度マーカー `[C: X.X]` 形式の使用例を示す

## Directory Structure

```text
templates/
├── README.md           # This file
├── sow/
│   └── workflow-improvement.md   # SOW template
├── spec/
│   └── workflow-improvement.md   # Spec template
├── summary/
│   └── review-summary.md         # Summary template
├── rules/
│   └── from-adr.md               # Rule from ADR template
└── research/
    └── context.md                # Research context template
```

## Usage by Commands

| Command | Template | Purpose |
| --- | --- | --- |
| `/think` | sow/, spec/, summary/ | 計画ドキュメント生成 |
| `/sow` | sow/workflow-improvement.md | SOW生成 |
| `/spec` | spec/workflow-improvement.md | Spec生成 |
| `/rulify` | rules/from-adr.md | ADRからルール生成 |
| `/research` | research/context.md | 研究コンテキスト出力 |

## Relationship with golden-masters/

```text
templates/          ← コマンドが参照（構造ガイド）
    ↑
    │ 改善のフィードバック
    │
golden-masters/     ← 品質参考資料（実例集）
```

**ワークフロー**:

1. コマンドは `templates/` を参照してドキュメント生成
2. 良いドキュメントができたら `golden-masters/` に追加
3. `golden-masters/` を参考に `templates/` を定期的に改善

## Customization

テンプレートをカスタマイズする場合:

1. 必須セクション（## ヘッダー）は維持
2. 信頼度マーカー `[C: X.X]` 形式を維持（0.0-1.0の数値）
3. プレースホルダー（[Feature Name] 等）を適切に配置
4. ID体系（I-001, AC-001, FR-001 等）を維持

## References

- Quality criteria: [golden-masters/QUALITY_CRITERIA.md](../golden-masters/QUALITY_CRITERIA.md)
- Example implementations: [golden-masters/documents/](../golden-masters/documents/)
