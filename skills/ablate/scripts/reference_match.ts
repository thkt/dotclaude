/// <reference types="node" />
// Judges whether a reviewer's finding hits one planted defect: the match step
// reference_observation.ts (#743's U-004) folds into an arm's per-run outcome, alongside
// exposure.ts's exposed/contaminated read of the same run's transcript.
//
// agents/_lib/finding-schema.md's Base Fields are the finding shape this module reads: a JSON
// finding under a schema-passing caller (workflows/audit.js's findingsSchema) carries no
// `prefix` field -- the `### {PREFIX}-{seq}` heading only exists in the skill route's Markdown
// output -- `line` is a free-form string rather than a fixed format, and the
// Duplicate-Location Rule folds a repeated position into `evidence` instead of repeating the
// finding. So a hit is judged by `file` equality plus a line-range overlap found in either
// `line` or `evidence`, and `prefix` is never read.
//
// Constant and function names stay snake_case, the convention arms.ts, verdict.ts,
// reference_arm.ts and exposure.ts hold in this same directory.

// The Base Fields this module reads off a finding. severity and summary are required by
// finding-schema.md but carry no line-location information, so this type omits them along
// with every other Base Field the matching step does not read.
export interface Finding {
  file: string;
  line: string;
  evidence?: string;
}

// One defect planted into a reference-arm fixture's corpus file, at a known line range
// (inclusive on both ends).
export interface PlantedDefect {
  file: string;
  line_start: number;
  line_end: number;
}

/** One inclusive line range a location string names, `start === end` for a single line. */
interface LineRange {
  start: number;
  end: number;
}

/** Parses one location token, such as `"45-55"` or `"45"`, into an inclusive range. `null`
 * when the token names no digits at all. Each regex here is fully anchored with at most one
 * quantifier group, never a quantifier nested inside another, so parsing a token stays linear
 * in its length regardless of what the token holds. */
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

/** Every location `finding.line` names, comma-separated per finding-schema.md's Base Fields
 * ("the line part of the location, as a string"). No keyword is required: `line` is dedicated
 * to positions, so every comma-separated token in it is read as one. */
function line_field_ranges(line: string): LineRange[] {
  return line
    .split(",")
    .map((token) => parse_range_token(token.trim()))
    .filter((range): range is LineRange => range !== null);
}

/** Every location named inside `evidence` immediately after the word "line" or "lines", such
 * as "Line 44" or "lines 46-48". Evidence is free prose that can carry unrelated numbers (a
 * threshold, a count), so a location is only read where that keyword names it, unlike
 * `finding.line`, which is dedicated to positions. */
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

/** Whether inclusive range `a` shares at least one line with `[defect.line_start,
 * defect.line_end]`. */
function overlaps_defect(a: LineRange, defect: PlantedDefect): boolean {
  return a.start <= defect.line_end && defect.line_start <= a.end;
}

/** Whether `finding` hits `defect`: `finding.file` names the same file `defect.file` does, and
 * at least one location `finding.line` or `finding.evidence` names falls inside
 * `[defect.line_start, defect.line_end]`. Never reads a `prefix` field -- finding-schema.md's
 * Base Fields give file/line/evidence for a location, not a prefix, and the skill route's
 * `### {PREFIX}-{seq}` heading is a Markdown-only presentation this module's caller never
 * produces. */
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
