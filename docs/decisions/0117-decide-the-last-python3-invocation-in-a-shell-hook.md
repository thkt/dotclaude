---
status: "accepted"
date: "2026-09-11"
decision-makers: "thkt"
---

# Decide the last python3 invocation in a shell hook

## Context and Problem Statement

DR-0112 の Migration Strategy は helper script を層ごとに TypeScript へ移す計画で、`hooks/_lib` を fan-in 16 の塊として最後のスライスに位置づけた。DR-0116（`hooks/_lib/scribe_gate.ts`）までの移行で、`docs/SPEC.md` の Per-hook decision and failure mode 表が挙げる 3 本の shell hook（`herdr-agent-state.sh`/`statusline.sh`/`failure-alert.sh`）のうち `statusline.sh`/`failure-alert.sh` は元から python3 を呼ばず、python3 を呼ぶ shell hook は `hooks/herdr-agent-state.sh` 1 本だけが残った。同ファイル `:23` の `command -v python3 >/dev/null 2>&1 || exit 0` と、続く `:25` の `python3 - <<'PY' ... PY` ヒアドキュメントがその呼び出しである。

`herdr-agent-state.sh` は他の hook と出自が違う。ファイル先頭のコメントが明記する通り、herdr という外部ツールのインストーラーが書き出し、herdr 統合の再インストールや更新のたびに上書きされる。

```sh
# installed by herdr
# managed by herdr; reinstalling or updating the integration overwrites this file.
# add custom hooks beside this file instead of editing it.
```

settings.json は `~/.claude/hooks/herdr-agent-state.sh session` を SessionStart で直接起動する。PATH が truncated である前提は他の hook と同じだが、DR-0114 が固定した「hooks 層は bun の絶対パス shebang を持つ `.ts`」という規律の対象には元から入っていない。`.sh` のままで shebang は `#!/bin/sh` であり、DR-0112/DR-0114 のどちらの移行計画も「このリポジトリが著作する hook」を前提にしている。

`hooks/_lib` 配下にはまだ `japanese.py`/`hook_payload.py`/`textlint.py` という python3 の hook ライブラリが残っているが、これらは DR-0112 の Migration Strategy が名指しした最後のスライスの対象であり、hook 本体がこのリポジトリの著作物として python3 で書かれている。shell から python3 を呼び出す形の hook は `herdr-agent-state.sh` だけであり、本記録はこの 1 本だけを対象にする。

## Decision Drivers

- `herdr-agent-state.sh` はこのリポジトリが著作するファイルではなく、herdr のインストーラーが書き出し上書きする生成物である
- ファイル冒頭のコメントが「このファイルを直接編集せず、カスタム hook は隣に置け」と明記している
- `:23` の `command -v python3 >/dev/null 2>&1 || exit 0` は fail-open で無音に落ちる設計であり、`docs/wiki/silent-hook-failure.md` が記録する一連の事例（#519/#522/#523/#534/#618）と同じ系譜にある。採る案に関わらずこの性質を変えてはならない
- DR-0112 の Migration Strategy はすでに `plugins/` 配下の vendored スクリプト 45 本を「追跡外」として移行対象から外した前例を持つ

## Considered Options

- (1) ヒアドキュメントを `.ts` に移し `bun` で呼ぶ
- (2) shell だけで書き直す
- (3) 恒久的な除外として走査から外し、その理由を記録する

## Decision Outcome

Chosen option: "(3) 恒久的な除外として走査から外し、その理由を記録する", because `herdr-agent-state.sh` はこのリポジトリの持ち物ではなく herdr の生成物であり、そこへ費やす移行作業は herdr 統合の次回更新・再インストールで無音に上書きされ消える。それは `docs/wiki/silent-hook-failure.md` が挙げる「何も起きない」形の失敗そのもので、レビュー時点では移行が完了したように見えて実際の起動形は python3 のまま戻る。DR-0112 が `plugins/` に引いた「このリポジトリが著作しないコードは移行対象に含めない」という境界線を、この 1 本にも同じ理由でそのまま適用する。`:23` の fail-open な `command -v python3 || exit 0` はコードを一切変更しないため無条件に保たれる。

### Consequences

- Good, because 上書きされて消える移行作業に工数を割かずに済む
- Good, because DR-0112 の `plugins/` 除外と同じ境界線をこの 1 本にも適用でき、「このリポジトリが著作するコードだけを移行する」という基準が一貫する
- Good, because `:23` のフェイルオープン設計をコード変更なしにそのまま維持できる
- Bad, because `hooks/` 配下に python3 を呼ぶファイルが恒久的に 1 本残り、「hooks 層は TypeScript/bun で統一されている」という単純な言明ができなくなる。この記録がその例外を名指しして埋める
- Bad, because herdr が将来インストーラーの上書き挙動を変えた場合、この除外の前提が古びる。Reassessment Triggers に条件を残す

### Confirmation

`hooks/` 配下で python3 を呼ぶファイルを洗い出す（例: `ugrep -l python3 hooks/*.sh hooks/**/*.sh`）と `hooks/herdr-agent-state.sh` だけが挙がる状態を保つ。新しい shell hook がこのリストに加わった場合は本記録の対象外であり、別途移行するか除外理由を記録するかを個別に決める。`herdr-agent-state.sh` 自体の中身はこの記録の対象外（herdr 側の生成物）なので、このリポジトリのテストスイートに検査を追加しない。

## Pros and Cons of the Options

### (1) ヒアドキュメントを `.ts` に移し `bun` で呼ぶ

`:25` の `python3 - <<'PY' ... PY` を `bun` 経由で `.ts` ファイルを呼ぶ形に書き換える。

- Good, because 書ければ hooks 層の TypeScript 統一に近づく
- Bad, because 書き換えた `herdr-agent-state.sh` 自体が herdr の再インストール・更新で上書きされ、次回の herdr 統合更新で python3 版へ無音に戻る。ファイル冒頭のコメントが明記する挙動であり、`docs/wiki/silent-hook-failure.md` と同じ「何も起きない」形の失敗になる
- Bad, because settings.json の SessionStart 登録（`~/.claude/hooks/herdr-agent-state.sh session`）も herdr 側の管理下にあり、`.ts` を指す別ファイル・別登録に置き換えても herdr の次回更新が元の `.sh` 登録へ戻す可能性を排除できない

### (2) shell だけで書き直す

`:25` 以降の JSON 組み立てと Unix domain socket 通信を POSIX sh だけで実装し、python3 依存を除く。

- Good, because 書ければ python3 という追加ランタイムへの依存自体が消える
- Bad, because (1) と同じ理由で、書き換えは herdr の次回更新・再インストールで上書きされ消える
- Bad, because POSIX sh は JSON エンコードも Unix domain socket 通信もネイティブに持たず、`nc -U` のような外部コマンドへの依存を新たに持ち込む。可搬性が元の python3 版より悪化する

### (3) 恒久的な除外として走査から外し、その理由を記録する

`herdr-agent-state.sh` を TypeScript/bun 移行のスコープ外として扱い、その理由をこの記録に残す。コードは変更しない。

- Good, because 上書きされて消える作業に工数を割かない
- Good, because DR-0112 が `plugins/` に引いた境界線と同じ理由（このリポジトリが著作しないコードは対象外）を一貫して適用できる
- Bad, because `hooks/` 配下に python3 呼び出しが恒久的に 1 本残る

## More Information

### Reassessment Triggers

- herdr のインストーラーが `herdr-agent-state.sh` への手動編集を再インストール・更新の間も保持する挙動に変わる
- herdr 自身が python3 依存を外した（あるいは bundled runtime を同梱する）バージョンのフックを配布するようになる
- herdr 統合をこのリポジトリから外す決定が出て、`herdr-agent-state.sh` ごと削除される

### 関連する記録

- DR-0112 Adopt TypeScript for helper scripts。`plugins/` の vendored スクリプトを移行対象から外した前例で、本記録は同じ境界線を `herdr-agent-state.sh` に適用する
- DR-0114 Justify the hooks TypeScript migration by the type contract。hooks 層の `.ts` に bun の絶対パス shebang を固定した記録で、対象は「settings.json が実行ビット付きで直接起動するこのリポジトリ著作の hook」に限られ、`herdr-agent-state.sh` は著作元が異なるためその対象に含まれない
- DR-0116 Place the scribe gate outside the hooks shebang rule。`hooks/_lib` 配下の python3 → TypeScript 移行の直近の前例
