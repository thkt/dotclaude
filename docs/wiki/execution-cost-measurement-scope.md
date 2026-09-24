---
globs: ["**/hooks/**/*.ts", "**/workflows/**/*.js"]
scenes: ["plan", "implement"]
---

# 実行時間は測った経路と待ち時間の範囲を添えて読む

## 内容

hook や workflow の時間を比較するときは、起動だけを測った値、処理を含む値、利用者が待つ経過時間を区別する。早期 return する入力、初回起動、並列数の上限、後続の直列処理によって、同じ部品でも測定値の意味が変わる。過去の数値は、その入力・版・測定方法が一致する範囲でだけ判断材料にする。

## 定型手順

1. 遅いと考える経路と、比較したい範囲を決める。runtime の空起動、hook の早期 return、通常処理、workflow 全体のどれを測るかを明記する。
2. 初回起動と空回し後の値を分け、入力、runtime、対象版、反復回数、集計方法を残す。最小値を採った記録を平均や通常時の保証として読まない。
3. 並列処理は個々の実行時間の和で待ち時間を説明しない。実際の開始・終了記録から、同時実行の制限と後続処理の待ちを確認する。
4. 比較側が別の測定方法なら、その差を先に記す。コマンドごとの subprocess 起動費用を、実装内のファイル走査そのものの費用としない。

## 参照コード

- `settings.json` の `PreToolUse`（hook の実際の登録入口）。
- `hooks/pre-bash/wiki_scene.ts` の `main`（対象外コマンドで早期 return する経路）。
- `workflows/audit.js` の `parallel`（Review や critic の実行構成。過去の同時実行数を現在の runtime の保証にはしない）。

## 根拠

- [research:2026-09-11-hook-startup-measurement.md](../research/2026-09-11-hook-startup-measurement.md) は早期 return する入力で hook の起動費用を測り、初回だけ突出した値を空回し後の値と区別した。本文の比較基準と DR 番号は当時の記録であり、通常処理を同条件で比較した結果ではない。
- [research:2026-08-02-audit-reviewer-refinement.md](../research/2026-08-02-audit-reviewer-refinement.md) は実際の開始・終了記録から、並列数の制限と長い直列処理を確認した。当時の割合やモデル名を現行の性能として使わない。
- [research:2026-06-22-issue17-bash-gate-filesystem-delta.md](../research/2026-06-22-issue17-bash-gate-filesystem-delta.md) は gates の調査で、ファイルごとに subprocess を起動する測定を実装内の走査へ改め、見積りを訂正した。別 repo の観測であり、その時間を dotclaude の値へ移さない。
