---
globs: ["**/workflows/**/*.js", "**/workflows/_lib/*.ts"]
scenes: ["implement"]
---

# agent が中継する gate report にコマンド出力を埋め込まない

## 内容

gate.ts の report は relay agent の structured output を通って script に戻る。report の中にコマンドの stdout / stderr の tail が入っていると、その中継が壊れる。長い report は途中で切れて parse できず、relay は report 全体でなく中の `stdout_tail` を自分の stdout に写す。script が読むのは verdict と classification と candidates だけなので、呼び出し側は `--tail-bytes 0` を渡し、report にコマンド出力を残さない。

## 定型手順

1. relay agent が運ぶ JSON report のうち、script が読むフィールドを列挙する
2. 読まないフィールド、特にコマンド出力の写しは、呼び出し側の引数で空にする。gate.ts は `--tail-bytes 0`
3. relay の prompt には「stdout はコマンド自身が出力したもの。JSON 文書なら文書全体を返し、中のフィールドを写さない」と書く。決定論側の修正を補う説明で、これ単独には頼らない
4. verdict が pass なのに `gate_did_not_report` になるときは、relay の transcript で tool_result に届いた report と structured output の stdout を突き合わせる

## 参照コード

- `workflows/code.js` の `GATE_TAIL_BYTES` (report に tail を残さない呼び出し側の値と、その理由)
- `workflows/code.js` の `relayStdout` (relay agent の prompt と `{stdout, stderr}` の schema)
- `workflows/_lib/gate.ts` の `tail` (report に残す出力の切り出し。0 で空になる)
- `workflows/code/tests/code.gate.test.js` の T-018 (組み立てた gate command が `--tail-bytes 0` を持つことを固定する)

## 根拠

- #614 gate report が agent 経由で戻る途中で切れ、5.7 KB の report が parse できない形で届いた。長さの大半は 2 つの出力 tail で、呼び出し側は 800 byte に絞った
- #664 relay agent (haiku) が gate.ts を正しく実行し verdict pass の report を受け取った後、structured output の stdout に report でなく中の `evidence.stdout_tail` (test command の TAP 末尾) を写し、build の seam が `gate_did_not_report` で止まった。呼び出し側を `--tail-bytes 0` にして report からコマンド出力を消した
