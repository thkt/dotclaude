# Security Model

## Permission Evaluation Flow Is UX, Not Security

Claude Codeの権限評価フロー（PreToolUse Hook → Deny Rules → Allow Rules →
Ask Rules → Permission Mode）はtool_useブロックのフィルタ。セキュリティ境界では
ない。

LLMはテキスト生成器であり、tool_useは出力形式の1つ。Bashが許可されていれば
OSの能力をそのまま渡している。

ref: https://zenn.dev/commander/articles/72a907ce68a8c1

## Defense Layers

| Layer                 | Implementation        | What It Stops              | Bypass via Bash |
| --------------------- | --------------------- | -------------------------- | --------------- |
| L1: Deny Rules        | settings.json deny    | tool_use ブロック単位      | 可能            |
| L2: PreToolUse Hook   | bash-safety.sh        | Bash内の危険パターン       | 部分防御        |
| L3: PermissionRequest | permission-request.sh | サブエージェントの設定改変 | N/A             |
| L4: macOS Seatbelt    | Claude Code内蔵       | ファイルシステム一部制限   | OS強制          |
| L5: Process Sandbox   | 未実装                | ネットワーク・FS全体       | 不可能          |

重要: L1〜L3は人間の介入ポイント調整（UX）。L4〜L5がセキュリティ境界。

## Known Gaps

| Gap                                  | Risk                                         | Mitigation                                              |
| ------------------------------------ | -------------------------------------------- | ------------------------------------------------------- |
| Bash許可コマンドでのネットワーク通信 | curl/wget でデータ送信可能                   | bash-safety.sh でファイルアップロードパターンをブロック |
| 許可済みツール経由の外部送信         | scout, gh api でデータ送信可能               | 正当な用途と区別不能。運用で対応                        |
| npm/pnpm install の postinstall      | 任意コード実行可能                           | 信頼できるパッケージのみ使用                            |
| L5 プロセスサンドボックス未実装      | エージェントの通信を OS レベルで制約できない | コンテナ化を検討（将来）                                |

## Team Guidelines

| Guideline                        | Description                                                                         |
| -------------------------------- | ----------------------------------------------------------------------------------- |
| deny ≠ 安全                      | deny ルール追加だけでセキュリティ対処済みと判断しない                               |
| Bash許可 = OS能力委譲            | Bash を許可した時点で deny ルールは迂回可能                                         |
| hook = 確率的防御                | bash-safety.sh はパターンマッチ。未知経路には対応不可                               |
| bypassPermissions = 隔離環境専用 | 本番・開発環境で使わない                                                            |
| 秘密情報は環境外に               | .env, credentials は deny + hook で二重防御しているが、プロセスレベルでは制約なし   |
| サブエージェントの権限           | permission-request.sh がセキュリティファイル改変を deny。ただし Bash 経由は L2 依存 |

## When to Use Containers

L5が必要になるケース:

- CI/CDでエージェントを自動実行する
- 信頼できないリポジトリでエージェントを動かす
- エージェントに外部通信を禁止する必要がある
- コンプライアンス要件でプロセス隔離が求められる

ローカル開発で人間が監視している場合はL1〜L4で十分。
