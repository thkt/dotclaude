---
status: "accepted"
date: "2026-09-13"
decision-makers: "thkt"
---

# Adopt Biome cognitive complexity beside oxlint

## Context and Problem Statement

AI agent が書く関数のネストの深さを、どの検査も数えていなかった。`.oxlintrc.json` は `no-unused-vars` と TypeScript 向けの `no-restricted-*` しか持たず、`if` を 5 段重ねた関数でも lint は緑のまま通る。

oxlint が持つ `complexity` (循環的複雑度) では足りない。循環的複雑度は分岐を等しく数え、ネストに加点しない。`workflows/_lib/codex-run.ts` の `withSlot(async () => ...)` は認知的複雑度 48 だが、循環的複雑度では閾値 20 に届かず検出されない。ネストに加点する指標は Biome の `noExcessiveCognitiveComplexity` だけで、oxlint 1.78.0 には無い。

一方で、Biome は `workflows/*.js` と `.ja/workflows/*.js` の 7 本を parse error にする。これらは vm で関数本体として走る workflow script で、トップレベルに `return` を持つ。oxlint はこれを読める。

linter を 2 つ持つ状態をどう置くか。

## Decision Drivers

- ネストの深い関数を CI が名指しする手段が要る
- 既存の 58 件 (`.ja/` の写しを含む root 実行の件数) を分割する前に CI を赤にしない
- AI agent が設定、パス除外、CI step、抑止コメントのどの経路でも検査を外せない
- oxlint と oxfmt の役割を変えない

## Considered Options

- Biome を lint 専用でルール 1 本だけ入れ、workflow script は oxlint の `max-depth` で補う
- oxlint の `complexity` と `max-depth` だけで近似する
- 変更ファイル限定で `--error-on-warnings` の error gate を置く
- gates hook で抑止コメントの書き込みを止める
- `package.json` の `scripts.lint` で両 linter を束ねる

## Decision Outcome

Chosen option: "Biome を lint 専用でルール 1 本だけ入れ、workflow script は oxlint の `max-depth` で補う", because 認知的複雑度を数える規則が Biome にしか無く、Biome が読めない 7 本は oxlint の `max-depth` 3 がネストだけを数えられるため。

`biome.json` は `linter.rules.preset: "none"` で他規則を止め、`formatter` と `assist` を無効にし、`noExcessiveCognitiveComplexity` を `error`、閾値 15 で持つ。`files.includes` は `**` から `workflows/*.js`、`.ja/workflows/*.js`、`plugins/**`、`skills/*/test/cases/**` を除く。`vcs.useIgnoreFile: true` で gitignore 配下を歩かない。`.oxlintrc.json` の `workflows/*.js` override に `max-depth: ["error", 3]` を足す。

両規則は `error` に上がった。CI は `npx oxlint --format=github` と `npx biome lint --reporter=github` で error を PR の annotation にし、step が赤になる。

### Consequences

- Good, because ネストの深い関数が PR の annotation として見える
- Good, because Biome の設定は規則 1 本分で、oxfmt と oxlint の役割は変わらない
- Good, because `biome.json` の形、抑止コメント、`.gitignore`、`test.yml` の配線をテストが固定し、どの経路で外しても `node --test` が落ちる
- Bad, because linter が 2 つになり、`workflows/*.js` だけ別の規則 (`max-depth`) で数える
- Bad, because `warn` の間は CI が赤にならず、annotation を読まない限り気付かない
- Bad, because `biome.json` の `overrides` は不在を固定するが、`linter.includes` など別キーでの除外は未検査

### Confirmation

`workflows/tests/biome-cognitive-complexity-discipline.test.js`、`workflows/tests/oxlint-workflow-depth.test.js`、`workflows/tests/lint-suppression-absence.test.js`、`workflows/tests/lint-gate-wiring.test.js` が実バイナリを走らせて固定する。CI は `.github/workflows/test.yml` の oxlint step と biome step。

## Pros and Cons of the Options

### Biome を lint 専用でルール 1 本だけ入れ、workflow script は oxlint の `max-depth` で補う

認知的複雑度は Biome、それ以外は oxlint と oxfmt のまま。

- Good, because ネストに加点する指標をそのまま使える
- Good, because Biome の他規則と formatter を止めるので、oxlint と oxfmt の判定と衝突しない
- Bad, because 7 本の workflow script だけ `max-depth` という別の指標になる

### oxlint の `complexity` と `max-depth` だけで近似する

linter を増やさない。

- Good, because 設定が `.oxlintrc.json` の 1 つに収まる
- Bad, because 循環的複雑度はネストに加点せず、認知的複雑度 48 の `withSlot` を見逃す。計測では認知的 15 で 41 件、循環的 20 で 9 件で、差の大半がネスト由来だった

### 変更ファイル限定で `--error-on-warnings` の error gate を置く

`biome lint --changed --since=origin/main --error-on-warnings` を別 step で走らせ、触ったファイルだけ赤にする。

- Good, because 新しいネストが CI を赤にする
- Bad, because Biome の `--changed` はファイル単位で、直近 5 commit の変更ファイルに既に 11 件当たる。既存の件数を分割し終えるまで、ほぼ毎 PR が赤になる
- Bad, because checkout の `fetch-depth: 0` が要る

### gates hook で抑止コメントの書き込みを止める

PostToolUse の hook が `biome-ignore` の書き込みを拒否する。

- Good, because agent が抑止コメントを書いた時点で止まる
- Bad, because merge、rebase、Claude Code 外の編集には効かない。CI テストの補完にしかならない
- Bad, because thkt/gates はこのリポジトリの外にあり、規則を足すと開く全リポジトリで発火する

### `package.json` の `scripts.lint` で両 linter を束ねる

CI が `bun run lint` を呼ぶ。

- Good, because gates hook が `lint` script を検出し、毎編集で両 linter を走らせる
- Bad, because `package.json` に scripts が無い現状を崩す。CI のコメントは step ごとに理由を書く形で、束ねると読めなくなる

## More Information

### Migration Strategy

規則は着地と同時に全 tracked file へ掛かる。既存の件数は `warn` のまま残し、関数ごとに別 Issue で分割する。

### Rollback Plan

`biome.json`、`package.json` の devDependency、`test.yml` の biome step、`.oxlintrc.json` の `max-depth` 行を消せば元に戻る。4 本のテストは対象と一緒に消す。

### Reassessment Triggers

- ✓ root で `npx biome lint` と `npx oxlint` を走らせて warning が 0 件になる。両規則を `error` に上げる（#710 で実施）
- oxlint が認知的複雑度の規則を持つ。Biome 側を撤去し、`.oxlintrc.json` に寄せる
- Biome がトップレベル `return` を持つ script を parse できる。`max-depth` 側を撤去し、workflow script も Biome で数える
- gates hook の linter は `oxlint (priority) / biome (fallback)`、formatter は `oxfmt (priority) / biome (fallback)`。oxlint か oxfmt を外すと Biome が黙って昇格するので、どちらかを外す判断が出たら `biome.json` の `preset: "none"` と `formatter.enabled: false` を見直す

### 関連する記録

- DR-0113 Ban bun-branded identifiers in TypeScript sources。lint 設定が規律を執行し、根拠を決定記録に置く同じ形
- `rules/conventions/DOCUMENTS.md` の Routing 1 が、規則を `rules/` に、その根拠を決定記録に置くと定める。ここでは `biome.json` と `.oxlintrc.json` が決定論で執行するので、`rules/` に散文の写しを置かない
