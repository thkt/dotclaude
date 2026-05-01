# Quick Start (5 分)

## 1. 基本コマンド

| コマンド    | 利用シーン                |
| ----------- | ------------------------- |
| `/fix`      | 小さなバグ、即時修正      |
| `/code`     | TDD で新機能              |
| `/research` | 着手前に調査              |
| `/audit`    | コード品質レビュー        |
| `/commit`   | コミット メッセージを作成 |

## 2. 判断フロー

```text
即時修正か → /fix
先に理解が必要か → /research → /fix
機能を作るか → /code → /audit
```

## 3. セッション例

```bash
# 即時バグ修正
> /fix the login button is not working

# 機能開発
> /research how does auth work in this codebase?
> /code add logout functionality
> /audit
> /commit
```

## 4. キーポイント

- 一度に 1 コマンド: 各コマンドが完了してから次へ
- ワークフローを信頼する: コマンドは自然に連鎖する
- 不明なら聞く: Claude が必要なら確認する

## 5. 次のステップ

- パターンは [WORKFLOWS.md](../rules/workflows/WORKFLOWS.md) を参照
- 全コマンドは `/help` で確認
