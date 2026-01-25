---
name: scanning-plugins
description: >
  悪意のあるコードや指示を検出するプラグイン・スキルセキュリティスキャナー。
  ローカルパスと GitHub リポジトリをサポート。プラグインのインストール前スキャン、
  外部スキルの監査時、または plugin scan, security scan, プラグインスキャン,
  安全性チェック が言及された場合に使用。
allowed-tools: [Read, Grep, Glob, LS]
agent: plugin-scanner
context: fork
user-invocable: false
---

# プラグインセキュリティスキャン

Claude Code プラグインとスキル内の悪意のあるコードや欺瞞的な指示を検出。

## コンテキスト評価

正当な用途と悪意のある意図を区別:

| コンテキスト | 例                               | 判定      |
| ------------ | -------------------------------- | --------- |
| 教育         | ドキュメント内の脆弱性例         | Safe      |
| 検出         | スキャナーでのパターンマッチング | Safe      |
| 実行         | フック内の危険なコマンドの実行   | Malicious |
| アクセス     | 理由のない認証情報の読み取り     | Malicious |

## スキャン対象

| 場所                       | 内容                     |
| -------------------------- | ------------------------ |
| `~/.claude/plugins/cache/` | サードパーティプラグイン |
| `~/.claude/skills/`        | インストール済みスキル   |
| `.claude/` (プロジェクト)  | プロジェクト設定         |
| `owner/repo` または URL    | GitHub リポジトリ        |

## ファイルタイプ

- `*.md` - 指示、プロンプト
- `*.sh` - シェルコマンド
- `*.js`, `*.ts` - コード実行
- `*.yaml`, `*.json` - 設定
- `.mcp.json` - MCPサーバー設定（command, args, env）
