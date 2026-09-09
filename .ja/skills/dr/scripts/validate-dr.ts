#!/usr/bin/env node
/// <reference types="node" />
// Usage: validate-dr.ts <dr-file>
//
// stdout: JSON { file, errors, warnings, checks }
// exit: 0 if no errors (warnings allowed), 1 if errors
//
// 退役した Python 版 validate-dr の TypeScript 移植。header/entry の形は
// skills/_lib/harness_hash.ts、skills/dr/scripts/dr_common.ts、skills/dr/scripts/pre-check.ts
// が既に使っているものと同じ: 素直な shebang + reference-types + Usage ヘッダー、テストが
// 直接動かせる部分は named export にし、CLI 自身の process.exit(main()) は
// workflows/_lib/entry-point.ts の isMainModule でガードする。これにより、この module を
// export 目当てで import しても CLI が副作用として動くことはない。
//
// Contract: 退役した Python 版 validate-dr の REQUIRED_SECTIONS、RECOMMENDED_SECTIONS、
// STATUS_VALUES、count_options、lint_check、main。REQUIRED_SECTIONS/RECOMMENDED_SECTIONS/
// STATUS_VALUES は skills/dr/tests/script-contract.test.js が import する。
// skills/dr/tests/validate-dr.test.ts が検証する。
import { accessSync, constants, existsSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";
import { spawnSync } from "node:child_process";
import { fail, splitFrontmatter } from "./dr_common.ts";
import { isMainModule } from "../../../workflows/_lib/entry-point.ts";

// Confirmation is an h3 under Decision Outcome; the others are h2. Section detection allows
// either level so a valid h3 Confirmation is not flagged missing.
export const REQUIRED_SECTIONS = [
  "Context and Problem Statement",
  "Considered Options",
  "Decision Outcome",
  "Confirmation",
] as const;

// A remove-or-merge proposal reads this section to judge, so a DR without it leaves that
// judgment nothing to read. madr-format files it as recommended, so this warns rather than
// errors.
export const RECOMMENDED_SECTIONS = ["Reassessment Triggers"] as const;

// update-index.ts buckets By Status with status.startsWith(), so a value outside the lifecycle
// lands in no section and drops out of the index. The drop is invisible, so this errors.
// Anchored ^(?:...)$ the same way the retired Python validate-dr's re.compile(...).fullmatch()
// requires the whole value to match, not merely contain, one of the alternatives.
export const STATUS_VALUES: RegExp =
  /^(?:proposed|accepted|rejected|deprecated|superseded by DR-\d{4})$/;

/** 退役した Python 版 validate-dr の count_options: Considered Options 見出しの直下にある
 * bullet または番号付き項目。同じ深さ以下の見出しが来たらそこで数え終える。より深い見出
 * しは Considered Options の subsection なので、その中の bullet も引き続き数える。 */
export function countOptions(lines: readonly string[]): number {
  let depth = 0;
  let count = 0;
  for (const line of lines) {
    // h2 だけにマッチさせると、section check が存在すると見なす見出しに対して 0 個と報告
    // してしまう。
    const opening = /^(#{2,3}) Considered Options\s*$/.exec(line);
    if (opening) {
      depth = opening[1].length;
      continue;
    }
    if (!depth) continue;
    const heading = /^(#+) /.exec(line);
    if (heading && heading[1].length <= depth) break;
    if (/^\s*([-*]|\d+\.)\s/.test(line)) count += 1;
  }
  return count;
}

/** shutil.which("markdownlint-cli2"): PATH 上のあるディレクトリがその名前の実行可能ファイルを
 * 持つとき true -- PATH の各エントリごとにサブプロセスを起動するのではなく、accessSync の
 * X_OK で確認する。 */
function which(command: string): boolean {
  const dirs = (process.env.PATH ?? "").split(":").filter((dir) => dir !== "");
  for (const dir of dirs) {
    try {
      accessSync(join(dir, command), constants.X_OK);
      return true;
    } catch {
      // このディレクトリには無い -- 次を探す
    }
  }
  return false;
}

/** 退役した Python 版 validate-dr の lint_check: markdownlint-cli2 が PATH 上に
 * インストールされていれば、そこから ('checks' | 'warnings', message) を返す。
 * 無ければ何も実行せず skip したという message を返す。 */
export function lintCheck(path: string): ["checks" | "warnings", string] {
  if (!which("markdownlint-cli2")) {
    return ["checks", "markdown_lint=skipped (markdownlint-cli2 not installed)"];
  }
  const config = [process.env.MARKDOWNLINT_CONFIG, ".markdownlint.json"].find(
    (candidate) => candidate && existsSync(candidate),
  );
  const args = [...(config ? ["--config", config] : []), path];
  const result = spawnSync("markdownlint-cli2", args, { encoding: "utf8" });
  if (result.status === 0) {
    return ["checks", "markdown_lint=ok"];
  }
  return ["warnings", "markdown_lint=issues (run markdownlint-cli2 for details)"];
}

/** 退役した Python 版 validate-dr の main: argv[0] を dr-file の path として読み、検証結果
 * の JSON (indent 2) を出力する。exit 1 になるのは results.errors が空でないときだけ。 */
export function main(argv: string[]): number {
  const drFile = argv[0] ?? "";
  if (!drFile || !existsSync(drFile)) {
    fail(`Error: file not found: ${drFile}`);
  }

  const text = readFileSync(drFile, "utf8");
  const lines = text.split("\n");
  const results: { errors: string[]; warnings: string[]; checks: string[] } = {
    errors: [],
    warnings: [],
    checks: [],
  };

  for (const section of [...REQUIRED_SECTIONS, ...RECOMMENDED_SECTIONS]) {
    const escaped = section.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const found = new RegExp(`^#{2,3} ${escaped}\\s*$`, "m").test(text);
    if (found) {
      results.checks.push(`section:${section}=ok`);
    } else if ((REQUIRED_SECTIONS as readonly string[]).includes(section)) {
      results.errors.push(`missing_section:${section}`);
    } else {
      results.warnings.push(`missing_section:${section} (recommended)`);
    }
  }

  // MADR v4 frontmatter: status and date are optional but recommended
  const [frontmatter] = splitFrontmatter(text);
  if (frontmatter.length > 0) {
    results.checks.push("frontmatter=present");
    for (const meta of ["status", "date"]) {
      const raw = frontmatter.find((line) => line.startsWith(`${meta}:`));
      if (raw !== undefined) {
        results.checks.push(`metadata:${meta}=ok [${raw}]`);
        const value = raw.split(":").slice(1).join(":").trim().replace(/^"|"$/g, "");
        if (meta === "status" && !STATUS_VALUES.test(value)) {
          results.errors.push(`invalid_status:${value}`);
        }
      } else {
        results.warnings.push(`missing_metadata:${meta} (recommended in MADR v4 frontmatter)`);
      }
    }
  } else {
    results.warnings.push(
      "missing_frontmatter (MADR v4 supports optional YAML frontmatter" +
        " for status/date/decision-makers)",
    );
  }

  const optionsCount = countOptions(lines);
  if (optionsCount >= 2) {
    results.checks.push(`options_count=${optionsCount}`);
  } else if (optionsCount === 1) {
    results.warnings.push("options_count=1 (recommended: 2+)");
  } else {
    results.errors.push("options_count=0");
  }

  if (lines.some((line) => line.startsWith("# "))) {
    results.checks.push("title_heading=ok");
  } else {
    results.errors.push("title_heading=missing");
  }

  const [kind, message] = lintCheck(drFile);
  results[kind].push(message);

  process.stdout.write(`${JSON.stringify({ file: basename(drFile), ...results }, null, 2)}\n`);
  return results.errors.length > 0 ? 1 : 0;
}

if (isMainModule(import.meta.url)) {
  process.exit(main(process.argv.slice(2)));
}
