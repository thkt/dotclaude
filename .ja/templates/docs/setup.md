# Setup Template

## Structure

```markdown
# {project_name} - セットアップガイド

## 前提条件

| ツール                 | バージョン                | 必須                       |
| ---------------------- | ------------------------- | -------------------------- |
| {prerequisites[].tool} | {prerequisites[].version} | {prerequisites[].required} |

## インストール

\`\`\`bash

# リポジトリをクローン

git clone {installation.clone_url}
cd {project_name}

# 依存関係のインストール

{installation.install_command}
\`\`\`

{installation.post_install_steps? (foreach)}
\`\`\`bash
# {installation.post_install_steps[].description}
{installation.post_install_steps[].command}
\`\`\`
{/foreach}

## 設定

### 環境変数

| 変数                            | 説明                                   | 必須                                      | デフォルト                         | ソース                                 |
| ------------------------------- | -------------------------------------- | ----------------------------------------- | ---------------------------------- | -------------------------------------- |
| {configuration.env_vars[].name} | {configuration.env_vars[].description} | {configuration.env_vars[].required_level} | {configuration.env_vars[].default} | {configuration.env_vars[].source_file} |

### 設定ファイル

| ファイル                            | 用途                                   |
| ----------------------------------- | -------------------------------------- |
| {configuration.config_files[].file} | {configuration.config_files[].purpose} |

{configuration.config_files[].key_settings? (foreach)}
**{configuration.config_files[].file}**:
| 設定                                               | 値                                                  |
| -------------------------------------------------- | --------------------------------------------------- |
| {configuration.config_files[].key_settings[].name} | {configuration.config_files[].key_settings[].value} |
{/foreach}

## 実行

### 開発

\`\`\`bash
{running.development}
\`\`\`

{running.dev_url?}
アクセス: {running.dev_url}
{/dev_url}

### 本番

\`\`\`bash
{running.production}
\`\`\`

## テスト

\`\`\`bash
{testing.command}
\`\`\`

## トラブルシューティング

| 問題                      | 解決策                       |
| ------------------------- | ---------------------------- |
| {troubleshooting[].issue} | {troubleshooting[].solution} |
```
