---
globs: ["**/agents/reviewers/**", "**/agents/critics/**"]
scenes: []
---

# reviewer の新設と再構築は Recall と FP を測ってから閉じる

## 内容

reviewer 系の agent を新しく作る、作り直す、または定義ファイルを変えたときは、test corpus に対する Recall と FP Rate を測ってから閉じる。観点を足しただけでは、拾えるようになったのか誤検出が増えただけなのかが分からない。frontmatter だけの変更も定義ファイルのハッシュを変えるので、CI の freshness gate は「最新の record が現行の定義を測っていない」として落ちる。

## 定型手順

1. 対象の観点を含む test corpus を用意する
2. 変更前の Recall と FP Rate を測る
3. 変更後に同じ corpus で blind protocol のまま測り直し、判定規則は前回の record から引き継ぐ
4. `node skills/_lib/harness_hash.ts <skill>` が出す 3 つのハッシュを record の top-level に書く
5. 両方の数値を issue か PR へ書いてから close する

## 参照コード

- `skills/_lib/review_score.ts`（corpus から Recall と FP Rate を出す）
- `rules/development/TESTING.md` の reviewer の行（測定を要求する側）
- `skills/_lib/harness_hash.ts` の `hashes`（定義・SKILL.md・corpus の 3 ハッシュを出す）
- `skills/_lib/tests/harness-freshness.test.ts` の `freshnessFailures`（最新 record のハッシュと現行内容を突き合わせる gate）
- `skills/_lib/review-harness.md`（blind protocol と record の形）

## 根拠

- #24 reviewer-security の test corpus へ Indirect Prompt Injection パターンを足した
- #28 reviewer-design の浅いモジュール検出へ deletion test を足した
- #43 reviewer-design を言語非依存の deletion test として再構築した
- #726 reviewer-security の frontmatter に omitClaudeMd を足しただけで freshness gate が definition_sha256 不一致で落ち、blind harness を再実行して record を追加した
