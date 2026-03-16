---
paths:
  - "**/*.sh"
  - "**/*.zsh"
  - ".claude/hooks/**"
---

# シェルスクリプト規約

## シェル

| ルール  | 値                                                   |
| ------- | ---------------------------------------------------- |
| Shebang | `#!/bin/zsh`（macOS デフォルト）                     |
| 厳格    | 強制: `set -euo pipefail`                            |
| 緩和    | 情報提供: `set +e`                                   |
| SIGPIPE | `cmd \| head` + pipefail → 末尾に `\|\| true` を追加 |

## zsh の落とし穴

| 落とし穴           | 悪い例                                        | 良い例                                                 |
| ------------------ | --------------------------------------------- | ------------------------------------------------------ |
| echo での JSON     | `echo "$JSON" \| jq`                          | `printf '%s' "$JSON" \| jq`                            |
| パターン結合       | `COMBINED=$(IFS='\|'; echo "${PATTERNS[*]}")` | `COMBINED="${(j:\|:)PATTERNS}"`                        |
| 正規表現マッチ変数 | `$BASH_REMATCH[0]`                            | `$MATCH`（`setopt REMATCH_PCRE` と併用）               |
| 単語境界           | POSIX ERE での `\b`（非対応）                 | `setopt REMATCH_PCRE` してから `\b`                    |
| パス正規化         | `realpath`（存在しないパスで失敗）            | `${path:a}`（zsh 修飾子）                              |
| realpath -m        | `realpath -m`（macOS で利用不可）             | `python3 -c "import os; print(os.path.realpath(...))"` |
| echo のエスケープ  | `echo "$var"`（`\n`, `\t`, `\b` を解釈）      | `printf '%s' "$var"`（リテラル）                       |
| 連想配列           | bash `declare -A`                             | zsh `typeset -A`                                       |

## エラーポリシー

| フックタイプ | ポリシー    | 根拠                                      |
| ------------ | ----------- | ----------------------------------------- |
| 強制         | fail-closed | セキュリティ/ゲートフックは停止必須       |
| 情報提供     | fail-open   | ステータス/フォーマットフックはスキップ可 |
