#!/usr/bin/env node
/// <reference types="node" />
// Usage: enforcer_map.ts <repo-root>, invoked directly (skills/dr/scripts/update-index.ts の
// 形) であり、report.ts が verdict.ts / dr_gate.ts を import するのとは違う。
// Output: JSON array of {file, line_number, verdict, enforcer?} to stdout, one entry per
// non-blank line across the always-loaded files, file order then line order.
//
// このモジュールが置き換える Python 版の enforcer-map script を TypeScript へ移植したもの:
// DELETE_CANDIDATE、ABLATION_RESIDUE、ENFORCER_TABLE、classify_line、classify_file、
// target_files、map_all、main。定数名と関数名は Python 版が宣言したとおりに保つ。arms.ts、
// verdict.ts、dr_gate.ts がこの同じディレクトリで保つのと同じ no-camelCase の規約。
//
// DELETE_CANDIDATE は ./verdict.ts から import せずローカルに宣言する: Python 版も自身の
// verdict module を import しておらず、report.ts の build_report は enforcer_map 側と
// verdict 側の判定を共有 identity ではなく文字列値どうしの比較で突き合わせている。ローカル
// 定数にすることで、この移植の import グラフは置き換えた Python module と同じ形を保つ。
//
// map_all は targetFiles の省略可能な上書き引数を持つ。enforcer-map.test.ts が固定の
// ファイル一覧を直接差し替えて使う。ESM の namespace import は外側から名前を re-bind
// できない -- Python の `unittest.mock.patch.object` が import 先 module 内の名前を
// re-bind するのとは違う形 -- ため、代わりに上書き値を明示的な引数として通す。
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { isMainModule } from "../../../workflows/_lib/entry-point.ts";
import { ALWAYS_LOADED, enumerate_elements } from "../../_lib/harness_elements.ts";
import { pythonJsonStringify } from "../../_lib/python_json.ts";

export const DELETE_CANDIDATE = "delete-candidate";
export const ABLATION_RESIDUE = "ablation-residue";

// MIRROR.md の "Prose language" 行の完全一致テキストを ENFORCER_TABLE の外側で持つ:
// JS は Python と違い隣接する文字列リテラルを自動連結しないため、object literal のキーを
// 式にするには computed key に式を渡す必要がある。
const PROSE_LANGUAGE_ROW =
  "| Prose language | Japanese under `.ja/`, English everywhere else. Covers comments, " +
  "test names, and assertion messages                                                   |";

// always-loaded な行の完全一致テキスト -> それを既に保証する enforcer。enforcer を
// 確認できなかった規則は、誰も確認していないカバレッジとしてでっち上げるのではなく、
// テーブルから外したままにする。そのため不在の行は ABLATION_RESIDUE として報告される。
// Python 版の ENFORCER_TABLE をそのまま複製している。
export const ENFORCER_TABLE: Record<string, string> = {
  // settings.json はこのガードを両方の木で PostToolUse Edit/Write フックとして登録して
  // おり、hooks/_lib/mirror_prose.ts の警告はこの違反そのものに対して "(MIRROR.md)" を
  // 引用している。
  [PROSE_LANGUAGE_ROW]: "hooks/edit/mirror_prose_guard.ts",
};

/** always-loaded なファイルの分類済みの行 1 件。`enforcer` は `verdict` が
 * DELETE_CANDIDATE のときだけ存在する。Python 版の classify_file がすべての
 * エントリに `null` を持たせるのではなくその分岐でだけキーを設定していたのと同じ形。 */
export interface EnforcerMapEntry {
  file: string;
  line_number: number;
  verdict: string;
  enforcer?: string;
}

/** `line` を既に保証する enforcer があれば DELETE_CANDIDATE、なければ ABLATION_RESIDUE。
 * residue は keep 判定ではない: その行を削除すると、他の何も肩代わりしない保証が
 * 失われることを表す。 */
export function classify_line(line: string): string {
  return line in ENFORCER_TABLE ? DELETE_CANDIDATE : ABLATION_RESIDUE;
}

/** 対象ファイル 1 件の非空行をすべて、ファイル内の順序どおりに分類する。空行は
 * マップすべき規則を持たないため、residue として報告せずスキップする。 */
export function classify_file(root: string, rel_path: string): EnforcerMapEntry[] {
  const text = readFileSync(join(root, rel_path), "utf8");
  const results: EnforcerMapEntry[] = [];
  const lines = text.split("\n");
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    if (line.trim() === "") continue;
    const verdict = classify_line(line);
    const entry: EnforcerMapEntry = { file: rel_path, line_number: index + 1, verdict };
    if (verdict === DELETE_CANDIDATE) {
      entry.enforcer = ENFORCER_TABLE[line];
    }
    results.push(entry);
  }
  return results;
}

/** `root` のハーネスがすべてのセッションのコンテキストへ常に読み込むリポジトリルート
 * 相対パス。タプルとして持たず実行時に導出する理由は Python 版自身の
 * target_files と同じ。 */
export function target_files(root: string): string[] {
  return enumerate_elements(root)
    .filter((element) => element.classification === ALWAYS_LOADED)
    .map((element) => element.path);
}

/** always-loaded なファイル全体の非空行を、ファイル順・行順で分類する。`targetFiles` を
 * 渡すと `target_files(root)` によるスキャンの代わりに使われる -- enforcer-map.test.ts が
 * 固定のファイル一覧に直接差し替えるのに使う。 */
export function map_all(root: string, targetFiles?: readonly string[]): EnforcerMapEntry[] {
  const results: EnforcerMapEntry[] = [];
  for (const rel_path of targetFiles ?? target_files(root)) {
    results.push(...classify_file(root, rel_path));
  }
  return results;
}

// wire format は JSON.stringify の既定ではなく json.dumps のバイト単位の区切り方に合わせる
// 必要がある -- 理由と、この系統の CLI がそれぞれの波かっこを手書きする代わりに共有する
// エンコーダについては python_json.ts のヘッダを参照。
export function main(argv: string[]): number {
  if (argv.length !== 1) {
    process.stderr.write("usage: enforcer_map.ts <repo-root>\n");
    return 2;
  }
  process.stdout.write(`${pythonJsonStringify(map_all(argv[0]))}\n`);
  return 0;
}

if (isMainModule(import.meta.url)) {
  process.exit(main(process.argv.slice(2)));
}
