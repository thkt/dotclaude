# Claude AI Configuration

Claude AI のためのカスタムコマンド、開発原則、ワークフロー最適化を含む包括的な設定システム。

📌 [English version](../README.md)

## 🎯 概要

このリポジトリは Claude AI のパーソナル設定を含み、以下を提供する。

- 体系的な開発ワークフローのためのカスタムスラッシュコマンド (47 skills)
- コードレビュー、生成、分析のための専門 AI エージェント (38 agents)
- AI 動作のコア原則と開発のベストプラクティス
- 品質パイプラインフック (guardrails, formatter, reviews, gates)
- 日本語サポート

## 📁 構造

```text
.claude/
├── CLAUDE.md             # メイン設定 (AI が読み込む)
├── README.md             # このファイル。クイックスタートガイド
├── adr/                  # Architecture Decision Records
├── rules/                # ルール定義
│   ├── core/             # AI 動作のコア原則
│   ├── conventions/      # ドキュメント規約
│   ├── development/      # 開発パターン・方法論
│   ├── frameworks/       # フレームワーク固有のルール
│   └── workflows/        # ワークフローガイド
├── skills/               # スキルベースのナレッジモジュール (47 skills)
├── agents/               # 専門 AI エージェント (33 agents)
│   ├── architects/       # 機能アーキテクチャ設計
│   ├── critics/          # 発見事項への反論 (devils-advocate)
│   ├── enhancers/        # コード改善・簡素化
│   ├── evaluators/       # 品質評価
│   ├── explorers/        # コードベース探索
│   ├── generators/       # コード/テスト/git 生成
│   ├── resolvers/        # ビルドエラー解決
│   ├── reviewers/        # コードレビュー (20 reviewers)
│   └── teams/            # 統合・実装担当
├── docs/                 # 設計ドキュメント・ガイド
├── hooks/                # Pre/Post tool-use フック
├── scripts/              # ユーティリティスクリプト
├── output-styles/        # 出力スタイル定義
├── .claude-plugin/       # プラグインマーケットプレイス設定
└── .ja/                  # 日本語翻訳
```

## 🚀 クイックスタート

### Option 1: Claude Code プラグインとしてインストール (推奨)

このリポジトリは Claude Code プラグインとして提供されており、特定のワークフローセットを簡単にインストールできる。

1. このリポジトリをマーケットプレイスに追加する。

   ```bash
   /plugin marketplace add thkt/dotclaude
   ```

2. 利用可能なプラグインを確認する。

   ```bash
   /plugin
   ```

3. 個別のプラグインをインストールする (1つ以上)。

   ```bash
   /plugin install complete-workflow-system  # 完全 TDD/RGRC ワークフロー
   /plugin install quick-actions             # /fix, /polish
   /plugin install git-utilities             # /commit, /branch, /pr, /issue
   /plugin install documentation-tools       # /adr, /docs
   /plugin install browser-workflows         # agent-browser (E2E via /code)
   ```

利用可能なプラグイン:

- complete-workflow-system: 品質ゲート付きの完全な開発ワークフロー (/think, /code, /audit, /research, /feature, /swarm)
- quick-actions: 高速バグ修正 (/fix)、AI slop 除去 (/polish)
- git-utilities: Git ワークフローヘルパー (/commit, /branch, /pr, /issue, /preview)
- documentation-tools: ADR 作成 (/adr)、ドメイン用語集 (/glossary)
- browser-workflows: /code E2E Phase 経由の E2E テスト (agent-browser)
- productivity-tools: GitHub, Slack, Calendar からの受信箱集約 (/inbox)
- development-skills: TDD、原則、パターン、セキュリティ、ドキュメント参照などのリファレンススキル 21 種

### Option 2: 手動インストール (フル設定)

これを個人の `.claude` 設定として使う場合。

1. リポジトリをホームディレクトリにクローンする。

   ```bash
   git clone https://github.com/thkt/.claude ~/.claude
   ```

2. 既存の `.claude` ディレクトリがある場合は先にバックアップする。

   ```bash
   mv ~/.claude ~/.claude.backup
   git clone https://github.com/thkt/.claude ~/.claude
   ```

注意: 手動インストールには、すべてのコマンド、エージェント、ルール、個人設定が含まれる。プラグインインストールでは共有コマンドとエージェントのみが含まれ、個人の `CLAUDE.md`、`rules/`、`settings.json` は除外される。

## 📦 依存関係とセットアップ

### Sandbox 機能 (任意。推奨)

Claude Code の sandbox 機能は、自動的なパーミッション処理を伴う安全なコマンド実行を提供し、安全性を保ちつつ承認の手間を減らす。

システム要件:

- macOS または Linux (Windows は未対応)
- npm/npx 付きの Node.js
- ripgrep (通常はプリインストール済み)
- jaq (IDR フック用): `brew install jaq`

セットアップ:

```bash
# 1. sandbox runtime のインストール
npm install -g @anthropic-ai/sandbox-runtime

# 2. インストール確認
srt --version

# 3. Claude Code で有効化
# Claude Code セッション内で以下を実行:
/sandbox
# Option 1: "Sandbox BashTool, with auto-allow in accept edits mode" を選択
```

機能:

- ✅ ファイルシステムアクセスを許可ディレクトリに制限
- ✅ プロキシ経由のネットワークアクセス制御
- ✅ 安全なコマンドを sandbox 内で自動実行
- ✅ sandbox 制限に抵触したときのみ承認を要求

設定 (任意):

カスタム設定のために `~/.srt-settings.json` を作成する。

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

### Hook ツール (推奨)

Claude Code セッション中に自動実行される品質パイプラインフック。手動介入なしで lint エラー検出、コード整形、静的解析の注入、品質ゲートの強制を行う。

```bash
brew tap thkt/tap
brew install guardrails formatter reviews gates
```

| ツール     | フック      | タイミング         | 役割                                 |
| ---------- | ----------- | ------------------ | ------------------------------------ |
| guardrails | PreToolUse  | Write/Edit 前      | Lint (oxlint) + セキュリティチェック |
| formatter  | PostToolUse | Write/Edit 後      | 自動整形 (oxfmt)                     |
| reviews    | PreToolUse  | Skill 前           | 静的解析コンテキスト注入             |
| gates      | Stop        | エージェント完了時 | 品質ゲート (knip, tsgo, madge)       |

プロジェクト単位の設定は `.claude/tools.json` で行う。詳細は [thkt/tap](https://github.com/thkt/homebrew-tap) を参照。

### 外部 CLI ツール (任意)

一部のコマンドはデータソース連携のために外部 CLI を使う。

| ツール        | 利用コマンド        | 用途                 | インストール                                              |
| ------------- | ------------------- | -------------------- | --------------------------------------------------------- |
| `gh`          | `/inbox` (GitHub)   | GitHub API アクセス  | `brew install gh && gh auth login`                        |
| `gemini`      | `/inbox` (Calendar) | Google Calendar 検索 | [Gemini CLI](https://github.com/google-gemini/gemini-cli) |
| `scout`       | Slack URL 読み込み  | Slack メッセージ取得 | `brew install thkt/tap/scout`                             |
| `SLACK_TOKEN` | `/inbox` (Slack)    | Slack 検索 API       | 後述                                                      |

Slack 読み込み: `scout fetch <slack-url>` で任意の Slack メッセージ/スレッド URL を直接読み込む。scout が設定済みなら追加設定は不要。

Slack 検索 (`/inbox` 用):

1. [Slack App](https://api.slack.com/apps) を作成し、User Token Scopes に `search:read` を追加する
2. User OAuth Token (`xoxp-...`) を取得する
3. 環境変数を設定する。

   ```bash
   export SLACK_TOKEN="xoxp-..."
   export SLACK_WORKSPACE="your-workspace"  # {workspace}.slack.com の workspace 部分
   ```

### 必須プラグイン

一部のコマンドはこのリポジトリに含まれない外部プラグインに依存する。クローン後に手動でインストールする。

| プラグイン   | 利用コマンド | 用途                     | インストールコマンド         |
| ------------ | ------------ | ------------------------ | ---------------------------- |
| `ralph-loop` | `/code`      | TDD Green Phase 自動反復 | `/plugin install ralph-loop` |

クイックインストール:

```bash
/plugin install ralph-loop
```

注意: プラグインは `~/.claude/plugins/` に保存され、git の対象外。各ユーザーが個別にインストールする必要がある。

## 📝 利用可能なコマンド

完全なコマンドリファレンスを参照する。

- [English Command Reference](../rules/workflows/WORKFLOWS.md)
- [日本語コマンドリファレンス](./rules/workflows/WORKFLOWS.md)

## 🔄 標準ワークフロー

### 機能開発 (Enhanced)

```txt
/research → /think → /code → /audit
```

### バグ調査と修正

```txt
/research → /fix
```

## 🌏 言語サポート

- AI 処理: 内部は英語
- ユーザー出力: 日本語 (設定可能)
- ドキュメント: 英語と日本語の両方を提供

## 🛠️ 主要機能

### コア AI 原則

- Safety First: ファイル削除はゴミ箱 (`~/.Trash/`) を使用。破壊的操作は確認を要求
- User Authority: ユーザー指示が最終権威
- Output Verifiability: 主張は証拠 (file path, 確信度マーカー ✓/→/?) で裏付け

### 開発アプローチ

- Occam's Razor: 動く中で最も簡潔な解決策を選ぶ
- Progressive Enhancement: シンプルに作り、段階的に拡張する
- TDD/RGRC: 信頼性のあるコードのための Red-Green-Refactor-Commit サイクル

詳細: [PRINCIPLES.md](./rules/PRINCIPLES.md)

## 📚 ドキュメント

### コアドキュメント

- [Design Philosophy](./docs/DESIGN.md). 設計思想・意図
- [Commands Reference (English)](../rules/workflows/WORKFLOWS.md)
- [Commands Reference (Japanese)](./rules/workflows/WORKFLOWS.md)
- [Configuration Guide](../CLAUDE.md)
- [Japanese Configuration](./CLAUDE.md)

### 開発ガイド

- [Principles Guide](./rules/PRINCIPLES.md). 全開発原則の概要
- [Markdown Conventions](./rules/conventions/MARKDOWN.md). Markdown 記述・参照ルール

## 🤝 コントリビュート

自由にこのリポジトリを fork してニーズに合わせてカスタマイズしてください。改善のためのプルリクエストも歓迎する。

## 📜 ライセンス

MIT License. 自由に利用、改変できる。

## 👤 著者

thkt

---

_この設定は、品質、可読性、保守性に焦点を当てた体系的なソフトウェア開発のために Claude AI の能力を高める。_
