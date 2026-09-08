#!/usr/bin/env node
/// <reference types="node" />
// Usage: verify-pr.ts   (PR verification payload JSON を stdin で受ける)
//
// Ship 段が報告した draft pull request が、GitHub 上で宣言どおりの head/base で実在することを
// 検証する。agent の `pr_url` フィールドを信用しない。build.js は Ship agent が返した url を
// そのまま返すが、url 文字列だけでは PR が作られたこと、draft であること、build が切った
// branch を狙っていることの証拠にはならない。
//
// stdin:  JSON {branch, base_branch, repository, cwd, title}
//   repository か cwd のどちらかが必要。gh がどの repository に問い合わせるか決まるため。
//   repository   GitHub repository の "owner/name"。省略すると cwd に選ばせる
//   branch       build が push した head branch
//   base_branch  PR が狙うべき base branch
//   cwd          gh を実行する任意の絶対 directory
//   title        PR が持つべき任意の title。build.js が issue title から決めた文字列。
//                省略すると title は検査されない
//
// stdout: JSON {protocol, verdict, classification, reason_codes, failure_route, blockers,
//   url, is_draft, base_ref_name, head_ref_name, title}
//   verdict は gh が branch に対する PR を返し、かつ以下すべてが一致するときだけ "pass":
//   isDraft が true、baseRefName が base_branch、headRefName が branch、url が空でない
//   文字列、title が渡されていればその文字列と一致。
// exit 0 は完了した run (verdict は JSON から読む)。exit 1 は usage / parse エラー --
// fail-closed: 壊れた payload を検証済み PR として報告することはない。gh の失敗は exit 1
// ではなく fail verdict: run 自体は完了し、答えが「いいえ」なだけ。
//
// 置き換え元の Python 版 PR verifier の TypeScript 移植。Contract: この CLI 自身の挙動。
// workflows/build/tests/verify-pr.test.ts が、固定 fixture
// workflows/build/tests/fixtures/verify-pr-cases.json に対してエンドツーエンドで検査する。
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { isAbsolute } from "node:path";
import { parseJson } from "../_lib/cli.ts";
import { isMainModule } from "../_lib/entry-point.ts";

const PROTOCOL = "claude-build-ship/v1";
const FIELDS = "url,isDraft,baseRefName,headRefName,title";

/** payload の検証失敗。message はそのまま stderr に書く -- prefix なし。Python 版 verifier
 * 自身の `fail()` が message を print するだけなのと同じ。 */
class Invalid extends Error {}

function fail(message: string): never {
  throw new Invalid(message);
}

/** required_string を写す: `payload[key]` を trim したもの、空でない文字列であるとき。
 * それ以外は Python 版の message で fail する。 */
function requiredString(payload: Record<string, unknown>, key: string): string {
  const value = payload[key];
  if (typeof value !== "string" || value.trim() === "") {
    fail(`${key} must be a non-empty string`);
  }
  return (value as string).trim();
}

/** optional_string を写す: 無いか null なら "" と読む。有るなら空でない文字列であること。 */
function optionalString(payload: Record<string, unknown>, key: string): string {
  const value = payload[key];
  if (value === undefined || value === null) return "";
  if (typeof value !== "string" || value.trim() === "") {
    fail(`${key} must be a non-empty string when present`);
  }
  return (value as string).trim();
}

/** gh の view が持ちうる JSON 値の形 (string, bool, null) 一握り分の Python repr() -- blocker
 * message の中でだけ使う。fixture の文言そのまま (`'develop'`、`False`、`None`) を、汎用の
 * repr library を持ち込まずに再現する。 */
function pyRepr(value: unknown): string {
  if (value === null || value === undefined) return "None";
  if (value === true) return "True";
  if (value === false) return "False";
  if (typeof value === "string") {
    if (value.includes("'") && !value.includes('"')) return `"${value}"`;
    return `'${value.replace(/'/g, "\\'")}'`;
  }
  return String(value);
}

interface ViewPrResult {
  code: number;
  view: Record<string, unknown>;
  stderr: string;
}

/** `gh pr view <branch> [--repo <repository>] --json <FIELDS>` を cwd (null なら process の
 * cwd) から spawn する。view_pr を写す: stdout が JSON object として parse できない (空出力、
 * error page) ときは raise せず `{}` と読む。gh の失敗は unhandled parse error ではなく、
 * 欠けた field による blocker として現れる。 */
function viewPr(repository: string, branch: string, cwd: string | null): ViewPrResult {
  const scope = repository ? ["--repo", repository] : [];
  const result = spawnSync("gh", ["pr", "view", branch, ...scope, "--json", FIELDS], {
    encoding: "utf8",
    cwd: cwd ?? undefined,
  });
  let parsed: unknown;
  try {
    parsed = JSON.parse(result.stdout || "{}");
  } catch {
    parsed = {};
  }
  const view =
    typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  return {
    code: result.status === null ? 1 : result.status,
    view,
    stderr: (result.stderr ?? "").trim(),
  };
}

interface VerifyOutput {
  protocol: string;
  verdict: "pass" | "fail";
  classification: string;
  reason_codes: string[];
  failure_route: "blocked" | null;
  blockers: string[];
  url: string | null;
  is_draft: unknown;
  base_ref_name: unknown;
  head_ref_name: unknown;
  title: unknown;
}

/** payload が宣言する draft PR が GitHub 上で宣言どおりの head/base/title で実在することを
 * 検証する。verify() を写す: payload を検証し (required_string/optional_string/cwd の guard
 * が起こしうる 5 つの失敗条件で Invalid を throw)、view_pr で gh に問い合わせ、gh の答えを
 * 0〜5 個の blocker に畳み込む。 */
export function verify(payload: unknown): VerifyOutput {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    fail("payload must be a JSON object");
  }
  const record = payload as Record<string, unknown>;
  const repository = optionalString(record, "repository");
  const branch = requiredString(record, "branch");
  const baseBranch = requiredString(record, "base_branch");
  const cwdRaw = record.cwd;
  if (cwdRaw !== undefined && cwdRaw !== null) {
    if (typeof cwdRaw !== "string" || !isAbsolute(cwdRaw)) {
      fail("cwd must be an absolute path when present");
    }
  }
  if (!repository && typeof cwdRaw !== "string") {
    fail("either repository or cwd is required, so gh knows which repository to ask");
  }
  const title = optionalString(record, "title");

  const { code, view, stderr } = viewPr(
    repository,
    branch,
    typeof cwdRaw === "string" ? cwdRaw : null,
  );
  const blockers: string[] = [];
  if (code !== 0) {
    blockers.push(`gh pr view exited ${code}: ${stderr || "no stderr"}`);
  } else {
    if (view.isDraft !== true) {
      blockers.push(`pull request is not a draft (isDraft=${pyRepr(view.isDraft)})`);
    }
    if (view.baseRefName !== baseBranch) {
      blockers.push(
        `base branch is ${pyRepr(view.baseRefName)}, not the declared ${pyRepr(baseBranch)}`,
      );
    }
    if (view.headRefName !== branch) {
      blockers.push(
        `head branch is ${pyRepr(view.headRefName)}, not the declared ${pyRepr(branch)}`,
      );
    }
    if (typeof view.url !== "string" || view.url.trim() === "") {
      blockers.push("pull request carries no url");
    }
    if (title && view.title !== title) {
      blockers.push(
        `pull request title is ${pyRepr(view.title)}, not the declared ${pyRepr(title)}`,
      );
    }
  }

  return {
    protocol: PROTOCOL,
    verdict: blockers.length ? "fail" : "pass",
    classification: blockers.length ? "ship_verification_failed" : "pass",
    reason_codes: blockers.length ? ["ship_verification_failed"] : [],
    failure_route: blockers.length ? "blocked" : null,
    blockers,
    url: blockers.length ? null : ((view.url as string | undefined) ?? null),
    is_draft: view.isDraft ?? null,
    base_ref_name: view.baseRefName ?? null,
    head_ref_name: view.headRefName ?? null,
    title: view.title ?? null,
  };
}

export function main(): number {
  const raw = readFileSync(0, "utf8");
  const parsed = parseJson(raw);
  if ("error" in parsed) {
    process.stderr.write(`stdin is not valid JSON: ${parsed.error}\n`);
    return 1;
  }
  try {
    const result = verify(parsed.value);
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return 0;
  } catch (error) {
    if (error instanceof Invalid) {
      process.stderr.write(`${error.message}\n`);
      return 1;
    }
    throw error;
  }
}

if (isMainModule(import.meta.url)) {
  process.exit(main());
}
