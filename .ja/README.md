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

```txt
.claude/
├── CLAUDE.md              # メイン設定（AIが読み込む）
├── README.md              # このファイル - クイックスタートガイド
├── docs/                  # ドキュメント
│   ├── COMMANDS.md       # コマンドリファレンス
│   └── adr/              # アーキテクチャ決定記録
├── commands/              # コマンド定義
│   ├── code.md           # TDD/RGRC実装
│   ├── fix.md            # クイックバグ修正
│   ├── research.md       # 実装なしの調査
│   ├── audit.md          # コードレビュー統括
│   ├── test.md           # 包括的テスト
│   └── think.md          # 計画 & SOW作成
├── rules/                 # ルール定義
│   ├── core/             # [P0] コアAI動作原則
│   │   └── AI_OPERATION_PRINCIPLES.md
│   ├── PRINCIPLES_GUIDE.md  # 完全な原則ガイド
│   ├── commands/         # コマンド選択ロジック
│   ├── development/      # 開発パターン & 方法論
│   └── guidelines/       # ドキュメントガイドライン
├── skills/               # スキルベースの知識モジュール
│   ├── optimizing-performance/    # Webパフォーマンス知識
│   └── generating-tdd-tests/      # TDD方法論
├── agents/               # 専門AIエージェント
│   ├── analyzers/        # アーキテクチャ分析
│   ├── enhancers/        # コード改善
│   ├── generators/       # コード/テスト生成
│   ├── git/              # Git操作エージェント
│   ├── orchestrators/    # マルチエージェント調整
│   └── reviewers/        # コードレビューエージェント（13種類）
├── references/           # 参照ドキュメント（コマンドとしてロードされない）
│   └── commands/         # コマンド参照資料
└── .ja/                   # 日本語翻訳
    ├── CLAUDE.md         # メイン設定（日本語）
    ├── commands/         # コマンド定義（日本語）
    └── rules/            # ルール定義（日本語）
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
   /plugin install quick-actions             # /fix
   /plugin install automation-commands       # /auto-test, /full-cycle
   /plugin install git-utilities             # /commit, /branch, /pr
   /plugin install documentation-tools       # /adr, /rulify
   /plugin install browser-workflows         # /workflow:create
   /plugin install utilities                 # /context
   ```

**利用可能なプラグイン**:

- **complete-workflow-system**: 16の専門エージェントを含むフル開発ワークフロー
- **quick-actions**: 高速バグ修正 (/fix)
- **automation-commands**: 自動テストとフルサイクル自動化
- **git-utilities**: Gitワークフローヘルパー (commit, branch, PR)
- **documentation-tools**: ADR作成とルール生成
- **browser-workflows**: E2Eテストと自動化
- **utilities**: 開発診断ツール

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

| プラグイン | 使用コマンド | 用途 | インストールコマンド |
| --- | --- | --- | --- |
| `pr-review-toolkit` | `/audit`, `/research` | 拡張コードレビューエージェント | `/plugin install pr-review-toolkit` |
| `feature-dev` | `/research`, `/think` | コード探索・アーキテクチャエージェント | `/plugin install feature-dev` |
| `ralph-wiggum` | `/code` | TDD Greenフェーズ自動反復 | `/plugin install ralph-wiggum` |

**一括インストール（必要なプラグインすべて）**:

```bash
/plugin install pr-review-toolkit feature-dev ralph-wiggum
```

**オプションプラグイン**（完全な機能のために推奨）:

| プラグイン | 用途 |
| --- | --- |
| `example-skills` | PDF、XLSX、PPTX処理、フロントエンドデザイン |
| `typescript-lsp` | TypeScript言語サーバー統合 |

**注**: プラグインは `~/.claude/plugins/` に保存され、gitから除外されています。各ユーザーが個別にインストールする必要があります。

## 📝 利用可能なコマンド

Claude Codeは5つのカテゴリに整理された15の専門コマンドを提供:

### コマンドカテゴリ

- **コア開発**（7コマンド）: 計画から検証までの完全なワークフロー
  - `/think`, `/research`, `/code`, `/test`, `/audit`, `/sow`, `/validate`

- **クイックアクション**（1コマンド）: 高速バグ修正
  - `/fix`

- **自動化**（2コマンド）: テストと開発サイクルの自動化
  - `/auto-test`, `/full-cycle`

- **ドキュメント**（2コマンド）: アーキテクチャ決定とルール
  - `/adr`, `/rulify`

- **外部ツール**（1コマンド）: ブラウザ自動化
  - `/workflow:create`

**📚 詳細リファレンス**: 完全なコマンドドキュメントは:

- [コマンドリファレンス（日本語）](./docs/COMMANDS.md)
- [English Command Reference](../docs/COMMANDS.md)

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

### 自動化ワークフロー（SlashCommand Toolで新規追加）

```txt
/auto-test        # 自動テスト → 修正サイクル
/full-cycle       # 完全な自動開発フロー
```

## 🌏 言語サポート

- **AI処理**: 内部的には英語
- **ユーザー出力**: 日本語（設定可能）
- **ドキュメント**: 英語と日本語の両方で利用可能

## 🛠️ 主要機能

### コアAI動作原則

- **安全第一**: 破壊的操作に対する安全境界を維持
- **ユーザー権限**: ユーザー指示が最終的な権限
- **ワークフロー統合**: 構造化された操作のためPRE_TASK_CHECKに従う
- **出力検証可能性**: 出力が検証可能で透明であることを確保
  - 事実と仮定を区別
  - 主張の証拠を提供（ファイルパス、行番号、参照）
  - 不確かな場合は信頼度レベルを明示

### 開発原則

- **オッカムの剃刀**: 機能する最もシンプルな解決策を選択（メタ原則）
- **プログレッシブエンハンスメント**: CSSファーストアプローチ、シンプル → 強化
- **コード可読性**: 「リーダブルコード」に基づく
- **Container/Presentational**: Reactコンポーネントパターン
- **SOLID、DRY、TDD/RGRC**: 業界ベストプラクティス
- **包括的ガイド**: すべての原則は [PRINCIPLES_GUIDE.md](../rules/PRINCIPLES_GUIDE.md) を参照

### 安全機能

- ファイル削除は恒久削除の代わりにゴミ箱（`~/.Trash/`）を使用
- 信頼度マーカー（✓/→/?）付きのタスク前理解チェック
- ファイル変更にはユーザー確認が必要
- 破壊的操作前の実行計画

## 📚 ドキュメント

### コアドキュメント

- [コマンドリファレンス](./docs/COMMANDS.md)
- [設定ガイド](./CLAUDE.md)

### 開発ガイド

- [原則ガイド](../rules/PRINCIPLES_GUIDE.md) - すべての開発原則の完全な概要
- [ドキュメントルール](../rules/guidelines/DOCUMENTATION_RULES.md) - ドキュメントの標準

## 🤝 貢献

このリポジトリを自由にフォークして、必要に応じてカスタマイズしてください。改善のプルリクエストを歓迎します！

## 📜 ライセンス

MITライセンス - 自由に使用・変更してください。

## 📅 最近の更新

**2025-10-02** - ドキュメント同期 & コアルール強化

- すべてのドキュメントに [P0] コアAI動作ルールを追加
- 英語版と日本語版を完全に同期
- 信頼度マーカー付きの出力検証可能性原則を追加
- 検証可能な出力要件でPRE_TASK_CHECKを強化
- PRINCIPLES_GUIDE.mdにMermaid原則依存グラフを追加

**2025-01-09** - ドキュメント強化

- すべての開発原則のための包括的な [PRINCIPLES_GUIDE.md](../rules/PRINCIPLES_GUIDE.md) を追加
- `rules/` ディレクトリ構造を再編成（reference → development）
- すべてのドキュメントで用語を標準化（Core Philosophy、Core Principles）
- すべてのエージェントとコマンドに原則参照を追加
- 英語版と日本語版の一貫性を改善

## 👤 作者

Your Name

---

*この設定は、品質、可読性、保守性に重点を置いた体系的なソフトウェア開発のためにClaude AIの機能を強化します。*
