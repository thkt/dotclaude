---
globs: ["workflows/code.js", "workflows/_lib/gate.ts"]
scenes: ["implement"]
---

# gate レポートを中継する relay が読まないフィールドは既定サイズを絞る

## 内容

gate のレポートはシェル→agent の relay を経由して戻る。呼び出し側 script が読まないフィールド (`stdout_tail`/`stderr_tail` 等) を既定で大きく残すと、中継が確率的に途中で切れて JSON が壊れる事故と、relay がレポート全体でなくその中の tail フィールドをそのまま返してしまう事故の両方が起きる。呼び出し側が読まないフィールドは、残す積極的な理由 (人間が run log を読む手掛かり等) がない限り既定サイズを絞る。

## 定型手順

1. relay を経由して呼び出し側へ返るレポートの各フィールドについて、呼び出し側の script が実際に読むかを確認する
2. 読まないフィールドの既定サイズは、残す理由が無い限り最小 (0) にする
3. サイズを 0 より大きく残す場合は、その理由をコメントに明記し、中継の確率的切断や取り違えのリスクを許容している旨を残す

## 参照コード

- `workflows/code.js` の `GATE_TAIL_BYTES`（`stdout_tail`/`stderr_tail` を既定で 0 にし、relay が report と取り違える中身自体を無くす）
- `workflows/_lib/gate.ts` の `stdout_tail`/`stderr_tail`（呼び出し側の script は `verdict`/`classification`/`candidates` しか読まない）

## 根拠

- #614 gate レポートの中継はシェル→agent 経由で確率的に途中で切れるため、呼び出し側が読まない tail の既定サイズを 12000 から 800 に絞った
- #664 relay agent が report 全体でなく中の `stdout_tail` をそのまま `stdout` に写し `gate_did_not_report` で止まった。tail の既定サイズを 0 にして取り違える中身自体を無くした
