---
globs: ["skills/**/*.ts"]
scenes: ["implement"]
---

# 同じディレクトリの兄弟スクリプトが補助関数を個別に複製する

## 内容

同じディレクトリの兄弟スクリプトが、既に他の export を共有している隣接モジュールへまだ置かれていない補助関数 (再帰探索、日付整形、git top level 解決など) を、それぞれ個別に手書きで複製することがある。差が対象条件などの引数化できる程度しかない場合、1 関数として隣接の共有モジュールへ抽出できる。

## 定型手順

1. 兄弟スクリプト間で同じ形の補助関数が重複していないか比較する
2. 違いが引数で吸収できる程度 (対象ファイル名の条件など) かを確認する
3. 既に他の export を共有している隣接モジュールへ、引数化した 1 関数として移す
4. 挙動を変えずに移すため、移す前後で既存テストが通ることを確認する

## 参照コード

- `skills/dr/scripts/dr_common.ts` の `gitTopLevel`/`filesUnder`/`localDate`（3 スクリプトが個別に持っていた git top level 解決・再帰探索・日付整形を集約した）

## 根拠

- #736 `skills/dr/scripts/pre-check.ts` と `update-index.ts` が `gitTopLevel`、再帰探索、`YYYY-MM-DD` の日付整形をそれぞれ自前で持っていた。両スクリプトは既に隣接の `dr_common.ts` から `resolveDrDir` 等を import 済みだった
- #738 3 つの補助関数を `dr_common.ts` へ移し、再帰探索はファイル名条件を引数で受け取る `filesUnder(dir, keep)` にした。挙動は変えず、移行前後で `skills/dr/tests/` が通ることを確認した
