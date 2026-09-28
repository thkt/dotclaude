---
globs: []
scenes: ["pr-create"]
---

# PR 本文の Review focus 節で、重点を置くファイルと流し読みでよいファイルを分けて示す

## 内容

PR 本文の Review focus 節では、振る舞いが変わる箇所を重点として挙げ、流し読みでよいファイルを理由とともに別に示す。流し読みでよいのは、コメントだけの変更や、コード一致を確認済みの `.ja/` ミラーやテストの stub のように、振る舞いを変えないファイルである。

## 定型手順

1. diff のファイルを、振る舞いが変わるものと変わらないものに分ける
2. 振る舞いが変わる箇所を重点として挙げ、何が変わるかを 1 行で書く
3. 振る舞いが変わらないファイルを「流し読みでよい」としてまとめ、そう言える理由 (コメントのみ、ミラーのコード一致を確認済み、など) を添える

## 参照コード

- `skills/pr/templates/pr.md` の `## Review focus` (骨格の行「Where to look hard, and what can be skimmed」と Guidelines 表の OK/NG 例)
- `skills/pr/references/pr-writing.md` の `Review focus` (リポジトリの骨格に節が無いとき `## Review focus` 節を置く)

## 根拠

- #648 Review focus で `build.js` と `code.js` の振る舞いの変更を挙げ、audit.js、assert.js、run-workflow.js、sandbox/hako、skills/ablate を「コメントのみの変更なので流し読みでよい」と分けた
- #760 Review focus で Ship と CI、revision の照合、Codex との差分を重点に挙げ、`.ja/` (文字列とコメントを除いたコードの一致を確認済みのミラー) とテストの stub を「流し読みでよい」と分けた
