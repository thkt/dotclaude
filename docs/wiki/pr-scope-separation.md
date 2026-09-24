---
globs: []
scenes: ["pr-create"]
---

# PR スコープの分離

## 内容

1 つの issue を閉じる PR に、その issue が宣言していない変更を混ぜない。作業ツリーに別件が同居していたら、コミット前に分離して別 PR にする。分離できず混在したままコミットした場合は、PR 本文に scope 外のファイルを列挙し、レビューの焦点を宣言スコープ側に示す。

## 定型手順

1. コミット前に `git status` で作業ツリー全体を見て、issue の Scope に無いファイルを洗い出す
2. 別件があれば別ブランチへ分離し、独立した PR にする
3. 混在したままコミット済みなら、PR 本文に scope 外のファイルを列挙し、レビューの焦点を宣言スコープ側に書く
4. 意図的に複数件をまとめる PR では、コミットを件ごとに分け、本文にコミット単位の表を置く
5. build の PR 本文にある「Plan スコープ外の変更ファイル」は、分岐点から作業ツリーまでの差分と未追跡ファイルから作られる。未コミットの別件と、この PR が必要とする未コミットの変更が同じ一覧に並ぶので、1 件ずつ PR の機能に要るかを確かめ、要るものはコミットする

## 参照コード

- `workflows/build.js` の `scopeDeviations` (Verify が plan の files スコープ外の変更ファイルを列挙する)
- `workflows/build/diff-files.ts` (一覧の元になる `git diff <base> --name-only` と未追跡ファイルの和を返す)
- `agents/reviewers/reviewer-conformance.md` (diff と issue/spec の突き合わせで scope creep を報告する)

## 根拠

- #189 #192 #194 narrow な PR に無関係な rules / doctrine 変更を混ぜた再発指摘
- #210 degradation 記録の PR に PR 本文レンダラの変更が同梱され、conformance レビューが scope_creep として検出した
- #211 #210 の scope 外 2 件を独立した PR として切り出した
- #214 scope-deviations 14 件。model pin migration / scribe skill 変更 / context-monitor 変更の 3 系統が宣言スコープ外と指摘された
- #228 作業ツリーに溜まっていた 5 件を 1 PR にまとめ、コミット単位の表を本文に置いて読み分けられるようにした
- #742 build の Plan スコープ外一覧に、作業ツリーにあった別件の未コミット変更 (`settings.json`、`knip.json`、`hooks/herdr-agent-state.sh` など) が並び、独立レビューが scope_creep として挙げた
- #745 同じ一覧に並んだ `skills/pr/tests/template-priority.test.js` は、この PR の prompt-log 手順が必要とするテスト変更だった。コミットしないまま CI に出し、CI がそのテスト (`the PR goes up as a draft, since nothing confirms before creating it`) で落ちた。後続のコミットでテストの変更を PR に入れた
- #746 同じ別件の未コミット変更が、Plan スコープ外一覧と scope_creep の指摘に再び並んだ
