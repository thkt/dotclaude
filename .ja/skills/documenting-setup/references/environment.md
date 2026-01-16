# 環境セットアップ

## Dev Container vs Sandbox

| 観点       | Sandbox          | Dev Container      |
| ---------- | ---------------- | ------------------ |
| 分離       | ルールベース     | 物理的（コンテナ） |
| 事故の影響 | ホストに直接影響 | コンテナ内に限定   |
| 復旧       | 手動での復元     | コンテナ再作成     |
| 複数タスク | 同一環境         | 独立したコンテナ   |

## 使い分け

| ユースケース     | 推奨          | 理由             |
| ---------------- | ------------- | ---------------- |
| 本番DB接続       | Dev Container | 事故からの保護   |
| 重要リポジトリ   | Dev Container | force push防止   |
| 並列実行         | Dev Container | 独立性           |
| 単純なスクリプト | Sandbox       | セットアップ不要 |
| 軽微な修正       | Sandbox       | 即座に開始       |

## Dev Container クイックスタート

| Step | Action                                                            |
| ---- | ----------------------------------------------------------------- |
| 1    | `cp -r ~/.claude/templates/devcontainer/.devcontainer [project]/` |
| 2    | VSCode: Cmd+Shift+P → "Dev Containers: Reopen in Container"       |

## ベースイメージ

| イメージ                                          | ランタイム               |
| ------------------------------------------------- | ------------------------ |
| `ghcr.io/creanciel/deck`                          | Rust, Node, Ruby, Python |
| `mcr.microsoft.com/devcontainers/javascript-node` | Node.js                  |
| `mcr.microsoft.com/devcontainers/python`          | Python                   |
