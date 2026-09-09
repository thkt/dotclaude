---
globs: ["skills/**/*.ts", "workflows/**/*.ts"]
scenes: ["implement"]
---

# 既存の共有 helper を import せず手書きで複製する

## 内容

同じファイルや近傍で既に他の export を import 済みの共有 helper があっても、それは import せず同等処理を手書きで複製することがある。同種の兄弟ファイルが同じ shared helper を正しく import している場合、比較すれば検出しやすい。

## 定型手順

1. 実装対象と同じ処理をする既存の shared helper が、同じ import 元に無いか確認する
2. 同種の兄弟ファイル (同じ CLI エントリ形、同じテスト形) が同じ shared helper を import しているかを比較する
3. 見つかったら import して使い、同等処理を手書きしない

## 参照コード

- `workflows/_lib/entry-point.ts` の `isMainModule`（CLI エントリの共有 helper）
- `workflows/_lib/tests/_cli-fixture.ts` の `fixture`（テスト fixture 検索の共有 helper）

## 根拠

- (research) 既存の共有 helper (entry-point.ts の isMainModule) があるのに、移植元の手書き同等処理をそのまま写した
- #675 `skills/census/tests/list-source-files.test.ts` が、同じファイル内で `runCli`/`withTempHome` を `workflows/_lib/tests/_cli-fixture.ts` から import 済みでありながら `fixture()` だけをローカルに再定義していた。兄弟テストの `skills/outcome/tests/validate-outcome.test.ts` と `skills/research/tests/find-prior-research.test.ts` はいずれも共有の `fixture` を import しており、レビューで検出されて import に修正された
