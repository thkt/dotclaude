---
paths:
  - "**/*.sh"
  - "**/*.zsh"
---

# Shell

## Shebang

| 条件                                    | 選択                                |
| --------------------------------------- | ----------------------------------- |
| デフォルト (macOS)                      | `#!/bin/zsh`                        |
| `BASH_REMATCH` または `declare -A` 必要 | `#!/bin/bash`                       |
| 常に避ける                              | `#!/bin/sh` (POSIX `sh` は配列なし) |

## 実行

| モード  | 設定                                                   |
| ------- | ------------------------------------------------------ |
| Strict  | `set -euo pipefail` (強制)                             |
| Relaxed | `set +e` (情報用)                                      |
| SIGPIPE | `cmd \| head` で pipefail 時 → 末尾に `\|\| true` 追加 |

## zsh の落とし穴

| 落とし穴         | NG                                            | OK                                                     |
| ---------------- | --------------------------------------------- | ------------------------------------------------------ |
| echo 内の JSON   | `echo "$JSON" \| jq`                          | `printf '%s' "$JSON" \| jq`                            |
| パターン結合     | `COMBINED=$(IFS='\|'; echo "${PATTERNS[*]}")` | `COMBINED="${(j:\|:)PATTERNS}"`                        |
| Regex マッチ変数 | `$BASH_REMATCH[0]`                            | `$MATCH` (`setopt REMATCH_PCRE` 適用時)                |
| 単語境界         | `\b` を POSIX ERE 内 (非対応)                 | `setopt REMATCH_PCRE` 後に `\b`                        |
| パス正規化       | `realpath` (存在しないと失敗)                 | `${path:a}` (zsh 修飾子)                               |
| realpath -m      | `realpath -m` (macOS で利用不可)              | `python3 -c "import os; print(os.path.realpath(...))"` |
| echo エスケープ  | `echo "$var"` (`\n`, `\t`, `\b` を解釈)       | `printf '%s' "$var"` (リテラル)                        |
| 連想配列         | bash `declare -A`                             | zsh `typeset -A`                                       |

## エラーポリシー

| Hook 種別     | ポリシー    | 根拠                            |
| ------------- | ----------- | ------------------------------- |
| Enforcement   | fail-closed | セキュリティ/ゲートは停止すべき |
| Informational | fail-open   | ステータス/フォーマットは継続可 |
