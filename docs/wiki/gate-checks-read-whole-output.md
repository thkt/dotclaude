---
globs: ["**/workflows/_lib/*.ts"]
scenes: ["implement"]
---

# gate の anchor 照合と calibration の候補抽出は tail でなく出力全体を読む

## 内容

gate.ts は `--tail-bytes` で report に残す出力を絞る。この tail を `--require-output` / `--forbid-output` の照合や calibration の候補抽出にも使うと、数百件の suite では末尾が TAP の summary だけになり、`not ok` の行が窓の外に落ちて候補 0 件になる。tail は report の payload に限り、照合と抽出は decode した出力全体に対して行う。

## 定型手順

1. 出力を切り出す処理 (tail) と、出力を検査する処理 (照合、候補抽出) の入力を分け、検査は出力全体を読む
2. 失敗行の後に tail より長い出力を流すテストで、候補が返ることと anchor が通ることを固定する
3. tail を 0 にしても検査結果が変わらないことを確かめる

## 参照コード

- `workflows/_lib/gate.ts` の `hasExactOutputLine` と `calibrationCandidates` (decode した出力全体を受け取る)
- `workflows/_lib/tests/gate.test.ts` の T-035 と T-036 (tail の窓の外にある失敗行が候補と anchor に使えることを固定する)

## 根拠

- #659 build の Red calibration が 3 回続けて `calibration_missing_calibration_evidence` で止まった。code.js が渡す `--tail-bytes 800` の末尾は 469 件の suite では TAP の summary だけで、`not ok 321 - T-107 ...` は窓の外にあった。照合と抽出を出力全体に切り替えた
- #664 `--tail-bytes 0` でも anchor と候補抽出の結果が変わらないことを T-036 が固定した
