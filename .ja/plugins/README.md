# External Plugins

ワークフローに統合している外部プラグインのインストールガイド。

## インストール済みプラグイン一覧

| プラグイン             | マーケットプレース      | 用途                     |
| ---------------------- | ----------------------- | ------------------------ |
| feature-dev            | claude-plugins-official | 機能開発ガイド           |
| pr-review-toolkit      | claude-plugins-official | PR レビュー支援          |
| ralph-loop             | claude-plugins-official | 反復実行ループ           |
| hookify                | claude-plugins-official | フック作成支援           |
| code-simplifier        | claude-plugins-official | コード簡素化             |
| security-guidance      | claude-plugins-official | セキュリティガイダンス   |
| example-skills         | anthropic-agent-skills  | スキル例（PDF, PPTX等）  |
| a11y-specialist-skills | a11y-specialist-skills  | アクセシビリティレビュー |

## インストール方法

### 1. 公式プラグイン（claude-plugins-official）

```bash
# マーケットプレース追加（初回のみ）
claude plugins marketplace add https://raw.githubusercontent.com/anthropics/claude-code-plugins/refs/heads/main/marketplace.json

# 各プラグインをインストール
claude plugins install feature-dev
claude plugins install pr-review-toolkit
claude plugins install ralph-loop
claude plugins install hookify
claude plugins install code-simplifier
claude plugins install security-guidance
```

### 2. Anthropicスキル例

```bash
# マーケットプレース追加
claude plugins marketplace add https://raw.githubusercontent.com/anthropics/anthropic-agent-skills/refs/heads/main/marketplace.json

# インストール
claude plugins install example-skills
```

### 3. アクセシビリティスキル

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
claude plugins marketplace add https://raw.githubusercontent.com/anthropics/anthropic-agent-skills/refs/heads/main/marketplace.json
claude plugins marketplace add https://raw.githubusercontent.com/anthropics/a11y-specialist-skills/refs/heads/main/marketplace.json

# プラグインインストール
claude plugins install feature-dev
claude plugins install pr-review-toolkit
claude plugins install ralph-loop
claude plugins install hookify
claude plugins install code-simplifier
claude plugins install security-guidance
claude plugins install example-skills
claude plugins install a11y-specialist-skills
```

## 主要コマンド

| コマンド        | プラグイン        | 用途                     |
| --------------- | ----------------- | ------------------------ |
| `/feature-dev`  | feature-dev       | 機能開発ガイド           |
| `/review-pr`    | pr-review-toolkit | PR包括レビュー           |
| `/ralph-loop`   | ralph-loop        | 反復実行開始             |
| `/cancel-ralph` | ralph-loop        | ループ停止               |
| `/hookify`      | hookify           | 会話からフック生成       |
| `/hookify list` | hookify           | ルール一覧               |
| `/polish`       | code-simplifier   | コード簡素化             |
| `/pdf`          | example-skills    | PDF操作                  |
| `/pptx`         | example-skills    | PowerPoint操作           |
| `/xlsx`         | example-skills    | Excel操作                |
| `/docx`         | example-skills    | Word操作                 |
| `/a11y-review`  | a11y-specialist   | アクセシビリティレビュー |

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
