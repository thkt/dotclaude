---
globs: ["**/*.ts"]
scenes: ["implement", "pr-create"]
---

# build 計画の語りを実装のコメントに残さない

## 内容

build の Red step が置く scaffold の説明や、unit の contract を写したコメント (「TDD Red-step scaffold」「この unit は digest primitive だけを持つ」「plan が名指した」) は、Green の後も着地した実装と矛盾したまま残る。読み手は plan に到達できない。コメントは現在のコードが何をするかと、その理由だけを書き、計画の経緯は commit message と issue に置く。

## 定型手順

1. Green の後、変更ファイルで `scaffold`、`TODO(U-`、`Red-step`、「plan が」、「この unit は」を検索する
2. 見つかった文は、現在のコードが読める事実 (契約、理由) に書き換えるか削除する
3. 経緯を残すなら commit message の本文に書く

## 参照コード

- `agents/enhancers/enhancer-code.md` (着地後に AI slop を落とす simplifier。build の Cleanup stage が呼ぶ)
- `workflows/build.js` の `CLEANUP_SCHEMA` (Cleanup stage が返す結果の形)

## 根拠

- #653 run-workflow.ts と meta-contract.test.js に build の Red step が書いた「scaffold は script を評価しない」の説明が Green の後も残り、cleanup の commit で削除した
- (research) 監査で `skills/_lib/harness_hash.ts` の「この unit は digest primitive だけを持つ」(11 symbol を export する現状と矛盾) と `workflows/_lib/run-workflow.ts` の「plan が名指した」(読み手が到達できない参照) が残っていることを確認した
