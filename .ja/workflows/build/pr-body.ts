#!/usr/bin/env node
/// <reference types="node" />
// Usage: pr-body.ts   (ship payload JSON を stdin で受ける)
//
// build.js が既に保持している構造化データから、build workflow の draft-PR fact tail を
// 決定的に描画する。PR body は fail-closed な面であり、verify 結果を常に載せる。重い担保
// (/audit、/polish review) は人間が起動する。tail が載せるのはその担保の範囲までで、
// build が深いレビューを含まないことを tail_header が言う。読むのは build を起動した本人
// なので、要るのは起動方法でなく範囲。agent は先頭の "## Summary" (人間レビュアーの入口)
// だけを書き、この tail をその下に append する。
//
// フォーマットは意図的に簡潔で markdown 構造。自動生成ブロックを示す 1 行ラベル、Closes
// 行、そして status 行を <summary> に持つ折りたたみ <details> (markdown は <summary> 内で
// 描画されないため HTML <code>)。
//
// 畳むのは、PR body の入口が著者の書いた "## Summary" であり、機械生成の記録がその入口を
// 押し潰さないため。畳んだまま見える 3 つ (自動生成ラベル、Closes 行、status 行) は「開く
// 必要があるか」を判断するためだけに置くので、safety-critical な事実と非ゼロの逸脱件数は
// status 行に載せる。
//
// 失敗ログ (入れ子の <details>) と情報的なリスト (scope deviations、missing test
// statements、anomalies) は非空のときだけ出すので、clean run ではセクションごとに「None」
// を繰り返さず短いままになる。<details> を作るのは畳む対象がある run だけで、出すものが
// 1 つも無い run は status 行だけを置く。conformance / structure の finding は severity +
// category を inline code の見出しに置き、location と出典行を継続行へ送る。1 行に詰めると
// severity が埋もれ、どこまでが指摘でどこからが根拠か読み取れなくなる。anomaly は結論を
// 親行に置き、逐語のコマンド出力である根拠を入れ子の <details> へ畳む。
// 太字はセクションラベル専用に残すことで、セクションと finding の階層が視覚的に 1 段付く。
//
// 2 方向に fail-closed。parse できない payload、または safety-critical key (tests_pass /
// gates_pass) を欠く payload は、それらしい「clean」body を出さず stdout 空で exit 1 する。
// 欠けた key は (呼び出し側の `&&` チェーンが PR を中止することで) 表面化させ、安心させる
// 値に default しない。
//
// stdin:  JSON {issue, scope_deviations[], untouched_plan_files[], missing_tests[],
//               code_anomalies[], tests_pass, gates_pass, verify_output, conformance[],
//               structure[]}
// stdout: markdown の fact tail。先頭は空行 + 水平線。
// exit 0 は完了時。exit 1 は parse error または必須 key の欠落時。
//
// 置き換え元の Python 版 build workflow PR-body tail renderer の TypeScript 移植。
// Contract: この CLI 自身の挙動。
// workflows/build/tests/pr-body.test.ts が、固定 fixture
// workflows/build/tests/fixtures/pr-body-cases.json に対してエンドツーエンドで検査する。
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { isMainModule } from "../_lib/entry-point.ts";

export const REQUIRED_KEYS = ["tests_pass", "gates_pass"] as const;

// 走らなかったチェックと、何も見つからなかったチェックはどちらも 0 件になるので、両者を
// 分けるのは status 行だけになる。
export const NOT_RUN = ["agent-failed", "no-spec"] as const;

// 翻訳するのは prose のラベルのみ。GitHub のキーワード `Closes`、code-fence の status 行、
// `/issue` のようなコマンド名は auto-close と copy-paste が動くよう verbatim のまま残す。
export const LABELS: Record<string, Record<string, string>> = {
  english: {
    tail_header:
      "_Below is the build workflow's automated verification. It checks the diff against the plan and does not hunt for code defects. It sits off the PR's main thread, so reading it is optional. Open it when a deviation count in the status line is non-zero._",
    not_run: "not run",
    verify_output: "verify output",
    evidence: "{n} evidence lines",
    manual_checks: "Manual verification checklist (complete before merge)",
    scope_deviations: "Files outside the plan's scope",
    untouched_plan_files: "Planned files never changed",
    missing_tests: "Planned test statements not found",
    conformance: "Issue conformance (review independently)",
    structure: "Structural deviations from the reference module",
    anomalies: "Anomalies (Red unconfirmed)",
  },
  japanese: {
    tail_header:
      "_下は build workflow の自動検証結果。plan との突合までで、コードの欠陥を探すレビューはしていない。PR の本筋からは外れるので任意だが、status 行の逸脱件数が非ゼロなら見る。_",
    not_run: "未実行",
    verify_output: "verify 出力",
    evidence: "根拠 {n} 件",
    manual_checks: "実機確認 (merge 前に実施)",
    scope_deviations: "Plan スコープ外の変更ファイル",
    untouched_plan_files: "一度も変更されていない plan の files",
    missing_tests: "テストとして見つからない plan の言明",
    conformance: "Issue 適合性 (独立レビュー)",
    structure: "参照モジュールからの構造逸脱",
    anomalies: "異常 (Red 未確認)",
  },
};

// 同じ綴りの _tag が severity を読む。ランク付けするのは conformance だけで、structure は
// payload が渡した順のまま描画する。
export const SEVERITY_RANK: Record<string, number> = { high: 0, medium: 1, low: 2 };

// "<tag>" というテキストを補間内容の隣にインラインで書く代わりの、小さな templating
// helper。要素名は常にパラメータであり、山括弧の隣にリテラルで置かない。そうすることで、
// finding の自由記述 (detail、notes、verify_output) を手書きの HTML 連結箇所と取り違える
// ことがなくなる。
function openTag(name: string): string {
  return `<${name}>`;
}
function closeTag(name: string): string {
  return `</${name}>`;
}
function tagWrap(name: string, content: string): string {
  return `${openTag(name)}${content}${closeTag(name)}`;
}
function code(text: string): string {
  return tagWrap("code", text);
}
function summaryTag(text: string): string {
  return tagWrap("summary", text);
}
function detailsWrap(content: string): string {
  return tagWrap("details", content);
}

/** `value` が plain object かどうか。`typeof value === "object"` だけでは配列や null も
 * 通ってしまうので、それらを除く。 */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** `value` を文字列キーの record として読む。plain object でない値は空にする (Python 版
 * renderer の `_mapping` を写す。list もスカラーも同じくキー無しとして扱う)。 */
function asMapping(value: unknown): Record<string, unknown> {
  return isPlainObject(value) ? value : {};
}

/** `value` を配列として読む。配列でない値は空にする (`_list` を写す)。 */
function asList(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

/** payload が型無しのフィールド (missing_tests の要素、manual_checks の要素、
 * finding/anomaly の自由記述フィールド、非 mapping な conformance/structure 要素の
 * degrade 経路) を通して運んでくる JSON scalar 種別に対する Python の str()。null と
 * 2 つの boolean は、JS の String() のデフォルト変換と異なる文字列になる。 */
function pyStr(value: unknown): string {
  if (value === null || value === undefined) return "None";
  if (value === true) return "True";
  if (value === false) return "False";
  return String(value);
}

/** renderer が引き継ぐ少数の "if x:" ガード向けの、Python の truthiness。
 * null/undefined/false/0/""/空配列/空 object は falsy、それ以外は truthy。 */
function truthy(value: unknown): boolean {
  if (value === null || value === undefined || value === false || value === 0 || value === "") {
    return false;
  }
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") return Object.keys(value as object).length > 0;
  return true;
}

/** SEVERITY_RANK に無い severity (欠落、または未知の綴り) は最下位に並ぶ。 */
function severityRank(f: unknown): number {
  const severity = asMapping(f).severity;
  const rank = typeof severity === "string" ? SEVERITY_RANK[severity] : undefined;
  return rank ?? Object.keys(SEVERITY_RANK).length;
}

/** severity があれば、high と些細な finding が一目で分かれる。 */
function tag(d: Record<string, unknown>): string {
  const severity = d.severity;
  const category = "category" in d ? d.category : "?";
  return truthy(severity) ? `[${pyStr(severity)}] ${pyStr(category)}` : `[${pyStr(category)}]`;
}

/** 必ず backtick か語で始まるので、インデントされた継続行が heading に昇格することは
 * ない。`label` は spec_line / reference のフィールド名に由来する識別子なので、LABELS
 * には合流させず英語のまま残す。 */
function evidence(location: unknown, label: string, value: unknown): string {
  const parts: string[] = [];
  if (truthy(location)) parts.push(`\`${pyStr(location)}\``);
  if (truthy(value)) parts.push(`${label}: ${pyStr(value)}`);
  return parts.join(" · ");
}

/** 内容自体が ``` を含んでいても、code block が途中で終わらないようにする。 */
function fence(text: string): string {
  let longest = 0;
  let current = 0;
  for (const ch of text) {
    current = ch === "`" ? current + 1 : 0;
    longest = Math.max(longest, current);
  }
  return "`".repeat(Math.max(3, longest + 1));
}

/** `value` を plain-object record として読むか、`what` を添えて送出する。finding/anomaly
 * のガードが共有する、非 mapping を section の degrade 経路へ回すための同一チェック。 */
function asRecordOrThrow(value: unknown, what: string): Record<string, unknown> {
  if (!isPlainObject(value)) throw new TypeError(`${what} is not a mapping`);
  return value;
}

/** 非 mapping では送出し、section の degrade 経路へ回して raw string に落とさせる。 */
function finding(f: unknown, label: string, sourceKey: string): string[] {
  const d = asRecordOrThrow(f, "finding");
  const detail = "detail" in d ? d.detail : "";
  return [`\`${tag(d)}\` ${pyStr(detail)}`.trimEnd(), evidence(d.location, label, d[sourceKey])];
}

/** 非 mapping では送出し、section の degrade 経路へ回して raw string に落とさせる。 */
function anomaly(a: unknown): string[] {
  const d = asRecordOrThrow(a, "anomaly");
  const unit = "unit" in d ? d.unit : "?";
  const kind = "kind" in d ? d.kind : "?";
  const notes = "notes" in d ? d.notes : "";
  const head = `${pyStr(unit)} (${pyStr(kind)}): ${pyStr(notes)}`.trimEnd();
  return [head, ...asList(d.evidence).map(pyStr)];
}

/** `payload` の markdown fact tail を描画する。 */
export function render(payload: Record<string, unknown>): string {
  const issue = pyStr("issue" in payload ? payload.issue : "").trim();
  const tests = truthy(payload.tests_pass) ? "pass" : "FAIL";
  const gates = truthy(payload.gates_pass) ? "pass" : "FAIL";
  const scope = asList(payload.scope_deviations);
  const untouched = asList(payload.untouched_plan_files);
  const missing = asList(payload.missing_tests);
  // .sort() の安定性 (ES2019+) により、同 severity 内では payload の順が保たれる。
  // structure はここでは並べ替えない (対象は conformance のみ)。
  const conformance = [...asList(payload.conformance)].sort(
    (a, b) => severityRank(a) - severityRank(b),
  );
  const structure = asList(payload.structure);
  const rawLang = payload.language;
  const lang = typeof rawLang === "string" && rawLang ? rawLang.toLowerCase() : "english";
  const L = LABELS[lang] ?? LABELS.english;

  const out: string[] = [L.tail_header, issue ? `Closes #${issue}` : "Closes #"];

  // チェックが走ったときは件数、走らなかったときは "not run"、出すものが無いときは ""。
  // status キーを持たない payload はそれ以前の呼び出し元から来たものなので、その件数は
  // そのまま信じる。
  function cell(label: string, key: string, count: number, always: boolean, suffix = ""): string {
    const status = payload[`${key}_status`];
    if (typeof status === "string" && (NOT_RUN as readonly string[]).includes(status)) {
      return code(`${label} ${L.not_run}`);
    }
    return always || count ? code(`${label} ${count}${suffix}`) : "";
  }

  const high = conformance.filter((f) => asMapping(f).severity === "high").length;
  const cells = [
    code(`verify tests=${tests} gates=${gates}`),
    cell("scope-deviations", "scope", scope.length, true),
    cell("missing-tests", "test_presence", missing.length, true),
  ];
  // summary に無い件数は畳まれたまま気づかれないので、開くかどうかの判断が拠る非ゼロの
  // 件数はすべてここに出す。high の内訳をここに出すのは、件数だけだと表記上の指摘と、
  // 満たせなかった受け入れ条件が同じ 1 件に見えてしまうため。
  if (untouched.length > 0) {
    cells.push(code(`untouched-plan-files ${untouched.length}`));
  }
  cells.push(
    cell("conformance", "conformance", conformance.length, false, high ? ` (${high} high)` : ""),
  );
  cells.push(cell("structure", "structure", structure.length, false));
  const summary = cells.filter((c) => c).join(" · ");
  const folded: string[] = [];

  if (tests === "FAIL" || gates === "FAIL") {
    const detail = payload.verify_output;
    if (truthy(detail)) {
      const body = typeof detail === "string" ? detail : JSON.stringify(detail, null, 2);
      const f = fence(body);
      folded.push(detailsWrap(`${summaryTag(L.verify_output)}\n\n${f}\n${body}\n${f}\n\n`));
    }
  }

  function section(
    label: string,
    items: unknown,
    renderItem: (x: unknown) => string | string[],
    fold?: string,
  ): void {
    const list = asList(items);
    if (list.length === 0) return;
    const lines: string[] = [];
    for (const x of list) {
      let text: string | string[];
      try {
        text = renderItem(x);
      } catch {
        // malformed (例: non-object) な item が render を crash させて、fail-closed な
        // tail 全体を落としてはならない。
        text = pyStr(x);
      }
      const rawParts = Array.isArray(text) ? text : [text];
      const parts = rawParts.map((p) => pyStr(p).split("\n").join(" ")).filter((p) => p.trim());
      if (parts.length === 0) continue;
      lines.push(`- ${parts[0]}`);
      if (fold && parts.length > 1) {
        // インデント 2 が list item の内側に収め、<details> 前後の空行が GitHub にその
        // 中の markdown を描画させる。
        const foldLabel = fold.replace("{n}", String(parts.length - 1));
        lines.push(`  ${openTag("details")}${summaryTag(foldLabel)}`);
        lines.push("");
        lines.push(...parts.slice(1).map((p) => `  - ${p}`));
        lines.push("");
        lines.push(`  ${closeTag("details")}`);
      } else {
        lines.push(...parts.slice(1).map((p) => `  ${p}`));
      }
    }
    folded.push(`**${label}**\n${lines.join("\n")}`);
  }

  // レビュアーが PR 上でチェックを付けられるよう、task-list item として描画する。
  section(L.manual_checks, payload.manual_checks, (s) => `[ ] ${pyStr(s)}`);
  section(L.scope_deviations, scope, (f) => `\`${pyStr(f)}\``);
  // scope_deviations の逆向き。plan が名指ししたのに何も触っていないファイルは、unit が
  // 丸ごと実装されないまま通った跡でありうる。
  section(L.untouched_plan_files, untouched, (f) => `\`${pyStr(f)}\``);
  section(L.missing_tests, missing, pyStr);
  section(L.conformance, conformance, (f) => finding(f, "spec", "spec_line"));
  section(L.structure, structure, (f) => finding(f, "ref", "reference"));
  // evidence は逐語のコマンド出力であり、その行数が結論を埋もれさせるが、逐語であること
  // こそが証跡としての価値なので、短くできるのは renderer だけ。
  section(L.anomalies, payload.code_anomalies, anomaly, L.evidence);

  // 折りたたんだ内容の前後の空行が、GitHub に HTML の <details> ブロック内の markdown を
  // 描画させる。空の <details> は、レビュアーに開いても何も無いものを開かせることになる。
  out.push(
    folded.length > 0
      ? detailsWrap(`\n${summaryTag(summary)}\n\n${folded.join("\n\n")}\n\n`)
      : summary,
  );

  // 空行 + 水平線が、agent の Summary の下に append (>>) したときこの machine tail の
  // 分離を保ち、summary の最終行が setext heading になるのを防ぐ。
  return `\n\n---\n\n${out.join("\n\n")}\n`;
}

function fail(message: string): void {
  process.stderr.write(`Error: ${message}\n`);
}

/** 読み込み / parse の失敗はすべて英語に fallback し、tail の描画を止めない。 */
function defaultLanguage(): string {
  let raw: string;
  try {
    raw = readFileSync(join(homedir(), ".claude", "settings.json"), "utf8");
  } catch {
    return "english";
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return "english";
  }
  const language = asMapping(parsed).language;
  return typeof language === "string" && language ? language : "english";
}

/** ship payload を stdin から読み、描画した tail を stdout に書く。読めなければ
 * fail-closed。 */
export function main(): number {
  const raw = readFileSync(0, "utf8");
  let loaded: unknown;
  try {
    loaded = JSON.parse(raw);
  } catch (error) {
    fail(
      `ship payload is not valid JSON: ${error instanceof Error ? error.message : String(error)}`,
    );
    return 1;
  }
  if (!isPlainObject(loaded)) {
    fail("ship payload must be a JSON object");
    return 1;
  }
  const payload = loaded;
  const missingKeys = REQUIRED_KEYS.filter((key) => !(key in payload));
  if (missingKeys.length > 0) {
    fail(`ship payload missing required key(s): ${missingKeys.join(", ")}`);
    return 1;
  }
  if (!("language" in payload)) {
    payload.language = defaultLanguage();
  }
  process.stdout.write(render(payload));
  return 0;
}

if (isMainModule(import.meta.url)) {
  process.exit(main());
}
