---
globs: ["skills/**/*.ts", "workflows/**/*.ts", "hooks/**/*.ts"]
scenes: ["implement"]
---

# macOS の一時ディレクトリは symlink を経由するので、パスの等値比較は両側を realpathSync で解決してから行う

## 内容

macOS の一時ディレクトリ `/var/folders/...` は `/private/var/folders/...` への symlink を経由する。自分で組み立てたパスと、子プロセスや `process.argv` が報告するパスを文字列のまま比べると、同じファイルを指していても一致しない。比較する両側を `realpathSync` で解決してから比べる。

## 定型手順

1. 一時ディレクトリの下に作ったパスを、外から届くパスと比較する箇所を探す。子プロセスの Read 引数、`process.argv[1]`、stream-json の tool_use 引数がこれに当たる
2. 自分の側のパスを `realpathSync` で解決してから、渡すか比較する
3. テストでは symlink を張った一時ディレクトリを `TMPDIR` に指定し、macOS 以外でもずれを再現させる

## 参照コード

- `workflows/_lib/entry-point.ts` の `isMainModule`（`argv[1]` とモジュールのパスを両方 `realpathSync` で解決してから比べる）
- `skills/ablate/scripts/reference_arm.ts` の `assembleFixture`（fixture のルートを `realpathSync` で実パスにして返す）
- `skills/ablate/tests/reference-arm.test.ts` の `T-530`（symlink 越しの一時ディレクトリでも、コマンドの cwd が実パスで返ることを確かめる）

## 根拠

- #605 TS 移植の第 1 スライスで、`isMainModule` の `process.argv[1] === fileURLToPath(import.meta.url)` という素の比較が macOS の `/var` と `/private/var` の symlink 越しに一致せず、CLI が何も印字せず exit 0 した
- #748 skill-reference arm の fixture の cwd が symlink を解決しておらず、agent の Read パス (`/private/var/folders/...`) と一致しないため、露出の判定が必ず 0 になっていた。fixture のルートを `realpathSync` で返すよう直した
