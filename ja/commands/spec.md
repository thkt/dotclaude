---
description: SOWからSpec（仕様書）を生成、実装詳細を作成
allowed-tools: Read, Write, Glob, Grep, LS
model: inherit
argument-hint: "[sowパス または 機能説明]"
dependencies: [formatting-audits]
---

# /spec - 仕様書ジェネレーター

## 目的

spec.mdのみを生成（単一成果物）、実装可能な詳細を含む。

## テンプレート参照

**構造とセクション順序のみ**を参考にする:
[@~/.claude/templates/spec/workflow-improvement.md]

**重要**:

- ✅ コピー可: セクション構造、ID命名（FR-001, NFR-001, T-001）、テーブル形式
- ❌ コピー不可: 実際のコンテンツ、具体的な値
- SOWまたは機能説明に基づいて新しいコンテンツを生成

## 入力検出

SOWが指定されていない場合、自動検出:

```bash
!`ls -t .claude/workspace/planning/*/sow.md 2>/dev/null | head -1 || ls -t ~/.claude/workspace/planning/*/sow.md 2>/dev/null | head -1 || echo "(SOWが見つかりません)"`
```

SOWが見つかった場合、一貫性のために参照する。

## 信頼度マーカー

数値形式 `[C: X.X]` をドキュメント全体で使用:

| 範囲 | 意味 | 必要な証拠 |
| --- | --- | --- |
| [C: 0.9+] | 検証済み | file:line、コマンド出力、ログ |
| [C: 0.7-0.9] | 推論 | 推論根拠を記載 |
| [C: <0.7] | 不確実 | 調査が必要 |

## トレーサビリティ

すべての要素をSOW受け入れ基準にリンク:

- FR-001 `Implements: AC-001` - 機能要件がACを実装
- T-001 `Validates: FR-001` - テストが要件を検証
- NFR-001 `Validates: AC-002` - 非機能要件がACを検証

## 必須セクション

Golden Master構造に従う:

1. **機能要件** - FR-001, FR-002... Input/Output/Validation付き
2. **データモデル** - TypeScriptインターフェース
3. **実装詳細** - フェーズごとの詳細
4. **テストシナリオ** - Given-When-Then形式
5. **非機能要件** - NFR-001... (パフォーマンス、セキュリティ、a11y)
6. **依存関係** - 外部ライブラリ、内部サービス
7. **既知の問題と前提条件** - SOWから継承
8. **実装チェックリスト** - フェーズごと
9. **移行ガイド** - 既存ユーザー向け（該当する場合）
10. **参照** - SOWへのリンク

## コンポーネントAPIセクション（フロントエンドのみ）

フロントエンド機能を自動検出:

```text
キーワード: component, UI, button, form, modal, dialog, card...
除外: api endpoint, database, CLI, migration, backend...
```

フロントエンドが検出された場合、コンポーネントAPIセクションを含める:

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
   基準: sow.md（使用した場合）
```

## 使用例

```bash
# /sowの後
/spec
# 最新のSOWを自動検出し、同じディレクトリにspec.mdを生成

# スタンドアロン
/spec "ユーザー登録フロー"
# spec.md付きの新しい計画ディレクトリを作成
```

## 次のステップ

Specが作成された後:

- `/code` - specに基づいて実装
- `/plans` - 作成されたドキュメントを表示
- `/audit` - レビューは検証のためにspecを参照
