# Hooks Design

フックシステムの設計意図と仕組みを説明します。

## Overview

```mermaid
graph TD
    subgraph Events["Claude Code Events"]
        PRE[PreToolUse]
        POST[PostToolUse]
        PERM[PermissionRequest]
        NOTIFY[Notification]
        STOP[Stop]
        SUB_START[SubagentStart]
        SUB_STOP[SubagentStop]
    end

    subgraph Hooks["Hook Categories"]
        SEC[security/]
        LINT[lint/]
        FORMAT[format/]
        LIFE[lifecycle/]
        CODEMAP[codemap/]
        AGENTS[agents/]
        VIEWER[viewer/]
        NOTIFY_H[notifications/]
    end

    PRE --> SEC
    PRE --> LINT
    POST --> FORMAT
    POST --> LINT
    POST --> VIEWER
    PERM --> SEC
    STOP --> NOTIFY_H
    SUB_START --> AGENTS
    SUB_STOP --> AGENTS
    LIFE -.->|statusLine| Events
```

## Hook Categories

| Category | Trigger | Purpose |
| --- | --- | --- |
| `security/` | PreToolUse | Bash safety, permission control |
| `lint/` | Pre/PostToolUse | Code quality checks |
| `format/` | PostToolUse | Auto-formatting |
| `lifecycle/` | statusLine | Status line, PR cache |
| `codemap/` | PostToolUse | Architecture map update |
| `agents/` | Subagent* | Agent logging |
| `viewer/` | PostToolUse | SOW/Spec/IDR viewer |
| `notifications/` | Stop | Completion notification |

## Key Hooks

### security/

| Hook                    | Event             | Failure Mode | Purpose                    |
| ----------------------- | ----------------- | ------------ | -------------------------- |
| `bash-safety.sh`        | PreToolUse(Bash)  | fail-closed  | 危険コマンドをブロック     |
| `permission-request.sh` | PermissionRequest | fail-closed  | 自動承認/拒否の判定        |

### lint/

| Hook                  | Event              | Failure Mode | Purpose                |
| --------------------- | ------------------ | ------------ | ---------------------- |
| `pre-edit-read.sh`    | PreToolUse(Edit)   | fail-open    | Edit前にファイル読込   |
| `typescript-check.sh` | PostToolUse(Write) | fail-open    | tsc --noEmit 実行      |

### format/

| Hook              | Event                      | Failure Mode | Purpose            |
| ----------------- | -------------------------- | ------------ | ------------------ |
| `eof-newline.sh`  | PostToolUse(Write)         | fail-open    | EOF改行を保証      |
| `format.sh`       | PostToolUse(Write/Edit)    | fail-open    | biome/prettier実行 |

### lifecycle/

| Hook             | Trigger    | Purpose              |
| ---------------- | ---------- | -------------------- |
| `statusline.sh`  | statusLine | ステータスライン表示 |
| `_pr-cache.sh`   | (sourced)  | PR情報のキャッシュ   |

### agents/

| Hook                  | Event         | Failure Mode | Purpose              |
| --------------------- | ------------- | ------------ | -------------------- |
| `subagent-start.sh`   | SubagentStart | fail-open    | 開始ログ・通知音     |
| `subagent-analysis.sh`| SubagentStop  | fail-open    | トランスクリプト保存 |

### viewer/

| Hook | Event | Failure Mode | Purpose |
| --- | --- | --- | --- |
| `ccplanview-open.sh` | PostToolUse(Write) | fail-open | Open SOW/Spec/IDR in viewer |

### codemap/

| Hook              | Event | Failure Mode | Purpose                  |
| ----------------- | ----- | ------------ | ------------------------ |
| `auto-update.sh`  | -     | fail-open    | architecture.md 自動生成 |

## Configuration

hooks は `settings.json` で設定:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "~/.claude/hooks/security/bash-safety.sh",
            "timeout": 2000
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Write|Edit|MultiEdit",
        "hooks": [
          {
            "type": "command",
            "command": "~/.claude/hooks/format/format.sh",
            "timeout": 5000
          }
        ]
      }
    ]
  }
}
```

## Design Principles

### 1. Non-blocking by Default

フックは通常、操作をブロックしない。ブロックは明示的な設定が必要。

### 2. Fail-safe

フックがエラーで終了しても、Claude Code は継続動作。

### 3. Fail-mode Convention

- **fail-open** (`set +e`): エラー時はスキップして継続。大半のフックがこちら。
- **fail-closed** (`set -euo pipefail`): エラー時はブロック。セキュリティフックのみ。

### 4. Composable

小さなフックを組み合わせて複雑な動作を実現。

## IDR (Implementation Decision Record)

コミット時に `claude-idr` バイナリで自動生成される実装記録。

```mermaid
flowchart LR
    C[git commit] --> H[claude-idr]
    H --> F{SOW exists?}
    F -->|Yes| S["[SOW dir]/idr-N.md"]
    F -->|No| D["planning/YYYY-MM-DD/idr-N.md"]
```

## Related

- [Claude Code Hooks Docs](https://docs.anthropic.com/en/docs/claude-code/hooks)
