# External Plugins

ワークフローに統合している外部プラグインのインストールガイド。

## インストール済みプラグイン一覧

| プラグイン             | マーケットプレース      | 用途                     |
| ---------------------- | ----------------------- | ------------------------ |
| ralph-loop             | claude-plugins-official | 反復実行ループ           |
| a11y-specialist-skills | a11y-specialist-skills  | アクセシビリティレビュー |

## インストール方法

### 1. 公式プラグイン（claude-plugins-official）

```bash
# マーケットプレース追加（初回のみ）
claude plugins marketplace add https://raw.githubusercontent.com/anthropics/claude-code-plugins/refs/heads/main/marketplace.json

# 各プラグインをインストール
claude plugins install ralph-loop
```

### 2. アクセシビリティスキル

```bash
# マーケットプレース追加
claude plugins marketplace add https://raw.githubusercontent.com/anthropics/a11y-specialist-skills/refs/heads/main/marketplace.json

# インストール
claude plugins install a11y-specialist-skills
```

## 一括インストールスクリプト

```bash
#!/bin/bash
# install-plugins.sh

# マーケットプレース追加
claude plugins marketplace add https://raw.githubusercontent.com/anthropics/claude-code-plugins/refs/heads/main/marketplace.json
claude plugins marketplace add https://raw.githubusercontent.com/anthropics/a11y-specialist-skills/refs/heads/main/marketplace.json

# プラグインインストール
claude plugins install ralph-loop
claude plugins install a11y-specialist-skills
```

## 主要コマンド

| コマンド        | プラグイン      | 用途                     |
| --------------- | --------------- | ------------------------ |
| `/ralph-loop`   | ralph-loop      | 反復実行開始             |
| `/cancel-ralph` | ralph-loop      | ループ停止               |
| `/a11y-review`  | a11y-specialist | アクセシビリティレビュー |

## プラグイン管理

```bash
# インストール済み一覧
claude plugins list

# プラグイン削除
claude plugins uninstall <plugin-name>

# マーケットプレース一覧
claude plugins marketplace list
```

## 注意事項

- `plugins/` ディレクトリは .gitignore で除外
- プラグインキャッシュは `plugins/cache/` に保存
- settings.json の `enabledPlugins` で有効/無効を制御
