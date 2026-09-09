#!/usr/bin/env node
/// <reference types="node" />
// Usage: cli.ts <list|extract|verify> <xlsx> [args]
//   list    <xlsx>                          シート一覧と充填率を出す
//   extract <xlsx> --out <dir> [options]    シートを Markdown へ変換する
//   verify  <xlsx> <dir>                    元の全セルが出力に残っているか照合する
//
// cli.js の TypeScript 移植。parseArgs/list/extract/verify の流れと usage 文言、exit code
// (usage と引数不備が 2、sheet 無しと cell 欠落が 1) は同じで、node:* だけで書く。readXlsx が
// 返す Workbook/Sheet の形は自前で複製せず、hucre/xlsx 自身の型をそのまま使う。
//
// Contract: 退役した JavaScript 版 cli の parseArgs / list / extract / verify。
// export は持たない。convert.ts と違い、このファイルは直接実行される CLI のエントリポイントで
// あり、他から import されない。

import { readFile, writeFile, mkdir } from "node:fs/promises";
import type { Sheet, Workbook } from "hucre/xlsx";
import {
  cellText,
  fillRatio,
  isColumnRuler,
  profiles,
  sheetFileName,
  sheetToMarkdown,
} from "./convert.ts";

const out = (text: string): void => {
  process.stdout.write(`${text}\n`);
};
const err = (text: string): void => {
  process.stderr.write(`${text}\n`);
};

type ReadXlsx = typeof import("hucre/xlsx").readXlsx;

let readXlsx: ReadXlsx;
try {
  ({ readXlsx } = await import("hucre/xlsx"));
} catch {
  err(
    "hucre is not installed. Run `bun add hucre` in a directory above this script: " +
      "the repository root in a dev tree, or ~/.claude for a plugin install.",
  );
  process.exit(2);
}

interface ParsedArgs {
  positional: string[];
  options: Record<string, string>;
}

const parseArgs = (argv: string[]): ParsedArgs => {
  const positional: string[] = [];
  const options: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith("--")) options[arg.slice(2)] = argv[++i];
    else positional.push(arg);
  }
  return { positional, options };
};

const { positional, options } = parseArgs(process.argv.slice(2));
const [command, source, target] = positional;

if (!command || !source) {
  err("usage: cli.ts <list|extract|verify> <xlsx> [args]");
  process.exit(2);
}

const buffer = await readFile(source);

if (command === "list") {
  const workbook: Workbook = await readXlsx(buffer);
  const { total, filled, ratio } = fillRatio(workbook.sheets);
  for (const [index, sheet] of workbook.sheets.entries() as IterableIterator<[number, Sheet]>) {
    out(`[${index}] ${sheet.name} - ${sheet.rows.length} rows`);
  }
  out(
    `\nsheets: ${workbook.sheets.length} / cells: ${total.toLocaleString()} / ` +
      `filled: ${filled.toLocaleString()} (${(ratio * 100).toFixed(1)}%)`,
  );
  // 閾値は書式ごとに違うので、ここで分岐せず判断を読み手に返す。
  if (ratio < 0.2) out("Fill ratio is low. Convert with extract before reading.");
  process.exit(0);
}

if (command === "extract") {
  const outDir = options.out;
  if (!outDir) {
    err("extract requires --out <dir>.");
    process.exit(2);
  }
  const profileName = options.profile ?? "generic";
  const profile = profiles[profileName];
  if (!profile) {
    err(`no such profile: ${profileName} (${Object.keys(profiles).join(", ")})`);
    process.exit(2);
  }
  // 読み込み結果はファイル名に要る元のシート位置を落としており、判定関数だけが
  // その位置を見られる。
  const only = options.sheet;
  let resolved: number | null = null;
  let filter: Parameters<ReadXlsx>[1];
  if (only != null && /^\d+$/.test(only)) {
    resolved = Number(only);
    filter = { sheets: [resolved] };
  } else if (only != null) {
    filter = {
      sheets: (info) => {
        if (info.name !== only) return false;
        resolved = info.index;
        return true;
      },
    };
  }
  const workbook: Workbook = await readXlsx(buffer, filter);
  if (only != null && workbook.sheets.length === 0) {
    err(`no such sheet: ${only}. Check the name and index with list.`);
    process.exit(1);
  }
  await mkdir(outDir, { recursive: true });

  const index: string[] = [
    `# ${source.split("/").pop()}`,
    "",
    `profile: \`${profileName}\``,
    "",
    "| # | Sheet | Rows | File |",
    "| --- | --- | --- | --- |",
  ];
  for (const [position, sheet] of workbook.sheets.entries() as IterableIterator<[number, Sheet]>) {
    const number = resolved ?? position;
    const file = sheetFileName(number, sheet.name);
    await writeFile(`${outDir}/${file}`, sheetToMarkdown(sheet, profile));
    index.push(
      `| ${number} | ${sheet.name} | ${sheet.rows.length} | [${file}](${encodeURI(file)}) |`,
    );
  }
  if (only == null) await writeFile(`${outDir}/index.md`, `${index.join("\n")}\n`);
  out(`${workbook.sheets.length} sheets -> ${outDir}`);
  process.exit(0);
}

if (command === "verify") {
  if (!target) {
    err("verify requires the output directory.");
    process.exit(2);
  }
  const workbook: Workbook = await readXlsx(buffer);
  interface MissingSheet {
    sheet: string;
    reason?: string;
    lost?: number;
    sample?: string;
  }
  const missing: MissingSheet[] = [];
  for (const [index, sheet] of workbook.sheets.entries() as IterableIterator<[number, Sheet]>) {
    let markdown: string;
    try {
      markdown = await readFile(`${target}/${sheetFileName(index, sheet.name)}`, "utf8");
    } catch {
      missing.push({ sheet: sheet.name, reason: "no output" });
      continue;
    }
    // escapeCell の変換を戻さないと、エスケープしたセルがすべて欠落として出る。
    const flat = markdown.replace(/<br>/g, "").replace(/\\\|/g, "|").replace(/\s+/g, "");
    let lost = 0;
    let sample = "";
    for (const row of sheet.rows) {
      const cells = row.map((cell) => cellText(cell).trim()).filter((t) => t !== "");
      // 列番号のものさしは変換後の Markdown に残らないため、数えると毎シート欠落として
      // 報告され、本物の欠落が埋もれる。
      if (isColumnRuler(cells)) continue;
      for (const text of cells) {
        if (flat.includes(text.replace(/\s+/g, ""))) continue;
        lost++;
        if (!sample) sample = text.slice(0, 40);
      }
    }
    if (lost) missing.push({ sheet: sheet.name, lost, sample });
  }
  if (!missing.length) {
    out(`OK: every cell of ${workbook.sheets.length} sheets survived into the output.`);
    process.exit(0);
  }
  for (const entry of missing) {
    err(`${entry.sheet}: ${entry.reason ?? `${entry.lost} cells lost`} ${entry.sample ?? ""}`);
  }
  process.exit(1);
}

err(`unknown command: ${command}`);
process.exit(2);
