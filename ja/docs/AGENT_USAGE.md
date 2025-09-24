# エージェント使用ドキュメント

## エージェントのカテゴリと使用法

### アクティブエージェント（コマンドで使用）

#### オーケストレーター

- **review-orchestrator** - `/review`コマンドですべてのレビュー活動を調整

#### フロントエンドレビュアー（`/review`で使用）

- **readability-reviewer** - コードの可読性と明確性
- **structure-reviewer** - コードの構成とアーキテクチャ
- **root-cause-reviewer** - 深い問題分析
- **type-safety-reviewer** - TypeScriptの型安全性
- **performance-reviewer** - パフォーマンス最適化
- **security-reviewer** - セキュリティ脆弱性
- **accessibility-reviewer** - WCAG準拠
- **design-pattern-reviewer** - Reactパターン
- **testability-reviewer** - テスト設計

#### 一般レビュアー（`/review`で使用）

- **progressive-enhancer** - プログレッシブエンハンスメントアプローチ

### 内部/ユーティリティエージェント（コマンドで直接公開されていない）

#### document-reviewer

**目的**: 技術文書の品質をレビュー
**使用例**:

- README.mdファイルの作成/更新時にレビュー
- APIドキュメントの検証
- ルールファイルと設定ドキュメントのチェック
- ドキュメントレビューが必要な時に他のエージェントから呼び出し可能

**統合の提案**:

- `.md`ファイル変更時に自動トリガー
- ドキュメントファイルが含まれる場合は`/review`に追加
- ドキュメント生成時に`/code`と併用

#### subagent-reviewer

**目的**: エージェント定義ファイルをレビューするメタエージェント
**使用例**:

- アクティベーション前の新しいエージェント定義の検証
- エージェントのYAMLフロントマターフォーマットのレビュー
- ツール権限とモデル選択のチェック
- エージェント定義間の一貫性の確保

**統合の提案**:

- 新しいエージェント作成時に自動トリガー
- システムメンテナンスの一部として使用
- 別の`/review-agents`コマンドとして実装可能

## 推奨事項

1. **document-reviewerを公開**: ドキュメントファイル用に`/review`コマンドに追加
2. **`/review-agents`コマンドを作成**: エージェントメンテナンス用にsubagent-reviewerを使用
3. **自動トリガー**: 関連ファイル変更時にこれらのエージェントを自動実行するフックを設定

## カラー割り当てリファレンス

| エージェント | カラー | 意味 |
|------------|--------|------|
| review-orchestrator | indigo | リーダーシップ/調整 |
| readability-reviewer | cyan | 明確性/透明性 |
| structure-reviewer | magenta | アーキテクチャ/構造 |
| root-cause-reviewer | red | 重要/深い分析 |
| type-safety-reviewer | cyan | 型システム |
| performance-reviewer | orange | スピード/最適化 |
| security-reviewer | yellow | 警告/セキュリティ |
| accessibility-reviewer | pink | インクルーシブデザイン |
| design-pattern-reviewer | purple | パターン/設計 |
| testability-reviewer | green | テスト/成功 |
| progressive-enhancer | lime | 成長/エンハンスメント |
| document-reviewer | brown | ドキュメント/紙 |
| subagent-reviewer | gray | メタ/中立 |
