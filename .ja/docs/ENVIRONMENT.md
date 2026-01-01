# 環境セットアップガイド

Claude Codeの実行環境に関するセットアップガイドです。

## Dev Container (推奨)

### 概要

Dev Containerを使うことで、Claude Codeを物理的に隔離された安全な環境で実行できます。

| 比較 | サンドボックスモード | Dev Container |
| --- | --- | --- |
| 分離レベル | ルールベース（設定で制御） | 物理的（コンテナ境界） |
| 事故時の影響 | ホストに直接影響 | コンテナ内に限定 |
| 回復 | 手動で復旧が必要 | コンテナ再作成で即復旧 |
| 複数タスク | 同一環境で実行 | 独立したコンテナで並行可能 |

### テンプレート

汎用テンプレートを用意しています：

```text
~/.claude/templates/devcontainer/
├── .devcontainer/
│   └── devcontainer.json
└── README.md
```

### クイックスタート

1. テンプレートをプロジェクトにコピー：

```bash
cp -r ~/.claude/templates/devcontainer/.devcontainer /path/to/your/project/
```

1. VSCodeでプロジェクトを開く
2. `Cmd+Shift+P` → `Dev Containers: Reopen in Container`

詳細は `~/.claude/templates/devcontainer/README.md` を参照してください。

### ベースイメージ

| イメージ | 用途 | 含まれるランタイム |
| --- | --- | --- |
| `ghcr.io/creanciel/deck` | 汎用開発 | Rust, Node, Ruby, Python |
| `mcr.microsoft.com/devcontainers/javascript-node` | Node.js専用 | Node.js |
| `mcr.microsoft.com/devcontainers/python` | Python専用 | Python |

## サンドボックスモード

Dev Containerを使わない場合のフォールバック設定です。

### 設定場所

`~/.claude/settings.json` でファイルシステムとネットワークのアクセスを制御できます。

### 制限事項

- ルールベースの制御のため、設定ミスで破れる可能性あり
- ホストのファイルシステムに直接アクセス可能
- 事故時の復旧は手動で行う必要あり

## 推奨環境

| ユースケース | 推奨環境 | 理由 |
| --- | --- | --- |
| 本番DB接続する開発 | Dev Container | 誤操作からの保護 |
| 重要リポジトリでの作業 | Dev Container | force push事故防止 |
| 複数タスク並行実行 | Dev Container | 環境の独立性 |
| 簡単なスクリプト実行 | サンドボックス | セットアップ不要 |
| 既存プロジェクトの軽微な修正 | サンドボックス | 即座に開始可能 |

## 参考

- [元記事: Claude Code Dev Container設定](https://zenn.dev/creanciel/articles/my-claude-code-dev-container-deck)
- [Dev Containers公式ドキュメント](https://containers.dev/)
- [Claude Code公式ドキュメント](https://docs.anthropic.com/claude-code)
