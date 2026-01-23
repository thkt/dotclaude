# フック設計

フックシステムの設計意図と仕組みを説明します。

📌 **[English Version](../../docs/HOOKS.md)**

## 概要

```mermaid
graph TD
    subgraph Events["Claude Code イベント"]
        PRE[PreToolCall]
        POST[PostToolCall]
        NOTIFY[Notification]
        STOP[Stop]
    end

    subgraph Hooks["フックカテゴリ"]
        GUARD[guardrails/]
        LINT[lint/]
        FORMAT[format/]
        LIFE[lifecycle/]
        SEC[security/]
        NOTIFY_H[notifications/]
    end

    PRE --> GUARD
    PRE --> SEC
    POST --> LINT
    POST --> FORMAT
    POST --> LIFE
    STOP --> NOTIFY_H
```

## フックカテゴリ

| カテゴリ         | トリガー     | 目的                         |
| ---------------- | ------------ | ---------------------------- |
| `guardrails/`    | PreToolCall  | 危険な操作をブロック         |
| `security/`      | PreToolCall  | セキュリティチェック         |
| `lint/`          | PostToolCall | コード品質チェック           |
| `format/`        | PostToolCall | フォーマット適用             |
| `lifecycle/`     | git hooks    | IDR生成、ステータスライン    |
| `notifications/` | Stop         | 完了通知                     |
| `codemap/`       | PostToolCall | アーキテクチャマップ更新     |
| `scheduled/`     | Cron         | 定期タスク                   |
| `agents/`        | -            | エージェント用ユーティリティ |

## 主要フック

### lifecycle/

| フック              | トリガー   | 出力                 |
| ------------------- | ---------- | -------------------- |
| `idr-pre-commit.sh` | git commit | `.idr-N.md` 生成     |
| `statusline.sh`     | -          | ステータスライン表示 |
| `_utils.sh`         | -          | 共通ユーティリティ   |

### guardrails/

危険なコマンドをブロック。

```bash
# 例: rm コマンドをブロック
if [[ "$command" == *"rm "* ]]; then
  echo "BLOCK: Use 'mv ~/.Trash/' instead of rm"
  exit 1
fi
```

### codemap/

```mermaid
flowchart LR
    C[重要なコミット] --> H[codemap hook]
    H --> G[Generate .codemaps/]
    G --> A[architecture.md]
```

## 設定

フックは `settings.json` または `.claude/settings.local.json` で設定:

```json
{
  "hooks": {
    "PreToolCall": [
      {
        "matcher": "Bash",
        "hooks": ["~/.claude/hooks/guardrails/block-rm.sh"]
      }
    ],
    "PostToolCall": [
      {
        "matcher": "Write",
        "hooks": ["~/.claude/hooks/format/prettier.sh"]
      }
    ]
  }
}
```

## 設計原則

### 1. デフォルトでノンブロッキング

フックは通常、操作をブロックしない。ブロックは明示的な設定が必要。

### 2. フェイルセーフ

フックがエラーで終了しても、Claude Code は継続動作。

### 3. 組み合わせ可能

小さなフックを組み合わせて複雑な動作を実現。

## IDR（実装決定記録）

コミット時に自動生成される実装記録。

```mermaid
flowchart LR
    C[git commit] --> H[idr-pre-commit.sh]
    H --> F{SOW exists?}
    F -->|Yes| S["[SOW dir]/.idr-N.md"]
    F -->|No| D["planning/YYYY-MM-DD/.idr-N.md"]
```

### IDR の内容

```markdown
# IDR: [目的の要約]

## 変更概要

[1段落の要約]

## 主要な変更

### [file.md](file.md)

[説明]
[コードスニペット]

## 設計判断

[理由と代替案]
```

## 関連

- [IDR_GENERATION](../rules/workflows/IDR_GENERATION.md) — IDR仕様
- [Claude Code Hooks Docs](https://docs.anthropic.com/en/docs/claude-code/hooks)
