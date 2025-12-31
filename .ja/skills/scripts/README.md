# 共有スクリプト

スキル間で共有される検証ユーティリティ。

**注意**: これはスキルではありません。SKILL.mdは意図的に存在しません。

## 使用方法

```bash
# 単一スキルの検証
bash ~/.claude/skills/scripts/validate-template.sh ~/.claude/skills/[skill-name]

# 全スキルの検証
bash ~/.claude/skills/scripts/validate-all.sh

# Markdownの検証
bash ~/.claude/skills/scripts/validate-markdown.sh [file.md]
```

## ファイル

| ファイル | 用途 |
| --- | --- |
| `validate-template.sh` | スキル構造検証（SKILL.md、フロントマター） |
| `validate-all.sh` | 全スキル一括検証 |
| `validate-markdown.sh` | Markdownファイル検証 |
