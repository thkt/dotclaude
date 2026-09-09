#!/usr/bin/env node
/// <reference types="node" />
// Usage: import { cellText, cellsOf, isColumnRuler, fillRatio, escapeCell, buildColumns,
// rowToCells, profiles, sheetToMarkdown, sheetFileName } from "./convert.ts"
//
// convert.js の TypeScript 移植。抽出は書式に依存させず、書式ごとの判定はすべてプロファイル
// が持つ。
//
// Contract: skills/transcribe/scripts/convert.js の cellText / cellsOf / isColumnRuler /
// fillRatio / escapeCell / buildColumns / rowToCells / profiles / sheetToMarkdown /
// sheetFileName。skills/transcribe/tests/convert.test.ts が検証する。

interface CellWithText {
  text: unknown;
}
interface CellWithFormula {
  formula: unknown;
  value?: unknown;
}
interface CellWithError {
  error: unknown;
}
type StructuredCell = CellWithText | CellWithFormula | CellWithError;

/** 日付、数式、エラー、リッチテキストはそれぞれ別の形で入る。 */
export function cellText(cell: unknown): string {
  if (cell == null) return "";
  if (cell instanceof Date) return cell.toISOString().slice(0, 10);
  if (typeof cell === "object") {
    const structured = cell as unknown as StructuredCell;
    if ("text" in structured) return String(structured.text);
    if ("formula" in structured) {
      return structured.value != null ? String(structured.value) : `=${structured.formula}`;
    }
    if ("error" in structured) return String(structured.error);
    return JSON.stringify(cell);
  }
  return String(cell);
}

interface CellInfo {
  col: number;
  text: string;
}

/**
 * 業務 Excel は 1 項目をセル結合で複数セルに広げるため、列位置が表の列と項目の
 * 入れ子を後から復元する手がかりになる。
 */
export function cellsOf(row: unknown[]): CellInfo[] {
  const out: CellInfo[] = [];
  for (let i = 0; i < row.length; i++) {
    // 語中の NBSP は trim() を通り抜け、出力を後から grep するときに当たらなくなる。
    const text = cellText(row[i]).replace(/\u00a0/g, " ").trim();
    if (text !== "") out.push({ col: i, text });
  }
  return out;
}

const textsOf = (cells: CellInfo[]): string[] => cells.map((cell) => cell.text);

/** 1,2,3,... と連番だけが並ぶ行は Excel 上の列番号ガイドで、内容ではない。 */
export function isColumnRuler(texts: string[]): boolean {
  if (texts.length < 10) return false;
  return texts.every((text, i) => text === String(i + 1));
}

interface FillRatio {
  total: number;
  filled: number;
  ratio: number;
}

/** 充填率が低いほどレイアウト目的の空セルが多く、整形の効果が大きい。 */
export function fillRatio(sheets: Iterable<{ rows: unknown[][] }>): FillRatio {
  let total = 0;
  let filled = 0;
  for (const sheet of sheets) {
    for (const row of sheet.rows) {
      total += row.length;
      for (const cell of row) if (cellText(cell).trim() !== "") filled++;
    }
  }
  return { total, filled, ratio: total === 0 ? 0 : filled / total };
}

export function escapeCell(text: string): string {
  return text.replace(/\|/g, "\\|").replace(/\n/g, "<br>");
}

interface Column {
  start: number;
  end: number;
  label: string;
}

/**
 * データ行のセルは列位置が入る区間へ割り当てるので、途中の列が空でも右の列がずれない。
 */
export function buildColumns(head: CellInfo[], sub: CellInfo[]): Column[] {
  const starts = [...new Set([...head, ...sub].map((cell) => cell.col))].sort((a, b) => a - b);
  const labelAt = new Map<number, string>();
  for (const cell of [...head, ...sub]) labelAt.set(cell.col, cell.text);
  return starts.map((start, i) => ({
    start,
    end: i + 1 < starts.length ? starts[i + 1] : Infinity,
    label: labelAt.get(start) ?? "",
  }));
}

export function rowToCells(
  cells: CellInfo[],
  columns: Column[],
  nestColumnLabel: string | null,
): string[] {
  const slots: string[][] = columns.map(() => []);
  for (const cell of cells) {
    let index = columns.findIndex((column) => cell.col >= column.start && cell.col < column.end);
    if (index < 0) index = 0;
    // 入れ子を表す列では、列内のセル位置が階層の深さを表す。
    const nested = nestColumnLabel != null && columns[index].label.includes(nestColumnLabel);
    const depth = nested ? cell.col - columns[index].start : 0;
    slots[index].push("　".repeat(Math.max(0, depth)) + cell.text);
  }
  return slots.map((values) => escapeCell(values.join(" ")));
}

export interface Profile {
  docHeaderFirstCell: string | null;
  heading: RegExp | null;
  tableHeadWords: RegExp | null;
  nestColumnLabel: string | null;
  code: RegExp | null;
}

/**
 * 値が null の判定は行わないため、generic は表として解釈せず、書式が未知の
 * ファイルでもセルを落とさない。
 */
export const profiles: Record<string, Profile> = {
  generic: {
    docHeaderFirstCell: null,
    heading: null,
    tableHeadWords: null,
    nestColumnLabel: null,
    code: null,
  },
  "ja-api-spec": {
    docHeaderFirstCell: "案件名",
    heading: /^[0-9０-９]+[．.]\s*/,
    tableHeadWords: /^(項番|#|No\.?|版)$/,
    nestColumnLabel: "パラメータ名",
    code: /^[{}[\]"]|^curl\b|^-[HdX]\b|^https?:\/\/|^'|^}'/,
  },
};

// 本文にもヘッダ語と同じ 1 セルが現れるので、語だけでなく列数もヘッダの条件にする。
function isTableHead(cells: CellInfo[], profile: Profile): boolean {
  if (!profile.tableHeadWords) return false;
  return cells.length >= 3 && profile.tableHeadWords.test(cells[0].text);
}

export interface Sheet {
  name: string;
  rows: unknown[][];
}

export function sheetToMarkdown(sheet: Sheet, profile: Profile = profiles.generic): string {
  const rows = sheet.rows.map(cellsOf);
  const lines: string[] = [`# ${sheet.name}`, ""];
  let i = 0;

  if (profile.docHeaderFirstCell && rows[0]?.[0]?.text === profile.docHeaderFirstCell) {
    const meta: string[] = [];
    for (const row of rows.slice(0, 3)) {
      if (!row.length || isColumnRuler(textsOf(row))) continue;
      meta.push(row.map((cell) => cell.text).join(" / "));
    }
    if (meta.length) lines.push(`> ${meta.join("  \n> ")}`, "");
    i = 3;
  }

  let code: string[] = [];
  const flushCode = () => {
    if (!code.length) return;
    lines.push("```", ...code, "```", "");
    code = [];
  };

  while (i < rows.length) {
    const cells = rows[i];
    if (!cells.length || isColumnRuler(textsOf(cells))) {
      flushCode();
      i++;
      continue;
    }
    const first = cells[0].text;

    if (profile.heading && profile.heading.test(first) && cells.length <= 2) {
      flushCode();
      lines.push(`## ${cells.map((cell) => cell.text).join(" / ")}`, "");
      i++;
      continue;
    }

    if (isTableHead(cells, profile)) {
      flushCode();
      const head = cells;
      let next = i + 1;
      let sub: CellInfo[] = [];
      // データ行は必ず先頭列から始まるので、そこが空の行を 2 段目のヘッダとみなす。
      if (rows[next]?.length && rows[next][0].col > head[0].col) {
        sub = rows[next];
        next++;
      }
      const columns = buildColumns(head, sub);
      const body: string[][] = [];
      while (next < rows.length) {
        const row = rows[next];
        if (!row.length) break;
        if (profile.heading && profile.heading.test(row[0].text) && row.length <= 2) break;
        if (isTableHead(row, profile)) break;
        body.push(rowToCells(row, columns, profile.nestColumnLabel));
        next++;
      }
      const labels = columns.map((column) => escapeCell(column.label));
      lines.push(`| ${labels.join(" | ")} |`);
      lines.push(`| ${labels.map(() => "---").join(" | ")} |`);
      for (const row of body) lines.push(`| ${row.join(" | ")} |`);
      lines.push("");
      i = next;
      continue;
    }

    if (profile.code && cells.length === 1 && profile.code.test(first)) {
      code.push(first);
      i++;
      continue;
    }

    flushCode();
    const text =
      cells.length === 1
        ? escapeCell(first)
        : `- ${cells.map((cell) => escapeCell(cell.text)).join(" / ")}`;
    lines.push(text, "");
    i++;
  }
  flushCode();

  return (
    lines
      .join("\n")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/^(- .*)\n\n(?=- )/gm, "$1\n") + "\n"
  );
}

export function sheetFileName(index: number, name: string): string {
  return `${String(index).padStart(2, "0")}_${name.replace(/[/\\:*?"<>|]/g, "_")}.md`;
}
