---
description: 実装準備の詳細を含むSpecification（spec.md）を生成
allowed-tools: Read, Write, Glob, Grep, LS
model: inherit
argument-hint: "[sowパスまたは機能説明]"
dependencies: [formatting-audits]
---

# /spec - 仕様書ジェネレーター

## 目的

実装準備の詳細を含むspec.mdのみ（単一成果物）を生成。

## テンプレート参照

**構造とセクション順序のみ**に使用:
[@../../templates/spec/workflow-improvement.md]

**重要**:

- ✅ コピー: セクション構造、ID命名（FR-001、NFR-001、T-001）、表フォーマット
- ❌ コピーしない: 実際のコンテンツ、具体的な値
- SOWまたは機能説明に基づいて新鮮なコンテンツを生成

## 入力検出

指定されていない場合はSOWを自動検出:

```bash
!`ls -t .claude/workspace/planning/*/sow.md 2>/dev/null | head -1 || ls -t ~/.claude/workspace/planning/*/sow.md 2>/dev/null | head -1 || echo "(no SOW found)"`
```

SOWが見つかった場合、一貫性のために参照。

## 信頼度マーカー

全体を通じて数値形式 `[C: X.X]` を使用:

| 範囲 | 意味 | 必要な証拠 |
| --- | --- | --- |
| [C: 0.9+] | 検証済み | file:line、コマンド出力、ログ |
| [C: 0.7-0.9] | 推論 | 推論根拠を記載 |
| [C: <0.7] | 不確実 | 調査が必要 |

## トレーサビリティ

すべての要素をSOW受け入れ基準にリンク:

- FR-001 `Implements: AC-001` - 機能要件がACにトレース
- T-001 `Validates: FR-001` - テストが要件を検証
- NFR-001 `Validates: AC-002` - 非機能要件がACにトレース

## 必須セクション

Golden Master構造に従う:

1. **機能要件** - FR-001、FR-002... 入力/出力/バリデーション付き
2. **データモデル** - TypeScriptインターフェース
3. **実装詳細** - フェーズごとの詳細
4. **テストシナリオ** - Given-When-Then形式
5. **非機能要件** - NFR-001...（パフォーマンス、セキュリティ、A11y）
6. **依存関係** - 外部ライブラリ、内部サービス
7. **既知の問題と仮定** - SOWから引き継ぎ
8. **実装チェックリスト** - フェーズ別
9. **移行ガイド** - 既存ユーザー向け（該当する場合）
10. **参照** - SOWへのリンク

## コンポーネントAPIセクション（フロントエンドのみ）

フロントエンド機能を自動検出:

```text
キーワード: component、UI、button、form、modal、dialog、card...
除外: api endpoint、database、CLI、migration、backend...
```

フロントエンドが検出された場合、コンポーネントAPIセクションを含む:

- Propsテーブル
- バリアント
- 状態
- 使用例

## 出力

SOWと同じディレクトリに保存:
`.claude/workspace/planning/[same-dir]/spec.md`

保存後に表示:

```text
✅ Spec保存先: .claude/workspace/planning/[path]/spec.md
   ベース: sow.md（使用した場合）
```

## 例

```bash
# /sow後
/spec
# 最新のSOWを自動検出、同じディレクトリにspec.mdを生成

# スタンドアロン
/spec "ユーザー登録フロー"
# spec.md付きの新しい計画ディレクトリを作成
```

## 次のステップ

Spec作成後:

- `/code` - specに基づいて実装
- `/plans` - 作成したドキュメントを表示
- `/audit` - レビューがspec検証を参照
