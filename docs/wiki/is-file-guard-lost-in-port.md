---
globs: ["**/*.ts"]
scenes: ["implement"]
---

# Python の Path.is_file() ガードは TS 移植で個別に書き直さないと素通りする

## 内容

Python の `Path(path).is_file()` は、対象が存在しない・ディレクトリである・読めないなど「ファイルとして扱えない」全ての場合に false を返す。TS へ移植するとき `existsSync` だけに置き換えるとディレクトリにも true を返して用途を誤り、チェック自体を落とすと存在しないパスで未捕捉の例外が上がる。どちらも `statSync(path).isFile()` を明示的に書けば防げる。

## 定型手順

1. Python 側が `Path(...).is_file()` (または同等の存在・種別チェック) を持つ箇所を移植前に洗い出す
2. `existsSync` 単体は使わず、`existsSync(path) && statSync(path).isFile()` の形か、`statSync` を try/catch で包む形で書き直す
3. 対象が存在しない・ディレクトリである入力を実際に投げて、Python 版と同じ exit code / 出力になることを確認する

## 参照コード

- `skills/dr/scripts/dr_common.ts` の `isFile`（`existsSync` と `statSync().isFile()` を組み合わせた形）
- `hooks/_lib/mirror_prose.ts` の `isReadableFile`（`Path(path).is_file()` の移植として復元された形）

## 根拠

- #679 TS 移植で Node の existsSync はディレクトリにも true を返すため、Python の Path.is_file() が担っていたファイル種別チェックを個別に書かないとガードを素通りしてクラッシュする
- #691 `emit` が Python の `not Path(path).is_file()` のチェックを落として `check`/`extractProse`/`readFileSync` を直接呼び、存在しないファイルを指す payload で未捕捉の ENOENT (exit 1) になった。Python 版は同じ入力で exit 0 だった。`isReadableFile` を復元して修正した
