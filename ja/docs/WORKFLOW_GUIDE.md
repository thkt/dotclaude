# Claude Code クイックスタートガイド

> **Note**: このドキュメントは日本語専用です（英語版はありません）

Claude Codeの使い方を素早く理解するための概要ガイド

---

## 🚀 5分でわかるClaude Code

### Claude Codeとは

AI支援による体系的なソフトウェア開発ツール。コマンド、エージェント、開発原則を統合し、高品質なコード開発を実現します。

### 主要コンポーネント

- **コマンド** - 開発ワークフローをサポート
- **エージェント** - コードレビュー・Git操作を自動化
- **開発原則** - TDD、SOLID、プログレッシブエンハンスメント

→ **詳細な構成**: [@./ARCHITECTURE.md](./ARCHITECTURE.md)

---

## 📁 システム構成

```text
~/.claude/
├── commands/          # コマンド定義
├── agents/            # エージェント定義
├── rules/             # 開発原則
├── docs/              # ドキュメント（英語）
└── ja/docs/           # ドキュメント（日本語）
    ├── WORKFLOW_GUIDE.md       # このファイル
    ├── DEVELOPMENT_WORKFLOW.md # 実践ガイド
    ├── COMMANDS.md             # コマンドリファレンス
    ├── ARCHITECTURE.md         # アーキテクチャ
    └── [その他]
```

**詳細**: システムアーキテクチャの完全な説明は [@./ARCHITECTURE.md](./ARCHITECTURE.md) を参照

---

## 🎯 コマンド一覧

主要コマンド: `/think`, `/research`, `/code`, `/test`, `/audit`, `/fix`

→ **コマンド詳細・選択ガイド**: [@./COMMANDS.md](./COMMANDS.md)

---

## 🤖 エージェント概要

レビュー、分析、Git操作などの専門エージェントが利用可能。

### `/audit`コマンドで自動実行

```text
Phase 1: 基礎（構造、可読性、根本原因）
Phase 2: 品質（型安全性、テスト容易性、パターン）
Phase 3: 本番（パフォーマンス、セキュリティ、アクセシビリティ）
```

---

## 📚 開発原則

### 主要原則

1. **オッカムの剃刀** - 最もシンプルな解決策を選ぶ
2. **プログレッシブエンハンスメント** - シンプルに構築→段階的に強化
3. **The Art of Readable Code** - 理解時間の最小化
4. **Container/Presentational** - ロジックとUIの分離

### 優先度階層

```text
1. ユーザー指示（最終権限）
2. CLAUDE.md グローバル設定
3. AI_OPERATION_PRINCIPLES.md
4. コマンド固有のルール
5. 開発パターンルール
```

**詳細**: 開発原則の詳細は `~/.claude/rules/` 配下を参照

---

## 🔄 標準ワークフロー

### 新機能開発

```text
/research → /think → /code → /test → /audit → /validate

進捗確認: /sow（いつでも）
```

### バグ修正

```text
/research → /fix
```

**詳細**: 実践的なワークフローガイドは [@./DEVELOPMENT_WORKFLOW.md](./DEVELOPMENT_WORKFLOW.md) を参照

---

## 📋 spec.md仕様駆動ワークフロー

### spec.mdとは

`/think`コマンドは、SOW（sow.md）と**仕様書（spec.md）**の2つのドキュメントを生成します：

- **sow.md**: 高レベルの計画書（受け入れ基準、リスク評価）
- **spec.md**: 実装レベルの詳細仕様（API、データモデル、UI、テストシナリオ）

### エンドツーエンドフロー

```text
/think
  ↓
sow.md + spec.md 生成
  ├─ 機能要件（FR-xxx）
  ├─ API仕様（リクエスト/レスポンス）
  ├─ データモデル
  ├─ UI仕様
  └─ テストシナリオ
  ↓
/code
  ├─ spec.mdを自動参照
  ├─ 機能要件を実装
  ├─ API仕様に従う
  └─ データモデルを使用
  ↓
/audit
  ├─ spec.mdを自動参照
  ├─ 実装が仕様と整合しているか検証
  ├─ 不足している機能を特定
  └─ API逸脱をフラグ
  ↓
/validate
  └─ SOW + spec.md の両方で最終検証
```

### 仕様駆動開発のメリット

1. **実装の明確化**: 何を作るべきかが具体的
2. **レビューの効率化**: 仕様との差異を自動検出
3. **テスト設計**: Given-When-Thenのシナリオが既にある
4. **コミュニケーション**: チーム全体で仕様を共有

### spec.mdの保存場所

```text
.claude/workspace/planning/[timestamp]-[feature-name]/
├── sow.md       # 計画書
└── spec.md      # 仕様書（自動参照される）
```

**重要**: `/code`と`/audit`は、最新のspec.mdを自動検出して参照します。手動での指定は不要です。

---

## ⚡ クイックスタート

### 1. 新しいタスクを始める

```bash
# 1. 計画を立てる
/think "実装する機能の説明"

# 2. 進捗を確認
/sow
```

### 2. 実装する

```bash
# 3. コードベースを理解
/research "関連する機能"

# 4. TDDで実装
/code

# 5. テストを実行
/test
```

### 3. 品質チェック

```bash
# 6. コードレビュー
/audit

# 7. 最終検証
/validate
```

---

## 🎓 学習パス

### 初心者（1-2週間）

1. このガイドを読む
2. [@./COMMANDS.md](./COMMANDS.md) でコマンドを学ぶ
3. 小さなバグ修正で `/fix` を試す
4. [@./DEVELOPMENT_WORKFLOW.md](./DEVELOPMENT_WORKFLOW.md) で実践的な手順を学ぶ

### 中級者（1ヶ月）

1. 完全なワークフローを実践（/think → /validate）
2. `/audit` の結果を活用してコード品質を向上

### 上級者（継続的）

1. [@./ARCHITECTURE.md](./ARCHITECTURE.md) でシステム全体を理解
2. カスタムルールやエージェントの追加を検討
3. チーム全体でのワークフロー統一

---

## 📋 コマンド選択ガイド

| 状況 | 推奨コマンド |
| --- | --- |
| 新機能を開始 | `/think` |
| コードを理解したい | `/research` |
| 実装する | `/code` |
| テストを実行 | `/test` |
| 品質を確認 | `/audit` |
| 進捗を確認 | `/sow` |
| 完了を検証 | `/validate` |
| 小さいバグ修正 | `/fix` |

---

## 🛠️ プロジェクトセットアップ

### 推奨設定

プロジェクトルートに `.claude/settings.json` を作成：

```json
{
  "hooks": {
    "after": {
      "Edit": "npm run check -- {{file_path}}",
      "Write": "npm run check -- {{file_path}}"
    }
  }
}
```

**詳細**: プロジェクトセットアップの詳細は [@./PROJECT_SETUP.md](./PROJECT_SETUP.md) を参照

---

## 🔗 ドキュメント構成

### 役割別ガイド

- **このファイル（WORKFLOW_GUIDE.md）**: クイックスタート・概要
- **[@./DEVELOPMENT_WORKFLOW.md](./DEVELOPMENT_WORKFLOW.md)**: 実践的なワークフロー手順
- **[@./COMMANDS.md](./COMMANDS.md)**: コマンドリファレンス
- **[@./ARCHITECTURE.md](./ARCHITECTURE.md)**: システムアーキテクチャ

### 管理ドキュメント

- **[@../../rules/guidelines/DOCUMENTATION_RULES.md](../../rules/guidelines/DOCUMENTATION_RULES.md)**: ドキュメント管理ルール
- **[@./PROJECT_SETUP.md](./PROJECT_SETUP.md)**: プロジェクトセットアップ

---

## ❓ よくある質問

### Q1: どのコマンドから始めるべき？

**A**: 新機能なら `/think`、バグ調査なら `/research` から開始。

### Q2: /fixはいつ使う？

**A**: 開発環境での素早いバグ修正に使用。緊急修正も対応可能。

### Q3: レビューエージェントは個別実行できる？

**A**: 現在は `/audit` による統合実行のみ。個別エージェントは将来実装予定。

### Q4: SOWとは？

**A**: Statement of Work。検証可能な作業計画書で、`/think`で作成。

### Q5: ドキュメントが多すぎる。どこから読むべき？

**A**:

1. このファイル（概要理解）
2. [@./DEVELOPMENT_WORKFLOW.md](./DEVELOPMENT_WORKFLOW.md)（実践手順）
3. 必要に応じて他の専門ドキュメント

---

## 📊 パフォーマンス目標

- エージェントタイムアウト: 30-60秒/フェーズ
- 総レビュー時間: <180秒
- コマンドレスポンス: <5秒

---

## 🎯 次のステップ

### すぐに始める

1. ✅ このガイドを読んだ（完了！）
2. 📖 [@./DEVELOPMENT_WORKFLOW.md](./DEVELOPMENT_WORKFLOW.md) で実践的な手順を学ぶ
3. 🚀 小さなタスクで `/think` → `/code` → `/test` を試す
4. 🔍 `/audit` でコード品質を確認

### チーム導入

1. このガイドをチームで共有
2. [@./COMMANDS.md](./COMMANDS.md) でコマンドを統一
3. 定期的な振り返りで改善

---

## 📞 サポート

- **ドキュメント**: このディレクトリ内の専門ドキュメントを参照
- **GitHub Issues**: <https://github.com/anthropics/claude-code/issues>
- **ヘルプコマンド**: `/help`

---

*最終更新: 2025-09-30*
*バージョン: 1.0*

---

**📝 Note**: このガイドは概要です。詳細な使用方法は各専門ドキュメントを参照してください。
