#!/usr/bin/env node
/// <reference types="node" />
// Usage: enforcer_map.ts <repo-root>, invoked directly (skills/dr/scripts/update-index.ts の
// 形) であり、report.ts が verdict.ts / dr_gate.ts を import するのとは違う。
// Output: JSON array of {file, line_number, verdict, enforcer?} to stdout, one entry per
// non-blank line across the always-loaded files, file order then line order.
//
// skills/ablate/scripts/enforcer_map.py を TypeScript へ移植したもの: DELETE_CANDIDATE、
// ABLATION_RESIDUE、ENFORCER_TABLE、classify_line、classify_file、target_files、map_all、
// main。定数名と関数名は enforcer_map.py が宣言したとおりに保つ。arms.ts、verdict.ts、
// dr_gate.ts がこの同じディレクトリで保つのと同じ no-camelCase の規約。
//
// DELETE_CANDIDATE は ./verdict.ts から import せずローカルに宣言する: enforcer_map.py も
// verdict.py を import しておらず、report.py:90 は enforcer_map 側と verdict 側の判定を
// 共有 identity ではなく文字列値どうしの比較で突き合わせている。ローカル定数にすることで、
// この移植の import グラフは元の Python module と同じ形を保つ。
//
// map_all は targetFiles の省略可能な上書き引数を持つ: enforcer_map_test.py は
// unittest.mock.patch.object で target_files / harness_elements の結果を偽物に差し替えて
// おり、それは import 先 module 内の名前を re-bind する操作である。ESM の namespace
// import は外側から同じ形で re-bind できないため、代わりに上書き値を明示的な引数として
// 通す。
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { isMainModule } from "../../../workflows/_lib/entry-point.ts";
import { ALWAYS_LOADED, enumerate_elements } from "../../_lib/harness_elements.ts";

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
// enforcer_map.py の ENFORCER_TABLE をそのまま複製している。
export const ENFORCER_TABLE: Record<string, string> = {
  // settings.json はこのガードを両方の木で PostToolUse Edit/Write フックとして登録して
  // おり、hooks/_lib/mirror_prose.py の警告はこの違反そのものに対して "(MIRROR.md)" を
  // 引用している。
  [PROSE_LANGUAGE_ROW]: "hooks/edit/mirror_prose_guard.py",
};

/** always-loaded なファイルの分類済みの行 1 件。`enforcer` は `verdict` が
 * DELETE_CANDIDATE のときだけ存在する。enforcer_map.py の classify_file がすべての
 * エントリに `null` を持たせるのではなくその分岐でだけキーを設定するのと同じ形。 */
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
 * 相対パス。タプルとして持たず実行時に導出する理由は enforcer_map.py 自身の
 * target_files と同じ。 */
export function target_files(root: string): string[] {
  return enumerate_elements(root)
    .filter((element) => element.classification === ALWAYS_LOADED)
    .map((element) => element.path);
}

/** always-loaded なファイル全体の非空行を、ファイル順・行順で分類する。`targetFiles` を
 * 渡すと `target_files(root)` によるスキャンの代わりに使われる -- enforcer_map_test.py が
 * unittest.mock.patch.object で行う差し替えに相当する。 */
export function map_all(root: string, targetFiles?: readonly string[]): EnforcerMapEntry[] {
  const results: EnforcerMapEntry[] = [];
  for (const rel_path of targetFiles ?? target_files(root)) {
    results.push(...classify_file(root, rel_path));
  }
  return results;
}

// Python の json.dumps(entries, ensure_ascii=False) の既定の区切り文字は ", " と ": "
// (カンマとコロンの後にそれぞれ空白 1 つ) であり、indent を渡さない JSON.stringify は
// どちらの空白も付けない。凍結したフィクスチャは実際の python3 CLI の stdout をバイト
// 単位で記録しているため、main() の wire format は JSON.stringify の既定ではなく
// この区切り方に合わせる -- harness_elements.ts の toPythonJson が自身のエントリに対して
// 埋めるのと同じ差。
function toPythonJson(entries: readonly EnforcerMapEntry[]): string {
  const items = entries.map((entry) => {
    const fields = [
      `"file": ${JSON.stringify(entry.file)}`,
      `"line_number": ${JSON.stringify(entry.line_number)}`,
      `"verdict": ${JSON.stringify(entry.verdict)}`,
    ];
    if (entry.verdict === DELETE_CANDIDATE) {
      fields.push(`"enforcer": ${JSON.stringify(entry.enforcer)}`);
    }
    return `{${fields.join(", ")}}`;
  });
  return `[${items.join(", ")}]`;
}

export function main(argv: string[]): number {
  if (argv.length !== 1) {
    process.stderr.write("usage: enforcer_map.ts <repo-root>\n");
    return 2;
  }
  process.stdout.write(`${toPythonJson(map_all(argv[0]))}\n`);
  return 0;
}

if (isMainModule(import.meta.url)) {
  process.exit(main(process.argv.slice(2)));
}
