/// <reference types="node" />
// reviewer の finding が、仕込んだ1つの欠陥に当たったかを判定する。この当たり判定は、
// exposure.ts が同じ run の transcript から読む exposed/contaminated と並んで、
// reference_observation.ts(#743 の U-004)が arm ごとの run 結果へ畳み込む入力になる。
//
// agents/_lib/finding-schema.md の Base Fields が、このモジュールが読む finding の形を決める。
// schema を渡す caller(workflows/audit.js の findingsSchema)の下では、JSON の finding は
// `prefix` の欄を持たない -- `### {PREFIX}-{seq}` という見出しは skill route の Markdown 出力
// にしか存在しない -- `line` は決まった形式のない自由な文字列で、Duplicate-Location Rule は
// 重複した位置を finding を繰り返す代わりに `evidence` へまとめる。そのため当たりは、`file`
// の一致と、`line` か `evidence` に書かれた位置の重なりで判定し、`prefix` は読まない。
//
// 定数名と関数名は snake_case のまま保つ。同じディレクトリの arms.ts、verdict.ts、
// reference_arm.ts、exposure.ts が持つ規約と同じ形。

// このモジュールが finding から読む Base Fields。severity と summary は finding-schema.md が
// 必須とするが行位置の情報を持たないため、この型はそれらと、判定が読まないそれ以外の
// Base Field をすべて省く。
export interface Finding {
  file: string;
  line: string;
  evidence?: string;
}

// reference-arm fixture の corpus ファイルへ、既知の行範囲(両端を含む)で仕込んだ1つの欠陥。
export interface PlantedDefect {
  file: string;
  line_start: number;
  line_end: number;
}

/** 位置を表す文字列が名指す1つの行範囲(両端を含む)。単一行なら `start === end`。 */
interface LineRange {
  start: number;
  end: number;
}

/** `"45-55"` や `"45"` のような1つの位置トークンを、両端を含む範囲へ解析する。トークンが
 * 数字を1つも名指していなければ `null`。ここの正規表現はどれも完全に固定され、量指定子の
 * グループは高々1つで、量指定子が別の量指定子の中に入れ子になることもない。そのためトークン
 * の解析は、トークンの中身によらずトークン長に対して線形のままである。 */
function parse_range_token(token: string): LineRange | null {
  const digitsAndDash = token.replace(/[^\d-]/g, "");
  const rangeMatch = digitsAndDash.match(/^(\d+)-(\d+)$/);
  if (rangeMatch !== null) {
    return { start: Number(rangeMatch[1]), end: Number(rangeMatch[2]) };
  }
  const singleMatch = digitsAndDash.match(/^(\d+)$/);
  if (singleMatch !== null) {
    return { start: Number(singleMatch[1]), end: Number(singleMatch[1]) };
  }
  return null;
}

/** `finding.line` が名指すすべての位置。finding-schema.md の Base Fields が言う
 * 「位置の line 部分。文字列として」のとおり、カンマ区切りで複数を名指せる。キーワードは
 * 不要: `line` は位置専用の欄なので、カンマ区切りの各トークンをそのまま1つの位置として読む。 */
function line_field_ranges(line: string): LineRange[] {
  return line
    .split(",")
    .map((token) => parse_range_token(token.trim()))
    .filter((range): range is LineRange => range !== null);
}

/** `evidence` の中で「line」または「lines」という語の直後に名指された、"Line 44" や
 * "lines 46-48" のようなすべての位置。evidence は自由な文章であり、閾値や件数といった無関係
 * な数字も持ちうるため、位置専用の欄である `finding.line` とは違い、そのキーワードが名指した
 * 箇所だけを位置として読む。 */
function evidence_ranges(evidence: string): LineRange[] {
  const words = evidence.split(/\s+/);
  const ranges: LineRange[] = [];
  for (let i = 0; i < words.length - 1; i++) {
    const word = words[i].replace(/[^a-z]/gi, "").toLowerCase();
    if (word !== "line" && word !== "lines") {
      continue;
    }
    const range = parse_range_token(words[i + 1]);
    if (range !== null) {
      ranges.push(range);
    }
  }
  return ranges;
}

/** 両端を含む範囲 `a` が `[defect.line_start, defect.line_end]` と1行でも重なっているか。 */
function overlaps_defect(a: LineRange, defect: PlantedDefect): boolean {
  return a.start <= defect.line_end && defect.line_start <= a.end;
}

/** `finding` が `defect` に当たったかどうか: `finding.file` が `defect.file` と同じファイルを
 * 名指しており、かつ `finding.line` か `finding.evidence` が名指す位置の少なくとも1つが
 * `[defect.line_start, defect.line_end]` の中に収まっている。`prefix` の欄は読まない --
 * finding-schema.md の Base Fields が位置について持つのは file/line/evidence であって prefix
 * ではなく、skill route の `### {PREFIX}-{seq}` という見出しは、このモジュールの caller が
 * 作ることのない Markdown だけの表示形だからである。 */
export function is_hit(finding: Finding, defect: PlantedDefect): boolean {
  if (finding.file !== defect.file) {
    return false;
  }
  const locations = line_field_ranges(finding.line);
  if (finding.evidence !== undefined) {
    locations.push(...evidence_ranges(finding.evidence));
  }
  return locations.some((location) => overlaps_defect(location, defect));
}
