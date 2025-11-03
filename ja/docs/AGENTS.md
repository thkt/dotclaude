# エージェントガイド

Claude Codeの14エージェント - 構造、役割、使用法の完全ガイド

---

## 📋 目次

1. [エージェント概要](#エージェント概要)
2. [エージェント一覧](#エージェント一覧)
3. [実行フロー](#実行フロー)
4. [モデル選択基準](#モデル選択基準)
5. [使用方法](#使用方法)

---

## エージェント概要

### 総数: 14エージェント

**カテゴリ別内訳:**

- オーケストレーター: 1個
- フロントエンド専門: 9個
- 汎用: 4個（test-generator含む）

### 役割

全エージェントは `/review` コマンドで自動実行され、コードの各側面を専門的にレビュー。

---

## エージェント一覧

### オーケストレーター（1個）

| エージェント | モデル | 色 | 役割 |
|------------|--------|-----|------|
| review-orchestrator | opus | indigo | レビュー全体の統括・優先度付け・結果統合 |

### フロントエンド専門（9個）

| エージェント | モデル | 色 | 専門分野 |
|------------|--------|-----|----------|
| readability-reviewer | sonnet | cyan | コード可読性・The Art of Readable Code原則 |
| structure-reviewer | sonnet | magenta | コード構造・無駄・重複・根本的問題解決 |
| root-cause-reviewer | opus | red | 根本原因分析・深い問題解決 |
| type-safety-reviewer | sonnet | cyan | TypeScript型安全性・型カバレッジ |
| performance-reviewer | sonnet | orange | パフォーマンス最適化・バンドルサイズ |
| ~~security-reviewer~~ | - | - | ※security-review skillに統合されました |
| accessibility-reviewer | sonnet | pink | WCAG準拠・アクセシビリティ |
| design-pattern-reviewer | sonnet | purple | React設計パターン・Container/Presentational |
| testability-reviewer | sonnet | green | テスタビリティ・依存性注入・純粋関数 |

### 汎用（4個）

| エージェント | モデル | 色 | 専門分野 |
|------------|--------|-----|----------|
| progressive-enhancer | sonnet | lime | プログレッシブエンハンスメント・CSS-first |
| test-generator | sonnet | cyan | TDD原則に基づくテスト生成 |
| document-reviewer | sonnet | brown | 技術文書品質・README・API仕様書 |
| subagent-reviewer | opus | gray | エージェント定義ファイルのメタレビュー |

---

## 実行フロー

### 3フェーズ実行

```text
Phase 1: 基礎レビュー（30秒タイムアウト）
├── structure-reviewer
├── readability-reviewer
├── root-cause-reviewer
└── progressive-enhancer

Phase 2: 品質レビュー（45秒タイムアウト）
├── type-safety-reviewer
├── design-pattern-reviewer
├── testability-reviewer
└── document-reviewer（.mdファイル検出時）

Phase 3: 本番対応レビュー（60秒タイムアウト）
├── performance-reviewer
└── accessibility-reviewer
# 注記: セキュリティレビューはsecurity-review skillで実施
```

### コマンド統合

**`/review` コマンド:**

- 全レビューエージェントを自動実行
- ファイルタイプに応じて適切なエージェントを選択
- .mdファイル検出時はdocument-reviewerを自動追加

**`/code` コマンド:**

- test-generatorを使用してTDDテスト生成

---

## モデル選択基準

### Opus使用（4エージェント）

**目的**: 複雑な推論・深い分析が必要なタスク

**エージェント:**

- review-orchestrator: 統括・優先度判断
- root-cause-reviewer: 根本原因分析
- subagent-reviewer: メタレビュー

### Sonnet使用（10エージェント）

**目的**: パターン認識・構造分析タスク

**エージェント:** その他すべてのレビュアー

### 選択デシジョンツリー

```text
タスクの性質は？
├─ 複数の分析を調整する → Opus
├─ 複雑な問題の根本原因を見つける → Opus
├─ 他の評価を評価する → Opus
└─ 既知のパターンに対してチェック → Sonnet
   ├─ コード品質パターン → Sonnet
   ├─ セキュリティパターン → Sonnet
   ├─ パフォーマンスパターン → Sonnet
   └─ アクセシビリティパターン → Sonnet
```

---

## 使用方法

### アクティブエージェント（コマンドで使用）

#### `/review` で自動実行

**オーケストレーター:**

- review-orchestrator - すべてのレビュー活動を調整

**フロントエンドレビュアー:**

- readability-reviewer - コードの可読性と明確性
- structure-reviewer - コードの構成とアーキテクチャ
- root-cause-reviewer - 深い問題分析
- type-safety-reviewer - TypeScriptの型安全性
- performance-reviewer - パフォーマンス最適化
- ~~security-reviewer~~ - ※security-review skillに統合
- accessibility-reviewer - WCAG準拠
- design-pattern-reviewer - Reactパターン
- testability-reviewer - テスト設計

**汎用レビュアー:**

- progressive-enhancer - プログレッシブエンハンスメントアプローチ

#### `/code` で使用

**汎用ユーティリティ:**

- test-generator - SOWテスト計画からテストを生成

### 内部/ユーティリティエージェント

#### document-reviewer

**目的**: 技術文書の品質をレビュー

**使用例:**

- README.mdファイルの作成/更新時にレビュー
- APIドキュメントの検証
- ルールファイルと設定ドキュメントのチェック

**統合:**

- `.md`ファイル変更時に自動トリガー
- `/review`に条件付きで追加

#### subagent-reviewer

**目的**: エージェント定義ファイルをレビューするメタエージェント

**使用例:**

- 新しいエージェント定義の検証
- YAMLフロントマターフォーマットのレビュー
- ツール権限とモデル選択のチェック

**統合:**

- 新しいエージェント作成時に自動トリガー
- システムメンテナンスの一部として使用

---

## エージェント間の協調関係

### 相互参照パターン

| エージェント | 協調するエージェント | 理由 |
|------------|-------------------|------|
| structure-reviewer | root-cause-reviewer | 構造問題の根本原因分析 |
| readability-reviewer | design-pattern-reviewer | 可読性とパターンの整合性 |
| type-safety-reviewer | testability-reviewer | 型安全性とテスト容易性 |
| performance-reviewer | security-review (skill) | 最適化とセキュリティのバランス |
| accessibility-reviewer | progressive-enhancer | アクセシビリティとプログレッシブエンハンスメント |

---

## カラーコード凡例

### 機能別グループ

- **🔵 青系 (cyan/indigo)**: 明瞭性・統括
- **🔴 赤系 (red/magenta/pink)**: 構造・重要分析
- **🟡 黄系 (yellow/orange)**: 警告・最適化
- **🟢 緑系 (green/lime)**: テスト・成長
- **🟣 紫系 (purple)**: パターン・設計
- **⚫ 中立系 (gray/brown)**: メタ・ドキュメント

### カラーの意味的関連付け

| 色 | 意味 | 使用エージェント |
|-----|------|----------------|
| indigo | リーダーシップ・統括 | review-orchestrator |
| cyan | 明瞭性・透明性 | readability-reviewer, type-safety-reviewer, test-generator |
| magenta | アーキテクチャ・構造 | structure-reviewer |
| red | 重要・深い分析 | root-cause-reviewer |
| orange | スピード・最適化 | performance-reviewer |
| ~~yellow~~ | ~~警告・セキュリティ~~ | ~~security-reviewer~~ ※skillに統合 |
| pink | インクルーシブデザイン | accessibility-reviewer |
| purple | パターン・設計 | design-pattern-reviewer |
| green | テスト・成功 | testability-reviewer |
| lime | 成長・向上 | progressive-enhancer |
| brown | ドキュメント・紙 | document-reviewer |
| gray | メタ・中立 | subagent-reviewer |

---

## パフォーマンス目標

| フェーズ | タイムアウト | エージェント数 |
|---------|------------|-------------|
| Phase 1 | 30秒 | 4エージェント |
| Phase 2 | 45秒 | 3-4エージェント |
| Phase 3 | 60秒 | 3エージェント |
| 合計最大 | 180秒 | 10-11エージェント |

---

## 新規エージェント追加時のチェックリスト

プロジェクトの成長に伴い、新しいエージェントを追加する際のガイドライン：

- [ ] YAMLフロントマター（name, description, tools, model, color）
- [ ] ユニークな色の割り当て
- [ ] 適切なディレクトリ配置（frontend/general/orchestrators）
- [ ] review-orchestratorへの統合
- [ ] コマンドへのマッピング
- [ ] このドキュメントへの追加

---

## 推奨事項

### 今後の改善

1. **自動トリガー設定**: settings.jsonにフック追加
2. **カバレッジ追跡**: 各エージェントの利用頻度分析
3. **カスタムルール**: プロジェクト固有のレビュールール対応

### 利用統計（想定）

| 頻度 | エージェント | 用途 |
|-----|------------|------|
| 高 | readability, structure | 日常的なコードレビュー |
| 中 | type-safety, security | 品質チェック |
| 低 | document, subagent | 特定条件時のみ |

---

*最終更新: 2025-09-30*
*バージョン: 1.0*
