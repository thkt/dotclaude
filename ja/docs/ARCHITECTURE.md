# Claude AIアーキテクチャ概要

Claude AI設定システムの包括的な技術アーキテクチャドキュメント。

## 📁 ディレクトリ構造と設定

```text
~/.claude/
├── CLAUDE.md              # グローバル設定（AIが読む）
├── README.md              # クイックスタートと概要
├── settings.json          # ツール権限と設定
├── docs/                  # ドキュメント（英語版）
│   ├── ARCHITECTURE.md   # このファイル - システムアーキテクチャ
│   ├── COMMANDS.md       # コマンドリファレンス
│   ├── MODEL_SELECTION.md # モデル選択ガイドライン
│   └── PROJECT_SETUP.md  # プロジェクトセットアップガイド
│
├── agents/                # エージェント定義（計14個）
│   ├── orchestrators/
│   │   └── review-orchestrator.md
│   ├── frontend/
│   │   ├── readability-reviewer.md
│   │   ├── structure-reviewer.md
│   │   ├── root-cause-reviewer.md
│   │   ├── type-safety-reviewer.md
│   │   ├── performance-reviewer.md
│   │   ├── security-reviewer.md
│   │   ├── accessibility-reviewer.md
│   │   ├── design-pattern-reviewer.md
│   │   └── testability-reviewer.md
│   └── general/
│       ├── progressive-enhancer.md
│       ├── document-reviewer.md
│       └── subagent-reviewer.md
│
├── commands/              # コマンド定義（8個アクティブ）
│   ├── code.md           # TDD/RGRC実装
│   ├── fix.md            # 素早いバグ修正
│   ├── hotfix.md         # 緊急本番修正
│   ├── research.md       # 実装なしの調査
│   ├── review.md         # コードレビューオーケストレーション
│   ├── test.md           # 包括的テスト
│   ├── think.md          # 計画とSOW作成
│   └── gemini/
│       └── search.md     # Gemini経由のGoogle検索
│
├── rules/                 # 開発原則（7ファイル）
│   ├── core/
│   │   └── AI_OPERATION_PRINCIPLES.md
│   ├── commands/
│   │   ├── COMMAND_SELECTION.md
│   │   └── STANDARD_WORKFLOWS.md
│   ├── development/
│   │   ├── PROGRESSIVE_ENHANCEMENT.md
│   │   ├── READABLE_CODE.md
│   │   └── CONTAINER_PRESENTATIONAL.md
│   └── reference/
│       └── PRE_TASK_CHECK.md
│
├── ja/                    # 日本語翻訳
│   ├── CLAUDE.md
│   ├── docs/
│   │   ├── WORKFLOW_GUIDE.md       # クイックスタートガイド
│   │   ├── DEVELOPMENT_WORKFLOW.md # 開発ワークフロー実践
│   │   ├── AGENTS.md               # エージェントガイド
│   │   ├── COMMANDS.md             # コマンドリファレンス
│   │   ├── ARCHITECTURE.md         # このファイル
│   │   ├── DOCUMENTATION_RULES.md  # ドキュメント管理ルール
│   │   ├── MODEL_SELECTION.md      # モデル選択
│   │   └── PROJECT_SETUP.md        # プロジェクトセットアップ
│   ├── agents/
│   ├── commands/
│   └── rules/
│
└── workspace/            # 作業ファイル
    └── sow/             # SOW文書
```

## 🤖 エージェントシステム（14エージェント）

### エージェントカテゴリ

#### オーケストレーター（1）

- **review-orchestrator** [opus/indigo] - コードレビューのマスターオーケストレーター

#### フロントエンドスペシャリスト（9）

- **readability-reviewer** [sonnet/cyan] - コードの明確性と保守性
- **structure-reviewer** [sonnet/magenta] - コード構成とパターン
- **root-cause-reviewer** [opus/red] - 深い問題分析
- **type-safety-reviewer** [sonnet/cyan] - TypeScript型検証
- **performance-reviewer** [sonnet/orange] - パフォーマンス最適化
- **security-reviewer** [sonnet/yellow] - セキュリティ脆弱性検出
- **accessibility-reviewer** [sonnet/pink] - WCAG準拠
- **design-pattern-reviewer** [sonnet/purple] - Reactパターン検証
- **testability-reviewer** [sonnet/green] - テストカバレッジと品質

#### 汎用（3）

- **progressive-enhancer** [sonnet/lime] - プログレッシブエンハンスメントアプローチ
- **document-reviewer** [sonnet/brown] - ドキュメント品質
- **subagent-reviewer** [opus/gray] - エージェント定義検証

### モデル選択戦略

| モデル | 使用例 | エージェント |
|--------|--------|-------------|
| **opus** | 複雑な推論、オーケストレーション | review-orchestrator、root-cause-reviewer、subagent-reviewer |
| **sonnet** | パターン認識、検証 | その他すべてのレビュアー（11エージェント） |

### エージェント実行フェーズ

```text
フェーズ1: 基盤（30秒タイムアウト）
├── structure-reviewer
├── readability-reviewer
├── root-cause-reviewer
└── progressive-enhancer

フェーズ2: 品質（45秒タイムアウト）
├── type-safety-reviewer
├── design-pattern-reviewer
├── testability-reviewer
└── document-reviewer（条件付き：.mdファイル）

フェーズ3: 本番（60秒タイムアウト）
├── performance-reviewer
├── security-reviewer
└── accessibility-reviewer
```

## 🎯 コマンドシステム（8コマンド）

### コマンドカテゴリ

#### コア開発（5）

| コマンド | 目的 | ワークフロー位置 |
|---------|------|-----------------|
| `/think` | 計画とSOW作成 | 開始 |
| `/research` | 実装なしの調査 | 分析 |
| `/code` | TDD/RGRC実装 | 開発 |
| `/test` | 包括的テスト | 検証 |
| `/review` | エージェントによるコードレビュー | 品質 |

#### クイックアクション（2）

| コマンド | 目的 | 環境 |
|---------|------|------|
| `/fix` | 素早いバグ修正 | 開発 |
| `/hotfix` | 緊急本番修正 | 本番 |

#### 外部ツール（1）

| コマンド | 目的 | 要件 |
|---------|------|------|
| `/gemini:search` | Google検索 | Gemini CLI |

### 標準ワークフロー

```text
機能開発:
/research → /think → /code → /test → /review

バグ調査:
/research → /fix → /test

緊急対応:
/hotfix（スタンドアロン）

コード品質チェック:
/review（いつでも使用可能）
```

## 📚 ルールシステム（7ファイル）

### ルールカテゴリ

#### コアルール（1）

- **AI_OPERATION_PRINCIPLES.md** - トップレベルAI動作原則

#### コマンドルール（2）

- **COMMAND_SELECTION.md** - 動的コマンド検出と選択
- **STANDARD_WORKFLOWS.md** - 事前定義されたワークフローパターン

#### 開発パターン（3）

- **PROGRESSIVE_ENHANCEMENT.md** - CSS優先、シンプルに構築→強化
- **READABLE_CODE.md** - 「The Art of Readable Code」に基づく
- **CONTAINER_PRESENTATIONAL.md** - Reactコンポーネント分離パターン

#### リファレンス（1）

- **PRE_TASK_CHECK.md** - タスク理解と実行計画

### ルール優先度階層

```markdown
1. ユーザー指示（最終権限）
2. CLAUDE.mdグローバル設定
3. AI_OPERATION_PRINCIPLES.md
4. コマンド固有のルール
5. 開発パターンルール
```

## 🔄 統合ポイント

### エージェント-コマンド統合

| コマンド | 使用エージェント | 条件ロジック |
|---------|-----------------|-------------|
| `/review` | すべての11レビュアー | .mdファイル存在時はdocument-reviewer |
| `/code` | 直接なし | レビュー提案をトリガー可能 |
| `/test` | 直接なし | performance-reviewerをトリガー可能 |

### ルール-コマンド統合

| ルール | 影響を受けるコマンド | 統合タイプ |
|--------|-------------------|-----------|
| PRE_TASK_CHECK | すべてのコマンド | 理解検証 |
| PROGRESSIVE_ENHANCEMENT | `/code`、`/fix` | 実装アプローチ |
| READABLE_CODE | `/code`、`/review` | コード品質基準 |
| CONTAINER_PRESENTATIONAL | `/code` | コンポーネント構造 |

### 言語処理

```markdown
入力: 日本語（ユーザーから）
     ↓
内部: 英語（AI処理）
     ↓
テンプレート: 英語（翻訳ノート付き）
     ↓
出力: 日本語（ユーザーへ）
```

## 🔧 設定ファイル

### settings.json

- ツール権限
- コマンドショートカット
- エージェント設定
- ファイル操作安全性（rm無効）

### CLAUDE.md

- 優先ルール（P1：言語、P2：開発、P3：安全性）
- グローバル指示
- オーバーライド動作

### ワークスペース構造

```text
workspace/
└── sow/
    └── [timestamp]-[task].md  # /thinkからのSOW文書
```

## 📊 システムメトリクス

### パフォーマンス目標

- エージェントタイムアウト：フェーズあたり30-60秒
- 総レビュー時間：<180秒
- コマンドレスポンス：<5秒
- ファイル操作：即時

### カバレッジ

- **言語**: TypeScript、React、JavaScript、CSS
- **標準**: WCAG 2.1、OWASP Top 10
- **パターン**: SOLID、DRY、TDD/RGRC
- **フレームワーク**: React、Next.js、Node.js

## 🚀 拡張ポイント

### 新しいエージェントの追加

1. 適切なディレクトリにエージェントファイルを作成
2. YAMLフロントマター（name、description、model、tools、color）を追加
3. ユニークな色を割り当て
4. review-orchestrator.mdを更新
5. コマンドマッピングを更新
6. ja/docs/AGENTS.mdに文書化

### 新しいコマンドの追加

1. commands/にコマンドファイルを作成
2. ワークフロー統合を追加
3. docs/COMMANDS.mdを更新
4. 日本語翻訳を作成
5. コマンド選択ロジックをテスト

### 新しいルールの追加

1. 適切なサブディレクトリにルールファイルを作成
2. 優先度レベルを定義
3. 統合ポイントを更新
4. このファイルに文書化

## 📈 進化戦略

### 現在の状態（v2.0）

- 14エージェント（3オーケストレーター/汎用、11専門）
- 8アクティブコマンド
- 7ルールファイル
- 完全な日本語サポート

### 将来の検討事項

- バックエンドエージェント統合（API、データベースレビュー）
- CI/CDパイプラインエージェント
- 自動修正生成
- 日本語以外の多言語サポート

## 🔐 安全機能

### ファイル操作

- `rm`コマンド無効
- 代わりに~/.Trash/にファイル移動
- すべての変更に確認が必要
- 理解のためのPRE_TASK_CHECK

### 実行制御

- 各ステップでユーザー確認
- エージェントのタイムアウト制限
- ホットフィックスのロールバック計画
- 明示的な実行計画

## 📖 ドキュメント

### 英語ドキュメント

- README.md - クイックスタート
- docs/ARCHITECTURE.md - このファイル
- docs/COMMANDS.md - コマンドリファレンス
- docs/PROJECT_SETUP.md - セットアップガイド
- CLAUDE.md - 設定

### 日本語ドキュメント

- ja/CLAUDE.md - 設定
- ja/docs/WORKFLOW_GUIDE.md - クイックスタートガイド
- ja/docs/DEVELOPMENT_WORKFLOW.md - 開発ワークフロー実践
- ja/docs/AGENTS.md - エージェント完全ガイド
- ja/docs/COMMANDS.md - コマンドリファレンス
- ja/docs/ARCHITECTURE.md - システムアーキテクチャ

## 🎓 主要概念

### プログレッシブエンハンスメント

デフォルト哲学：シンプルに構築→段階的に強化

- CSS優先ソリューション
- クイックフィックスより根本原因
- シンプルさによるエレガンス

### コード可読性

「The Art of Readable Code」に基づく：

- 理解時間の最小化
- 明確な命名と意図
- シンプルで直接的な解決策

### Container/Presentationalパターン

Reactコンポーネント分離：

- Containers：ロジックとデータ
- Presentational：UIのみ
- Propsのみのコンポーネント
- 最大限の再利用性

---

*最終更新: 2025-09-30*
*バージョン: 2.0*
*作成者: thkt*
