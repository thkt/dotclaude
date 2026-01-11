# Thinkワークフローオーケストレーション

完全なプランニングワークフロー: Research → Q&A → SOW → Spec。

## ワークフローフロー

```text
/think [topic]
    │
    ├─ リサーチあり? ─NO──→ まず /research を実行
    │
    └─ リサーチ準備完了
           │
           ├─ Q&A明確化
           │     ├─ 要件収集
           │     ├─ 前提条件確認
           │     └─ 未知を解決
           │
           ├─ SOW生成
           │     └─ 構造と受け入れ基準
           │
           └─ Spec生成
                 └─ 実装詳細
```

## フェーズ1: リサーチコンテキスト

既存リサーチを確認:

```bash
ls -t .claude/workspace/research/*-context.md 2>/dev/null | head -1
```

見つからない場合、提案: `/research [topic]` を先に実行。

## フェーズ2: Q&A明確化

ドキュメント生成前に明確化:

1. **スコープ**: 何が含まれる/除外される?
2. **制約**: 技術、時間、リソース?
3. **優先度**: 必須 vs あれば良い?
4. **リスク**: 既知の懸念?

`AskUserQuestion` を使用してインタラクティブに明確化。

## フェーズ3: SOW生成

SOW生成を呼び出し:

**参照**: [@./sow-generation.md](./sow-generation.md)

主要出力:

- 問題分析
- ソリューション設計
- 受け入れ基準
- 実装計画

## フェーズ4: Spec生成

SOW承認後、Specを生成:

**参照**: [@./spec-generation.md](./spec-generation.md)

主要出力:

- 機能要件
- データモデル
- テストシナリオ
- トレーサビリティマトリクス

## 出力場所

```text
.claude/workspace/planning/[timestamp]-[topic]/
├── sow.md       # Statement of Work
├── spec.md      # 実装仕様
└── idr.md       # (/code で後に作成)
```

## 完了

サマリーを表示:

```markdown
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
プランニング完了

📄 作成ドキュメント:

- SOW: ./workspace/planning/[path]/sow.md
- Spec: ./workspace/planning/[path]/spec.md

📊 品質:

- 信頼度: [C: 0.XX]
- トレーサビリティ: AC → FR → Test 完了

🚀 次のステップ:

- /code - 実装開始
- /plans - 全ドキュメント表示
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## 関連

- SOW生成: [@./sow-generation.md](./sow-generation.md)
- Spec生成: [@./spec-generation.md](./spec-generation.md)
- 検証: [@./validation-criteria.md](./validation-criteria.md)
