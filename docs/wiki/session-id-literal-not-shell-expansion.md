---
globs: ["**/skills/**/*.md", "**/workflows/**/*.js"]
scenes: ["implement"]
---

# Bash tool は CLAUDE_SESSION_ID を export しないので、セッション ID はシェル展開に頼らずリテラルで渡す

## 内容

Bash tool のサブプロセスには `CLAUDE_SESSION_ID` が export されていない。コマンドに `"$CLAUDE_SESSION_ID"` と書くと空の値に展開され、セッション ID を受け取るはずの script は空の値で動く。skill では harness が本文へ置換する `${CLAUDE_SESSION_ID}` を使い、その値をリテラルとしてコマンドに書かせる。workflow では script が既に知っている値から ID を取り出し、agent へリテラルで渡す。

## 定型手順

1. skill、reference、workflow の prompt に `"$CLAUDE_SESSION_ID"` のシェル展開が無いかを探す
2. skill では SKILL.md に `${CLAUDE_SESSION_ID}` を書き、手順ではその値をコマンドにリテラルで書くよう指示する
3. workflow では、既に確定した値 (worktree のパスなど) から ID を取り出して prompt に埋め込む
4. シェル展開の形が戻らないことをテストで固定する

## 参照コード

- `skills/pr/SKILL.md` の `Prompt Log Integration`（harness が置換する `${CLAUDE_SESSION_ID}` でセッション ID を持つ）
- `skills/pr/references/prompt-log.md` の `Steps`（SKILL.md が持つ ID をコマンドにリテラルで書く）
- `skills/pr/tests/prompt-log-contract.test.ts` の `no shell-expanded session id remains`（`"$CLAUDE_SESSION_ID"` が SKILL.md と reference に残っていないことを検査する）
- `workflows/assert.js` の `worktreeIdMatch`（Cleanup が `boot.worktree_path` から ID を取り出し、agent にリテラルで渡す）
- `workflows/assert.js` の `bootstrapPrompt`（Bootstrap の手順文は `worktree.ts "$CLAUDE_SESSION_ID"` とシェル展開の形のまま残っている）

## 根拠

- #696 assert の Cleanup が worktree ID を agent 自身の `$CLAUDE_SESSION_ID` 展開に任せていた。Bootstrap が確定した `boot.worktree_path` から ID を取り出し、リテラルとして prompt に渡す形に変えた
- #745 `/pr` の prompt-log 手順が `render "$CLAUDE_SESSION_ID"` と書いていた。独立レビューがこの環境の Bash tool で `CLAUDE_SESSION_ID` が未設定であることを確かめた。後続のコミットが、SKILL.md の `${CLAUDE_SESSION_ID}` をリテラルで書く形に直した
