---
status: "accepted"
date: "2026-09-10"
decision-makers: "thkt"
---

# Place the scribe gate outside the hooks shebang rule

## Context and Problem Statement

`hooks/_lib/scribe_gate.py` は `.github/workflows/scribe.yml` の `gate` ステップが `python3 hooks/_lib/scribe_gate.py` として直接起動する CI 専用スクリプトで、実行ビットは持たない。中身は `scribe_trigger.py` のアンダースコア始まりの内部関数（`_unmerged_scribe_pr_exists`/`_has_new_input`/`_last_scribe_merge`）をプロセス内 import で呼ぶだけの薄い判定層である。`scribe_trigger.py` は実行ビット付きの実フック `hooks/post-bash/scribe_prompt.py`（shebang `#!/opt/homebrew/bin/python3`）とも共有されており、この共有関係が `scribe_gate.py` が `hooks/_lib/` に置かれている理由になっている。

issue #632 のスライドで `skills/scribe/scripts/` 配下の `find_wiki_rule.py`/`triage.py`/`verify_run.py`/`structure_page.py` は `.ts` へ移行済みで（`skills/scribe/tests/scribe-scripts-retirement.test.ts` がその退役を固定する）、`hooks/_lib` 配下の Python は DR-0112 の Migration Strategy が「最後のスライス」と位置づけたまま残っている。`scribe_gate.py` を `.ts` へ移すとき、置き場所を `hooks/_lib/` に残すか `skills/scribe/scripts/` へ出すかで、次の 3 つの制約への当たり方が変わる。

- `hooks/_lib/tests/shebang-ts.test.ts:84`（T-013）: `hooks/_lib/*.ts` に対し shebang 行を一切禁止する（`libHasShebangOffenders`）。glob はディレクトリ境界を越えて深さ方向に一致するため、`hooks/_lib/` 配下ならテストファイルを含め対象になる
- DR-0114: hooks 層の `.ts` に bun の絶対パス shebang（`#!/opt/homebrew/bin/bun`）を固定する。根拠は settings.json が hook を shebang 経由で直接起動し、その PATH が truncated であること（macOS ローカル実行が前提）
- `scribe.yml` の `gate` ステップは `runs-on: ubuntu-latest`。settings.json 経由ではなく workflow の `run:` ステップが直接起動し、`actions/setup-node` を現状持たない

CI の起動方法（interpreter）を決めないと、この置き場所の判断も固まらない。

## Decision Drivers

- T-013 の禁止（shebang 行そのものの有無）は `hooks/_lib/` に置く場合にのみ関係する
- DR-0114 の bun 固定 shebang は「settings.json が実行ビット付きで直接起動する hook」だけが対象で、`scribe_gate.py` は実行ビットを持たず `python3 ...` と明示 interpreter 付きで呼ばれている
- `scribe_gate.py` は `scribe_trigger.py` の内部関数をプロセス内 import で使う。`scribe_trigger.py` は実フック `scribe_prompt.py` と共有され、DR-0112 の Migration Strategy 上 `hooks/_lib` に残る
- `scribe.yml` の `gate` ステップは Linux (`ubuntu-latest`) で動き、`test.yml` が node 24 を明示 pin している理由（node 22 は型ストリップを無フラグで行わない）がここにも当てはまる

## Considered Options

- `hooks/_lib/scribe_gate.ts` としてその場に残す
- `skills/scribe/scripts/scribe_gate.ts` として、`.ts` 化済みの scribe scripts と並べる

## Decision Outcome

Chosen option: "`hooks/_lib/scribe_gate.ts` としてその場に残す"、because `scribe_gate.py` が今も実行ビットなし・明示 interpreter 起動という形を保っており、この形のまま shebang 行を書かなければ T-013 の禁止にそのまま従える。DR-0114 は settings.json 経由の直接起動フックだけを対象にしており、`scribe_gate.ts` はその対象に当たらないため適用範囲外として確認できるだけで、DR-0114 の決定自体を変える理由にならない。`scribe_trigger.ts`（DR-0112 の Migration Strategy が最後のスライスに位置づける）との同居を保てば、`scribe_prompt.ts` と共有する内部関数へのプロセス内 import が同一ディレクトリのまま続けられる。`skills/scribe/scripts/` へ出す案は、その共有 import を `hooks/_lib` へ跨いで参照する形に変え、かつ `scribe_gate` は SKILL.md の Phase から呼ばれる skill script ではなく `claude` ステップより前の `gate` ステップから呼ばれる CI 専用スクリプトなので、`skills/scribe/scripts/` が担う「skill が呼ぶスクリプト群」という枠からも外れる。

CI の interpreter は、`scribe.yml` に `test.yml` と同じ理由（node 22 は型ストリップを無フラグで行わない、24 から有効）で `actions/setup-node`（node-version: 24)を追加し、`gate` ステップを `CLAUDE_GH_BIN="$(command -v gh)" node hooks/_lib/scribe_gate.ts` に置き換える。実行ビットも shebang も付けず、現在の `python3 hooks/_lib/scribe_gate.py` と同じ「明示 interpreter 起動」の形を保つ。

### Consequences

- Good, because T-013 の禁止に反する行を書く必要が最初から生じない。実行ビットなし・shebang なしという現状の形をそのまま `.ts` へ持ち越すだけで満たせる
- Good, because `scribe_trigger.ts` との同居が続き、`scribe_prompt.ts` が共有する内部関数へのプロセス内 import が `hooks/_lib` 内で完結する
- Good, because DR-0114 を書き換えずに、その適用範囲が「settings.json が直接起動する実行ビット付き hook」であることをこの記録で確認できる
- Bad, because `scribe.yml` に `actions/setup-node` を追加する分だけ CI のステップが増える。現状は python3 のみで済んでいた
- Bad, because `hooks/_lib` は Python と TypeScript が過渡的に混在する状態が続く。`scribe_gate.py`/`scribe_trigger.py` 自体の `.ts` 化は本記録の対象外で、別スライスに残る

### Confirmation

`scribe_gate.py`/`scribe_trigger.py` が `.ts` 化されるスライスで、`hooks/_lib/tests/shebang-ts.test.ts` の T-013 が対象 glob `hooks/_lib/*.ts` に両ファイルを含めたまま green であることと、`skills/scribe/tests/ci_parity_test.py` と同じ形のテストが `scribe.yml` の `gate` ステップに `actions/setup-node`（node-version 24）と `node hooks/_lib/scribe_gate.ts` の呼び出しが揃っていることを検査する。移行が始まるまでは対象が Python のままなので、この記録は置き場所と interpreter の決定だけを残す。

## Pros and Cons of the Options

### `hooks/_lib/scribe_gate.ts` としてその場に残す

`scribe_gate.py` の現在地をそのまま維持し、`.ts` 化後も `scribe_trigger.ts` と同じディレクトリに置く。

- Good, because `scribe_trigger.ts` の内部関数への import が同一ディレクトリ内で完結し、`hooks/_lib` 外から `hooks/_lib` の非公開関数を参照するという層越えが生まれない
- Good, because 実行ビットなし・shebang なしという現状の形が T-013 の禁止をそのまま満たす
- Bad, because `hooks/_lib` が「settings.json が起動する hook 群の lib」という役割に加えて「CI ワークフローが直接呼ぶスクリプト」も抱えることになり、ディレクトリの役割が一枚岩ではなくなる

### `skills/scribe/scripts/scribe_gate.ts` として scribe scripts と並べる

`find_wiki_rule.ts`/`triage.ts`/`verify_run.ts`/`structure_page.ts` と同じディレクトリに置き、scribe 関連の TypeScript を一箇所に集める。

- Good, because scribe に関わる TypeScript 資産が 1 ディレクトリに揃い、探しやすくなる
- Bad, because `scribe_trigger.ts` への import が `hooks/_lib` を跨ぐ相対パスになり、`scribe_prompt.ts` と共有する内部関数を skill 側から直接触る形になる
- Bad, because `scribe_gate` は SKILL.md のどの Phase からも呼ばれず、`claude` ステップより前の `gate` ステップから呼ばれる。`skills/scribe/tests/ci_parity_test.py` や `scripts-contract.test.ts` が検査する「SKILL.md の allowed-tools と scribe.yml の対応」の枠の外にあるスクリプトを、その枠を検査するディレクトリへ置くことになる
- Bad, because `skills/scribe/scripts/*.ts` は `#!/usr/bin/env node` の shebang と実行ビットを持ち `${CLAUDE_SKILL_DIR}/scripts/...` という形で直接起動される群だが、`scribe_gate` は `gate` ステップから明示 interpreter 付きで呼ばれる形を変える理由がなく、この群と同じ起動形にする価値がない

## More Information

### DR-0114 適用範囲の確認

DR-0114 の Decision Outcome は「hooks 層は bun で実行し」で、その根拠は settings.json が hook を shebang 経由で直接起動し、PATH が truncated であること（`hooks/_lib/tests/shebang_test.py`、#534）に限られる。`scribe_gate.ts` は settings.json から起動されず、`scribe.yml` の `gate` ステップが `node hooks/_lib/scribe_gate.ts` と明示 interpreter 付きで起動する。したがって DR-0114 の bun 固定 shebang はこのファイルに適用されない。本記録は DR-0114 を supersede せず、その適用範囲が「settings.json が実行ビット付きで直接起動する macOS ローカルの hook」であることを確認するだけである。

### CI Interpreter

`scribe.yml` は現在 `actions/setup-node` を持たない（python3 だけで完結していたため）。`scribe_gate.ts` を追加する段で、`test.yml` と同じ node 24 を `actions/setup-node` で pin する。理由も `test.yml` のコメントと同じ: node 22 は `.ts` を `node --test`/直接実行に渡す型ストリップを無フラグで行わず、24 (LTS) から無フラグで有効になる。`gate` ステップの `run:` は `CLAUDE_GH_BIN="$(command -v gh)" node hooks/_lib/scribe_gate.ts` とし、実行ビットにも shebang にも依存しない。

### Migration Strategy

`scribe_gate.py`/`scribe_trigger.py` を `.ts` へ移すスライスで、DR-0112 の Migration Strategy と DR-0114 の Migration Strategy が定める hooks 層の書き換え手順に従う。`scribe_trigger.ts` は `scribe_prompt.ts` が実行ビット付きで直接起動する側なので、その shebang は DR-0114 の bun 絶対パスに従う。`scribe_gate.ts` は実行ビットを付けず shebang 行も書かない。`scribe.yml` の `gate` ステップの書き換えと `actions/setup-node` の追加は、このファイルの `.ts` 化と同じ PR で行う。

### Rollback Plan

置き場所の決定だけを覆す場合は、この記録を revert し `skills/scribe/scripts/` へ移す選択肢に戻る。`scribe_gate.py`/`scribe_trigger.py` 自体の `.ts` 化が始まっていなければ、コードの移動は発生しない。

### Reassessment Triggers

- `scribe_trigger.py`/`.ts` が `scribe_prompt.py`/`.ts` との共有をやめ、`scribe_gate` 専用の実装に分岐する（同一ディレクトリに置く理由が消える）
- `scribe.yml` の `gate` ステップが settings.json 相当の直接起動形（実行ビット + shebang）に変わり、DR-0114 の対象に入る
- `skills/scribe/scripts/` 配下のスクリプト群が CI ワークフロー本体からも直接呼ばれる形に一般化され、「SKILL.md の Phase から呼ばれるスクリプト」という現在の枠を離れる

### 関連する記録

- DR-0112 Adopt TypeScript for helper scripts。`hooks/_lib` を最後のスライスに位置づけた記録で、`scribe_gate.py`/`scribe_trigger.py` もその対象に含まれる
- DR-0113 Ban bun-branded identifiers in TypeScript sources。`scribe_trigger.ts` が node/bun 両方で動く discipline を守る根拠
- DR-0114 Justify the hooks TypeScript migration by the type contract。settings.json 起動の hook に bun の絶対パス shebang を固定した記録で、本記録はその適用範囲を確認するだけで supersede しない
