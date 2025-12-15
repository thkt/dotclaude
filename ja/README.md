# Claude AI 設定

カスタムコマンド、開発原則、ワークフロー最適化を含むClaude AIの包括的な設定システム。

## 🎯 概要

このリポジトリにはClaude AIの個人設定が含まれています：

- 体系的な開発ワークフローのためのカスタムスラッシュコマンド
- コアAI動作原則と開発ベストプラクティス
- プログレッシブエンハンスメントとコード可読性ガイドライン
- 日本語サポート

## 📁 構造

```txt
.claude/
├── CLAUDE.md              # メイン設定（AIが読む）
├── README.md              # クイックスタートガイド（英語版）
├── docs/                  # ドキュメント
│   ├── COMMANDS.md       # コマンドリファレンス（英語）
│   └── DOCUMENTATION_RULES.md # ドキュメント標準
├── commands/              # コマンド定義
│   ├── code.md           # TDD/RGRC実装
│   ├── fix.md            # クイックバグ修正
│   ├── hotfix.md         # 緊急本番修正
│   ├── research.md       # 実装なしの調査
│   ├── review.md         # コードレビューオーケストレーション
│   ├── test.md           # 包括的テスト
│   └── think.md          # 計画とSOW作成
├── rules/                 # 英語版ルール定義
│   ├── core/             # [P0] コアAI動作原則
│   │   └── AI_OPERATION_PRINCIPLES.md
│   ├── PRINCIPLES_GUIDE.md  # 完全な原則ガイド
│   ├── commands/         # コマンド選択ロジック
│   ├── development/      # 開発パターンと方法論
│   └── reference/        # 基本原則（SOLID、DRY、オッカムの剃刀）
├── skills/               # スキルベースの知識モジュール
│   ├── pre-task-check/   # タスク理解検証（自動起動）
│   ├── performance-optimization/  # Webパフォーマンス知識
│   └── esa-daily-report/ # プロジェクト固有の自動化
└── ja/                    # 日本語翻訳
    ├── CLAUDE.md         # メイン設定（日本語）
    ├── README.md         # このファイル
    ├── commands/         # コマンド定義（日本語）
    └── rules/            # ルール定義（日本語）
```

## 🚀 クイックスタート

### Option 1: Claude Codeプラグインとしてインストール（推奨）

このリポジトリはClaude Codeプラグインとして利用可能で、特定のワークフローセットを簡単にインストールできます：

1. **このリポジトリをマーケットプレイスとして追加**:

   ```bash
   /plugin marketplace add thkt/claude-config
   ```

2. **利用可能なプラグインを閲覧**:

   ```bash
   /plugin
   ```

3. **特定のプラグインをインストール**（1つまたは複数を選択）:

   ```bash
   /plugin install complete-workflow-system  # 完全なTDD/RGRCワークフロー
   /plugin install quick-actions             # /fixと/hotfix
   /plugin install automation-commands       # /auto-test、/full-cycle
   /plugin install git-utilities             # /commit、/branch、/pr
   /plugin install documentation-tools       # /adr、/adr:rule
   /plugin install browser-workflows         # /workflow:create
   /plugin install utilities                 # /context
   ```

**利用可能なプラグイン**:

- **complete-workflow-system**: 16個の専門エージェントを含む完全な開発ワークフロー
- **quick-actions**: 素早いバグ修正（/fix）と緊急修正（/hotfix）
- **automation-commands**: 自動テストと完全サイクル自動化
- **git-utilities**: Gitワークフローヘルパー（commit、branch、PR）
- **documentation-tools**: ADR作成とルール生成
- **browser-workflows**: E2Eテストと自動化
- **utilities**: 開発診断ツール

### Option 2: 手動インストール（完全な設定）

個人の`.claude`設定として使用する場合：

1. このリポジトリをホームディレクトリにクローン：

   ```bash
   git clone https://github.com/thkt/.claude ~/.claude
   ```

2. すでに`.claude`ディレクトリがある場合は、先にバックアップを取ってください：

   ```bash
   mv ~/.claude ~/.claude.backup
   git clone https://github.com/thkt/.claude ~/.claude
   ```

**注意**: 手動インストールには、すべてのコマンド、エージェント、ルール、個人設定が含まれます。プラグインインストールには、共有コマンドとエージェントのみが含まれます（個人の`CLAUDE.md`、`rules/`、`settings.json`は除外されます）。

## 📦 依存関係とセットアップ

### サンドボックス機能（オプションだが推奨）

Claude Codeのサンドボックス機能は、自動的な権限処理により安全なコマンド実行を提供し、承認疲れを軽減しながら安全性を維持します。

**システム要件**:

- macOSまたはLinux（Windowsはまだ未対応）
- Node.jsとnpm/npx
- ripgrep（通常はプリインストール済み）

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
# Claude Codeセッションで以下のコマンドを実行：
/sandbox
# オプション1を選択：「Sandbox BashTool, with auto-allow in accept edits mode」
```

**機能**:

- ✅ ファイルシステムアクセスを許可されたディレクトリに制限
- ✅ プロキシ経由でネットワークアクセスを制御
- ✅ サンドボックス内で安全なコマンドを自動実行
- ✅ サンドボックス制限に抵触した場合のみ承認を要求

**設定**（オプション）:

カスタム設定のために`~/.srt-settings.json`を作成：

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

詳細は[公式ブログ記事](https://azukiazusa.dev/blog/claude-code-sandbox-feature/)を参照してください。

## 📝 利用可能なコマンド

Claude Codeは5つのカテゴリに分類された15の専門コマンドを提供します：

### コマンドカテゴリ

- **コア開発** (7個): 計画から検証までの完全なワークフロー
  - `/think`, `/research`, `/code`, `/test`, `/review`, `/sow`, `/validate`

- **クイックアクション** (2個): 迅速なバグ修正
  - `/fix` (開発環境), `/hotfix` (本番緊急対応)

- **自動化** (2個): テストと開発サイクルの自動化
  - `/auto-test`, `/full-cycle`

- **ドキュメント** (2個): アーキテクチャ決定と規則
  - `/adr`, `/adr:rule`

- **外部ツール** (1個): ブラウザ自動化
  - `/workflow:create`

**📚 詳細リファレンス**: 各コマンドの詳しい使用方法は以下を参照

- [English Command Reference](./docs/COMMANDS.md)
- [日本語コマンドリファレンス](./ja/docs/COMMANDS.md)

## 🔄 標準ワークフロー

### 機能開発（拡張版）

```txt
/research → /think → /code → /test → /review → /validate
```

### 進捗モニタリング

```txt
/sow （いつでも進捗確認）
```

### バグ調査と修正

```txt
/research → /fix
```

### 緊急対応

```txt
/hotfix （重大な問題に対して単独で使用）
```

### 自動化ワークフロー（SlashCommandツールで新登場）

```txt
/auto-test        # 自動テスト → 修正サイクル
/full-cycle       # 完全自動開発フロー
```

## 🌏 言語サポート

- **AI処理**: 内部的に英語
- **ユーザー出力**: 日本語（設定可能）
- **ドキュメント**: 英語と日本語の両方で利用可能

## 🛠️ 主な機能

### コアAI動作原則

- **安全第一**: 破壊的操作の安全境界を維持
- **ユーザー権限**: ユーザーの指示が最終的な権限
- **ワークフロー統合**: 構造化された操作のためにPRE_TASK_CHECKに従う
- **出力の検証可能性**: 出力が検証可能で透明であることを確保
  - 事実と仮定を区別する
  - 主張に対する証拠を提供（ファイルパス、行番号、参照）
  - 不確実な場合は信頼度レベルを明示的に述べる

### 開発原則

- **オッカムの剃刀**: 動作する最もシンプルな解決策を選ぶ（メタ原則）
- **プログレッシブエンハンスメント**: CSSファーストアプローチ、シンプルに構築 → 強化
- **コード可読性**: 「The Art of Readable Code」に基づく
- **Container/Presentational**: Reactコンポーネントパターン
- **SOLID、DRY、TDD/RGRC**: 業界のベストプラクティス
- **包括的ガイド**: すべての原則については[PRINCIPLES_GUIDE.md](../rules/PRINCIPLES_GUIDE.md)を参照

### 安全機能

- ファイル削除は永久削除ではなくゴミ箱（`~/.Trash/`）を使用
- 信頼度レベルマーカー（✓/→/?）付きの事前タスク理解度チェック
- ファイル変更にはユーザー確認が必要
- 破壊的操作前の実行計画

## 📚 ドキュメント

### コアドキュメント

- [コマンドリファレンス（英語）](../docs/COMMANDS.md)
- [コマンドリファレンス（日本語）](./docs/COMMANDS.md)
- [システムアーキテクチャ](../docs/ARCHITECTURE.md)
- [設定ガイド](../CLAUDE.md)
- [日本語設定](./CLAUDE.md)

### 開発ガイド

- [原則ガイド](../rules/PRINCIPLES_GUIDE.md) - すべての開発原則の完全な概要
- [ドキュメントルール](../docs/DOCUMENTATION_RULES.md) - ドキュメントの標準

## 🤝 貢献

このリポジトリをフォークして、ニーズに合わせてカスタマイズしてください。改善のプルリクエストを歓迎します！

## 📜 ライセンス

MITライセンス - 自由に使用・修正してください。

## 📅 最近の更新

**2025-10-02** - ドキュメント同期とコアルール強化

- すべてのドキュメントに[P0] コアAI動作ルールを追加
- 英語版と日本語版を完全に同期
- 信頼度マーカー付きの出力の検証可能性原則を追加
- 検証可能な出力要件でPRE_TASK_CHECKを強化
- PRINCIPLES_GUIDE.mdにMermaid原則依存グラフを追加

**2025-01-09** - ドキュメント強化

- すべての開発原則のための包括的な[PRINCIPLES_GUIDE.md](../rules/PRINCIPLES_GUIDE.md)を追加
- `rules/`ディレクトリ構造を再編成（reference → development）
- すべてのドキュメントで用語を標準化（Core Philosophy、Core Principles）
- すべてのエージェントとコマンドに原則参照を追加
- 英語版と日本語版の一貫性を改善

## 👤 作者

Your Name

---

*この設定は、品質、可読性、保守性に焦点を当てた体系的なソフトウェア開発のためのClaude AIの機能を強化します。*
