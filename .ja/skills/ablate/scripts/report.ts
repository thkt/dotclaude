/// <reference types="node" />
// skills/ablate/scripts/report.py の TypeScript 側。build_report、write_report、そして
// write_report が駆動する render pass (report.py の _render/_table/_date_range)、加えて
// build_report が呼ぶ集計 (arms.ts, dr_gate.ts, enforcer_map.ts, usage_counts.ts, verdict.ts,
// ../../_lib/harness_elements.ts) を写す。report.py は #646 が Python 側を退役させるまで、
// report.ts のcontract sourceとして木に残る -- arms.ts のヘッダが述べているのと同じ形。
// report.py の docstring はすでにこの module が「Not a CLI entry point」だと述べているため、
// report.ts も arms.ts / dr_gate.ts / verdict.ts と同じく shebang と main() を持たない。
//
// report.py からの逸脱: report.py は build_report の内部で module-level の TRANSCRIPTS_ROOT
// 定数 (Path.home() / ".claude" / "projects") を読む。ESM の import binding は
// unittest.mock.patch.object が Python の module attribute を re-bind するのと同じ形では
// test file から re-bind できない -- usage_counts.ts の window_days の逸脱ノートと同じ壁に
// 当たる。そのためこの port は TRANSCRIPTS_ROOT を build_report 自身の `transcripts_root`
// parameter (同名の module 定数を default 値とする) として通す: caller はそれを binding へ
// patch するのではなく、別の値を渡すことで駆動する。
//
// 定数名と関数名は report.py が宣言したとおりに保つ。arms.ts、verdict.ts、dr_gate.ts、
// enforcer_map.ts、usage_counts.ts がこの同じ directory で持つ no-camelCase 規約と同じ形。
import { mkdirSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import * as arms from "./arms.ts";
import * as dr_gate from "./dr_gate.ts";
import * as enforcer_map from "./enforcer_map.ts";
import type { EnforcerMapEntry } from "./enforcer_map.ts";
import { enumerate_elements } from "../../_lib/harness_elements.ts";
import type { HarnessElement } from "../../_lib/harness_elements.ts";
import * as usage_counts from "./usage_counts.ts";
import type { ElementUsage } from "./usage_counts.ts";
import * as verdict from "./verdict.ts";

// ここに一度だけ持ち、override しない caller は全員この値を読む -- report.py 自身の
// TRANSCRIPTS_ROOT comment と同じ理由。
export const TRANSCRIPTS_ROOT: string = join(homedir(), ".claude", "projects");

// ablation apparatus 自身の script tree。この下の path は観測対象の harness element ではなく
// 観測を生成した側のコードなので、delete_candidates に決して現れてはならない -- harness
// element を測定する apparatus 自体を削除すると、測定を続ける手段が失われる。report.py の
// APPARATUS_DIR をそのまま写す。
const APPARATUS_DIR = "skills/ablate/";

/** build_report が読む `observations` list の1件: report.py の build_report と
 * verdict.py の classify に渡る、1つの harness element の trigger task / task set 所属 /
 * compliance を持つ caller 提供の record。 */
export interface Observation {
  path: string;
  trigger_task?: string | null;
  task_set?: readonly string[] | null;
  complies?: boolean | null;
}

export interface TranscriptRange {
  count: number;
  date_range: { start: string | null; end: string | null };
}

export interface ReportResult {
  elements: HarnessElement[];
  arms: string[];
  verdicts: Record<string, string>;
  usage_verdicts: Record<string, string>;
  delete_candidates: string[];
  usage: Record<string, ElementUsage>;
  transcripts: TranscriptRange;
  enforcer_rows: EnforcerMapEntry[];
}

/** `path` が APPARATUS_DIR の下にあるとき true (ablate skill 自身の tree。
 * harness_elements.POPULATION_GLOBS の "skills/**\/scripts/*.py" と、
 * skills/ablate/scripts/report.ts 自身が一致させているのと同じ形)。report.py の
 * _is_apparatus を写す。この module が受け取る path はすでに globSync が返す posix-relative
 * な形なので、この側では PurePosixPath の正規化は不要。 */
function _is_apparatus(path: string): boolean {
  return path.startsWith(APPARATUS_DIR);
}

/** 1つの path の usage verdict。report.py の _usage_verdict を写す。transcript entry を
 * 持たない element は一度も fire していないので、skip されるのではなく fires 0 として
 * classify に渡る。 */
function _usage_verdict(
  path: string,
  usage_elements: Record<string, ElementUsage>,
  now: Date,
): string {
  const entry = usage_elements[path];
  return usage_counts.classify(path, entry?.fires ?? 0, entry?.last_used ?? null, now);
}

/** 先行する各 unit の script を順に呼び、その出力を配線する -- report.py の build_report を
 * 写す。`transcripts_root` は report.py の module-namespace 経由の TRANSCRIPTS_ROOT 読み取り
 * を置き換える -- 上のヘッダの逸脱ノートを参照。
 *
 * dr_gate.gate は verdict.classify の one-sided な判定の後、結果が返る dict に届く前に
 * 走るので、held な候補は以下の delete_candidates に決して入らない。
 *
 * usage_counts は `observations` ではなく `transcripts_root` を読むので、読み手は ablation
 * arm を走らせなくても report から usage を知ることができる。 */
export function build_report(
  root: string,
  observations: readonly Observation[],
  transcripts_root: string = TRANSCRIPTS_ROOT,
  now: Date = new Date(),
): ReportResult {
  const elements = enumerate_elements(root);
  const usage = usage_counts.count_usage(transcripts_root);

  const verdicts: Record<string, string> = {};
  for (const observation of observations) {
    const path = observation.path;
    const task_set = observation.task_set != null ? new Set(observation.task_set) : null;
    const raw_verdict = verdict.classify(
      observation.trigger_task ?? null,
      task_set,
      observation.complies ?? null,
    );
    verdicts[path] = dr_gate.gate(path, raw_verdict, root);
  }

  const usagePaths = new Set<string>([...elements.map((element) => element.path), ...Object.keys(verdicts)]);
  const usage_verdicts: Record<string, string> = {};
  for (const path of usagePaths) {
    usage_verdicts[path] = _usage_verdict(path, usage.elements, now);
  }

  const delete_candidates = Object.keys(verdicts)
    .filter(
      (path) =>
        verdicts[path] === verdict.DELETE_CANDIDATE &&
        usage_verdicts[path] === verdict.DELETE_CANDIDATE &&
        !_is_apparatus(path),
    )
    .sort();

  return {
    elements,
    arms: [...arms.ARMS],
    verdicts,
    usage_verdicts,
    delete_candidates,
    usage: usage.elements,
    transcripts: { count: usage.transcript_count, date_range: usage.date_range },
    enforcer_rows: enforcer_map.map_all(root),
  };
}

// report.py は書き出す file 名を、UTC timestamp の後にこの定数を付けて決める
// (REPORT_NAME = "ablate")。そのまま写す。
const REPORT_NAME = "ablate";

/** Markdown table の header + separator + data 行。_render がセクションごとに形の異なる
 * input から table を組み立てるので、ここに factor out してある -- 行の join rule を1箇所
 * 変えれば全セクションに効く。列数は `headers` から決まるので、2列の caller も、より広い
 * caller も同じ描画を共有する。report.py の _table を写す。 */
function _table(headers: readonly string[], rows: readonly (readonly string[])[]): string[] {
  const lines = [`| ${headers.join(" | ")} |`, `| ${headers.map(() => "---").join(" | ")} |`];
  lines.push(...rows.map((row) => `| ${row.join(" | ")} |`));
  return lines;
}

/** parse 済み transcripts の日付範囲を1セルにしたもの。fire を1件も持たない run には
 * span がないので、空セル2つではなく "none" として描画する。report.py の _date_range を
 * 写す。 */
function _date_range(date_range: { start: string | null; end: string | null }): string {
  const { start, end } = date_range;
  return start && end ? `${start} - ${end}` : "none";
}

/** build_report の結果を Markdown として描画する。caller が渡した生の `observations` は
 * 一切読まず、この結果だけを読む -- そのため observation が自分の provenance のために
 * 持つ field (走らせた run の settings snapshot など) は、そのままの形であれ他の形であれ、
 * 書き出される report に届くことは決してない (T-014)。report.py の _render を写す。以下の
 * section 順は skills/ablate/templates/report-template.md の skeleton が名指す contract で
 * あり、report-render.test.ts の T-476 がその file を読んで突き合わせるので、この順序は
 * template を同じ change で更新せずに drift させてはならない。 */
function _render(result: ReportResult): string {
  const lines: string[] = ["# Ablation Report", ""];

  lines.push("## Summary", "");
  lines.push(
    ..._table(
      ["Metric", "Value"],
      [
        ["Harness elements enumerated", String(result.elements.length)],
        ["Arms", String(result.arms.length)],
        ["Elements observed", String(Object.keys(result.verdicts).length)],
        ["Delete candidates", String(result.delete_candidates.length)],
        ["Always-loaded lines mapped", String(result.enforcer_rows.length)],
        // 別枠で数える。この行がなければ、その数は Verdicts table を held の literal で
        // scan することでしか得られない。
        [
          "Held by a live DR",
          String(Object.values(result.verdicts).filter((v) => v === dr_gate.HELD).length),
        ],
        ["Transcripts parsed", String(result.transcripts.count)],
        ["Transcript date range", _date_range(result.transcripts.date_range)],
      ],
    ),
  );
  lines.push("");

  lines.push("## Always-Loaded Elements", "");
  lines.push(
    ..._table(
      ["File", "Line", "Verdict", "Enforcer"],
      result.enforcer_rows.map((row) => [
        row.file,
        String(row.line_number),
        row.verdict,
        row.enforcer ?? "",
      ]),
    ),
  );
  lines.push("");

  lines.push("## Harness Elements", "");
  lines.push(
    ..._table(
      ["Path", "Classification", "Fires", "Last Used", "Usage Verdict"],
      result.elements.map((element) => {
        const element_usage = result.usage[element.path] ?? { fires: 0, last_used: null };
        return [
          element.path,
          element.classification,
          String(element_usage.fires ?? 0),
          element_usage.last_used ?? "never",
          result.usage_verdicts[element.path],
        ];
      }),
    ),
  );
  lines.push("");

  lines.push("## Arms", "");
  lines.push(...result.arms.map((arm) => `- ${arm}`));
  lines.push("");

  lines.push("## Verdicts", "");
  lines.push(
    ..._table(
      ["Path", "Verdict"],
      Object.keys(result.verdicts)
        .sort()
        .map((path) => [path, result.verdicts[path]]),
    ),
  );
  lines.push("");

  lines.push("## Delete Candidates", "");
  lines.push(
    result.delete_candidates.length > 0
      ? result.delete_candidates.map((path) => `- ${path}`).join("\n")
      : "No delete candidates.",
  );
  lines.push("");

  return lines.join("\n");
}

/** build_report の結果を `out_dir` (default は `<root>/docs/audit`) の下、UTC の
 * `<YYYY-MM-DD>-<HHMMSS>-ablate.md` として書き出す (この module の convention。
 * skills/census/SKILL.md Phase 5 の `date -u +%Y-%m-%d-%H%M%S` naming と揃えてあり、
 * 別々の timezone から同日中に rerun しても衝突しない)。report.py の write_report と、
 * それが呼ぶ `_render` Markdown pass を写す。 */
export function write_report(
  root: string,
  observations: readonly Observation[],
  out_dir?: string,
): string {
  const result = build_report(root, observations);
  const content = _render(result);

  const target_dir = out_dir ?? join(root, "docs", "audit");
  mkdirSync(target_dir, { recursive: true });

  const now = new Date();
  const pad2 = (value: number) => String(value).padStart(2, "0");
  // Python の `datetime.now(timezone.utc).strftime("%Y-%m-%d-%H%M%S")`。host の local
  // timezone に関わらず形が保たれるよう、UTC の getter から組み立てる。
  const timestamp = [
    now.getUTCFullYear(),
    pad2(now.getUTCMonth() + 1),
    pad2(now.getUTCDate()),
    `${pad2(now.getUTCHours())}${pad2(now.getUTCMinutes())}${pad2(now.getUTCSeconds())}`,
  ].join("-");
  const report_path = join(target_dir, `${timestamp}-${REPORT_NAME}.md`);
  writeFileSync(report_path, content, "utf8");
  return report_path;
}
