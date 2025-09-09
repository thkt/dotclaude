# Claude AI 設定

カスタムコマンド、開発原則、ワークフロー最適化を含むClaude AIの包括的な設定システム。

## 🎯 概要

このリポジトリにはClaude AIの個人設定が含まれています：

- 体系的な開発ワークフローのためのカスタムスラッシュコマンド
- 開発原則（SOLID、DRY、TDD/RGRC）
- プログレッシブエンハンスメントとコード可読性ガイドライン
- 日本語サポート

## 📁 構造

```txt
.claude/
├── CLAUDE.md              # メイン設定（AIが読む）
├── README.md              # クイックスタートガイド（英語版）
├── docs/                  # ドキュメント
│   ├── ARCHITECTURE.md   # システムアーキテクチャ
│   ├── COMMANDS.md       # コマンドリファレンス（英語）
│   ├── MODEL_SELECTION.md # モデル選択ガイドライン
│   ├── AGENT_USAGE.md    # エージェント使用ドキュメント
│   └── PROJECT_SETUP.md  # プロジェクトセットアップガイド
├── commands/              # コマンド定義
│   ├── code.md           # TDD/RGRC実装
│   ├── fix.md            # クイックバグ修正
│   ├── hotfix.md         # 緊急本番修正
│   ├── research.md       # 実装なしの調査
│   ├── review.md         # コードレビューオーケストレーション
│   ├── test.md           # 包括的テスト
│   ├── think.md          # 計画とSOW作成
│   └── gemini/
│       └── search.md     # Gemini経由のGoogle検索
├── rules/                 # 英語版ルール定義
│   ├── core/             # コアAI原則
│   ├── commands/         # コマンド選択ロジック
│   ├── development/      # 開発パターンと方法論
│   └── reference/        # 追加参照原則
└── ja/                    # 日本語翻訳
    ├── CLAUDE.md         # メイン設定（日本語）
    ├── README.md         # このファイル
    ├── commands/         # コマンド定義（日本語）
    └── rules/            # ルール定義（日本語）
```

## 🚀 クイックスタート

### インストール

1. このリポジトリをホームディレクトリにクローン：

   ```bash
   git clone https://github.com/YOUR_USERNAME/claude-config.git ~/.claude
   ```

2. すでに`.claude`ディレクトリがある場合は、先にバックアップを取ってください：

   ```bash
   mv ~/.claude ~/.claude.backup
   git clone https://github.com/YOUR_USERNAME/claude-config.git ~/.claude
   ```

## 📝 利用可能なコマンド

### コア開発コマンド

| コマンド | 目的 |
|---------|------|
| `/think` | 計画とSOW作成 |
| `/research` | 実装なしの調査 |
| `/code` | TDD/RGRC実装 |
| `/test` | 包括的テスト |
| `/review` | エージェントによるコードレビュー |

### クイックアクションコマンド

| コマンド | 目的 | 環境 |
|---------|------|------|
| `/fix` | クイックバグ修正 | 🔧 開発 |
| `/hotfix` | 緊急本番修正 | 🚨 本番 |

### 外部ツールコマンド

| コマンド | 目的 | 必要条件 |
|---------|------|----------|
| `/gemini:search` | Gemini経由のGoogle検索 | Gemini CLI |

## 🔄 標準ワークフロー

### 機能開発

```txt
/think → /research → /code → /test
```

### バグ調査と修正

```txt
/research → /fix
```

### 緊急対応

```txt
/hotfix （重大な問題に対して単独で使用）
```

## 🌏 言語サポート

- **AI処理**: 内部的に英語
- **ユーザー出力**: 日本語（設定可能）
- **ドキュメント**: 英語と日本語の両方で利用可能

## 🛠️ 主な機能

### 開発原則

- **プログレッシブエンハンスメント**: CSSファーストアプローチ、シンプルに構築 → 強化
- **コード可読性**: 「The Art of Readable Code」に基づく
- **Container/Presentational**: Reactコンポーネントパターン
- **SOLID、DRY、TDD/RGRC**: 業界のベストプラクティス
- **包括的ガイド**: すべての原則については[PRINCIPLES_GUIDE.md](../docs/PRINCIPLES_GUIDE.md)を参照

### 安全機能

- ファイル削除は永久削除ではなくゴミ箱（`~/.Trash/`）を使用
- 複雑な操作の事前理解チェック
- ファイル変更にはユーザー確認が必要

## 📚 ドキュメント

### コアドキュメント

- [コマンドリファレンス（英語）](../docs/COMMANDS.md)
- [コマンドリファレンス（日本語）](./docs/COMMANDS.md)
- [システムアーキテクチャ](../docs/ARCHITECTURE.md)
- [設定ガイド](../CLAUDE.md)
- [日本語設定](./CLAUDE.md)

### 開発ガイド

- [原則ガイド](../docs/PRINCIPLES_GUIDE.md) - すべての開発原則の完全な概要
- [ドキュメントルール](../docs/DOCUMENTATION_RULES.md) - ドキュメントの標準
- [プロジェクトセットアップ](../docs/PROJECT_SETUP.md) - はじめ方ガイド
- [モデル選択](../docs/MODEL_SELECTION.md) - AIモデル使用ガイドライン
- [エージェント使用](../docs/AGENT_USAGE.md) - 専門エージェントとの作業

## 🤝 貢献

このリポジトリをフォークして、ニーズに合わせてカスタマイズしてください。改善のプルリクエストを歓迎します！

## 📜 ライセンス

MITライセンス - 自由に使用・修正してください。

## 📅 最近の更新

**2025-01-09** - ドキュメント強化

- すべての開発原則のための包括的な[PRINCIPLES_GUIDE.md](../docs/PRINCIPLES_GUIDE.md)を追加
- `rules/`ディレクトリ構造を再編成（reference → development）
- すべてのドキュメントで用語を標準化（Core Philosophy、Core Principles）
- すべてのエージェントとコマンドに原則参照を追加
- 英語版と日本語版の一貫性を改善

## 👤 作者

thkt

---

*この設定は、品質、可読性、保守性に焦点を当てた体系的なソフトウェア開発のためのClaude AIの機能を強化します。*
