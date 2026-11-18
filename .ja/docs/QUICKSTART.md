# Quick Start (5 分)

## 1. 基本コマンド

| コマンド     | 利用シーン                                                 |
| ------------ | ---------------------------------------------------------- |
| `/scoping`   | 機能もバグも、要求と完了条件を整理して合意済みの Issue にする |
| `/implement` | 合意済みの Issue を実装し、draft PR まで進める             |

## 2. 判断フロー

```text
機能もバグも → /scoping → /implement
```

## 3. セッション例

```bash
# バグ修正
> /scoping the login button is not working

# 機能開発
> /scoping add logout functionality

# 合意した Issue の番号を渡すと、draft PR まで進む
> /implement 123
```

## 4. キーポイント

- 一度に 1 コマンド: 各コマンドが完了してから次へ
- ワークフローを信頼する: コマンドは自然に連鎖する
- 不明なら聞く: Claude が必要なら確認する

## 5. 次のステップ

- 全コマンドは `/help` で確認
- 開発フローの詳細は[COMMANDS](./COMMANDS.md)
