# Spec生成ワークフロー

SOWへのトレーサビリティを持つ実装仕様の作成。

## 入力検出

```bash
# 最新SOWを自動検出
ls -t .claude/workspace/planning/*/sow.md 2>/dev/null | head -1
```

SOWが見つかった場合、一貫性のために参照。

## 必須セクション

| セクション         | 目的                         | IDフォーマット |
| ------------------ | ---------------------------- | -------------- |
| 機能要件           | 実装内容                     | FR-001         |
| データモデル       | TypeScriptインターフェース   | -              |
| 実装詳細           | フェーズの詳細               | -              |
| テストシナリオ     | Given-When-Then              | T-001          |
| 非機能要件         | パフォーマンス、セキュリティ | NFR-001        |
| 依存関係           | 外部/内部                    | -              |
| 既知の問題         | SOWから                      | -              |
| 実装チェックリスト | フェーズ別                   | -              |

## トレーサビリティ

すべての要素をSOW受け入れ基準にリンク:

```text
FR-001  Implements: AC-001
T-001   Validates: FR-001
NFR-001 Validates: AC-002
```

## 信頼度マーカー

| 範囲         | 意味     | エビデンス |
| ------------ | -------- | ---------- |
| [C: 0.9+]    | 検証済み | file:line  |
| [C: 0.7-0.9] | 推論     | 理由を記載 |
| [C: <0.7]    | 不確実   | 調査が必要 |

## Component API (フロントエンドのみ)

フロントエンド機能を自動検出:

```text
キーワード: component, UI, button, form, modal...
除外: api endpoint, database, CLI, backend...
```

検出された場合、以下を含める:

- Propsテーブル
- バリアント
- 状態
- 使用例

## 出力

```text
保存先: .claude/workspace/planning/[same-dir]/spec.md

✅ Spec saved to: .claude/workspace/planning/[path]/spec.md
   Based on: sow.md
```

## テンプレート

構造参照: `~/.claude/templates/spec/workflow-improvement.md`

- ✅ コピー: セクション構造、ID命名
- ❌ コピーしない: 実際のコンテンツ

## 関連

- SOW生成: [@./sow-generation.md](./sow-generation.md)
- 検証: [@./validation-criteria.md](./validation-criteria.md)
