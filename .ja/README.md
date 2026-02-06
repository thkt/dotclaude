# Claude AI 設定

カスタムコマンド、開発原則、ワークフロー最適化を含むClaude AIの包括的な設定システム。

📌 **[English Version](../README.md)**

## 🎯 概要

このリポジトリにはClaude AIの個人設定が含まれています:

- 体系的な開発ワークフローのためのカスタムスラッシュコマンド
- コアAI動作原則と開発ベストプラクティス
- プログレッシブエンハンスメントとコード可読性ガイドライン
- 日本語サポート

## 📁 構造

```text
.claude/
├── CLAUDE.md              # メイン設定（AIが読み込む）
├── README.md              # このファイル - クイックスタートガイド
├── adr/                   # アーキテクチャ決定記録
├── commands/              # コマンド定義 (/code, /fix, /think など)
├── rules/                 # ルール定義
│   ├── core/             # コアAI動作原則
│   ├── conventions/      # ドキュメント規約
│   ├── development/      # 開発パターン & 方法論
│   └── workflows/        # ワークフローガイド
├── skills/               # スキルベースの知識モジュール（25スキル）
├── agents/               # 専門AIエージェント（35エージェント）
│   ├── analyzers/        # アーキテクチャ & コード分析
│   ├── architects/       # 機能アーキテクチャ設計
│   ├── critics/          # 発見チャレンジャー（devils-advocate）
│   ├── enhancers/        # コード改善 & シンプル化
│   ├── explorers/        # コードベース探索エージェント
│   ├── generators/       # コード/テスト/Git生成
│   ├── resolvers/        # ビルドエラー解決
│   ├── reviewers/        # コードレビューエージェント（14レビューア）
│   └── teams/            # 複合レビューア & 統合
└── .ja/                   # 日本語翻訳
```

## 🚀 クイックスタート

### オプション1: Claude Codeプラグインとしてインストール（推奨）

このリポジトリはClaude Codeプラグインとして利用可能で、特定のワークフローセットを簡単にインストールできます:

1. **このリポジトリをマーケットプレースとして追加**:

   ```bash
   /plugin marketplace add thkt/claude-config
   ```

2. **利用可能なプラグインを閲覧**:

   ```bash
   /plugin
   ```

3. **特定のプラグインをインストール**（1つ以上選択）:

   ```bash
   /plugin install complete-workflow-system  # フルTDD/RGRCワークフロー
   /plugin install quick-actions             # /fix, /polish
   /plugin install git-utilities             # /commit, /branch, /pr, /issue
   /plugin install documentation-tools       # /adr, /rulify, /docs
   /plugin install browser-workflows         # /e2e
   ```

**利用可能なプラグイン**:

- **complete-workflow-system**: 35の専門エージェントを含むフル開発ワークフロー
- **quick-actions**: 高速バグ修正 (/fix) と AIスロップ除去 (/polish)
- **git-utilities**: Gitワークフローヘルパー (commit, branch, PR, issue)
- **documentation-tools**: ADR作成とルール生成
- **browser-workflows**: E2Eテストと自動化
- **development-skills**: TDD、原則、パターン、セキュリティなど25スキル

### オプション2: 手動インストール（フル設定）

個人の `.claude` 設定として使用する場合:

1. このリポジトリをホームディレクトリにクローン:

   ```bash
   git clone https://github.com/thkt/.claude ~/.claude
   ```

2. 既に `.claude` ディレクトリがある場合は、まずバックアップ:

   ```bash
   mv ~/.claude ~/.claude.backup
   git clone https://github.com/thkt/.claude ~/.claude
   ```

**注**: 手動インストールにはすべてのコマンド、エージェント、ルール、個人設定が含まれます。プラグインインストールには共有コマンドとエージェントのみが含まれます（個人の `CLAUDE.md`、`rules/`、`settings.json` は除外）。

## 📦 依存関係 & セットアップ

### サンドボックス機能（オプションだが推奨）

Claude Codeのサンドボックス機能は、自動的な権限処理による安全なコマンド実行を提供し、安全性を維持しながら承認疲れを軽減します。

**システム要件**:

- macOSまたはLinux（Windowsはまだ未サポート）
- Node.js with npm/npx
- ripgrep（通常プリインストール済み）
- jaq（IDRフック用）: `brew install jaq`

**クイックセットアップ**:

```bash
# 自動セットアップ（推奨）
~/.claude/hooks/setup-sandbox.sh
```

**手動セットアップ**:

```bash
# 1. サンドボックスランタイムをインストール
npm install -g @anthropic-ai/sandbox-runtime

# 2. インストールを確認
srt --version

# 3. Claude Codeで有効化
# Claude Codeセッションでこのコマンドを実行:
/sandbox
# オプション1を選択: "Sandbox BashTool, with auto-allow in accept edits mode"
```

**機能**:

- ✅ 許可されたディレクトリへのファイルシステムアクセスを制限
- ✅ プロキシ経由でネットワークアクセスを制御
- ✅ サンドボックス内で安全なコマンドを自動実行
- ✅ サンドボックス制限に達した場合のみ承認を要求

**設定**（オプション）:

カスタム設定用に `~/.srt-settings.json` を作成:

```json
{
  "sandbox": {
    "enabled": true,
    "autoAllowBashIfSandboxed": true,
    "excludedCommands": ["docker"],
    "network": {
      "allowLocalBinding": true,
      "httpProxyPort": 8080
    }
  }
}
```

詳細は[公式ブログ記事](https://azukiazusa.dev/blog/claude-code-sandbox-feature/)を参照。

### 必要なプラグイン

一部のコマンドはこのリポジトリに含まれていない外部プラグインに依存しています。クローン後に手動でインストールしてください:

| プラグイン   | 使用コマンド | 用途                      | インストールコマンド         |
| ------------ | ------------ | ------------------------- | ---------------------------- |
| `ralph-loop` | `/code`      | TDD Greenフェーズ自動反復 | `/plugin install ralph-loop` |

**インストール**:

```bash
/plugin install ralph-loop
```

**注**: プラグインは `~/.claude/plugins/` に保存され、gitから除外されています。各ユーザーが個別にインストールする必要があります。

## 📝 利用可能なコマンド

コマンドリファレンスを参照:

- [コマンドリファレンス（日本語）](./rules/workflows/WORKFLOW_GUIDE.md)
- [English Command Reference](../rules/workflows/WORKFLOW_GUIDE.md)

## 🔄 標準ワークフロー

### 機能開発（拡張版）

```txt
/research → /think → /code → /test → /audit → /validate
```

### 進捗モニタリング

```txt
/sow (いつでも進捗確認)
```

### バグ調査 & 修正

```txt
/research → /fix
```

## 🌏 言語サポート

- **AI処理**: 内部的には英語
- **ユーザー出力**: 日本語（設定可能）
- **ドキュメント**: 英語と日本語の両方で利用可能

## 🛠️ 主要機能

### コアAI原則

- **安全第一**: ファイル削除はゴミ箱（`~/.Trash/`）を使用、破壊的操作は確認が必要
- **ユーザー権限**: ユーザー指示が最終的な権限
- **出力検証可能性**: 主張は証拠に基づく（ファイルパス、信頼度マーカー ✓/→/?）

### 開発アプローチ

- **オッカムの剃刀**: 機能する最もシンプルな解決策を選択
- **プログレッシブエンハンスメント**: シンプルに作り、徐々に強化
- **TDD/RGRC**: Red-Green-Refactor-Commit サイクルで信頼性の高いコード

詳細: [PRINCIPLES.md](../rules/PRINCIPLES.md)

## 📚 ドキュメント

### コアドキュメント

- [設計思想](./docs/DESIGN.md) — **なぜこの設計か**（Design Philosophy）
- [コマンドリファレンス（日本語）](./rules/workflows/WORKFLOW_GUIDE.md)
- [コマンドリファレンス（英語）](../rules/workflows/WORKFLOW_GUIDE.md)
- [設定ガイド（日本語）](./CLAUDE.md)
- [設定ガイド（英語）](../CLAUDE.md)

### 開発ガイド

- [原則ガイド](../rules/PRINCIPLES.md) - すべての開発原則の完全な概要
- [ドキュメントルール](../rules/conventions/DOCUMENTATION.md) - ドキュメントの標準

## 🤝 貢献

このリポジトリを自由にフォークして、必要に応じてカスタマイズしてください。改善のプルリクエストを歓迎します！

## 📜 ライセンス

MITライセンス - 自由に使用・変更してください。

## 👤 作者

thkt

---

_この設定は、品質、可読性、保守性に重点を置いた体系的なソフトウェア開発のためにClaude AIの機能を強化します。_
