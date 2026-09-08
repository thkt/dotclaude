#!/usr/bin/env node
/// <reference types="node" />
// Usage: verify-commit.ts   (commit 事後条件の payload JSON を stdin で受ける)
//
// 置き換え元の Python 版 commit 検証器の TypeScript 移植: unit コミットが workflow の宣言どおりに
// 着地したかを、commit agent の自己申告ではなく Git に照会して検証する。
//
// stdin: JSON {repo, baseline_head, unit_files, body}
//   repo           リポジトリの絶対パス
//   baseline_head  unit コミット前に HEAD が指していたコミット sha
//   unit_files     この unit がコミットしてよい、リポジトリルートからの相対パス
//   body           subject の後に逐語で続くべきブロック (goal + trailer)
//
// stdout: JSON {verdict, classification, reason_codes, failure_route, blockers, ...}
//   verdict が pass になるのは、次のすべてが成り立つときだけである。
//     - HEAD が baseline_head から動いており、コミットが存在する
//     - HEAD の第 1 親が baseline_head であり、無関係な作業を巻き込んだ連鎖ではなく
//       検証済みの head の上にコミットが 1 個だけ着地している
//     - コミットされたパスが空でなく、すべて unit_files に載っている
//     - メッセージが subject、空行 1 つ、body の逐語、の順である
//     - subject がプロンプトの要求した Conventional Commits の形を保っている
// exit 0 は実行完了 (判定は JSON から読む)。exit 1 は usage / parse エラー --
// fail-closed: 不正な payload を検証済みコミットとして報告することはない。
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { isAbsolute } from "node:path";
import { isMainModule } from "../_lib/entry-point.ts";

const PROTOCOL = "claude-code-commit/v1";
const SUBJECT_MAX = 72;
export const COMMIT_TYPES = [
  "feat",
  "fix",
  "refactor",
  "docs",
  "test",
  "chore",
  "perf",
  "style",
  "ci",
] as const;
const SUBJECT_SHAPE = new RegExp(`^(?:${COMMIT_TYPES.join("|")})(?:\\([^()]+\\))?!?: \\S.*$`);

/** verifier が受け付けない payload。verify() は export され直接テストされるので、置き換え元の
 * Python の fail() のようにプロセスを終わらせず送出する。CLI 契約の stderr 1 行と exit 1 に
 * 変えるのは main() だけ。 */
class PayloadError extends Error {}

function fail(message: string): never {
  throw new PayloadError(message);
}

/** `git -C repo <args>` を実行し、exit status と stdout を返す。execFileSync ではなく
 * spawnSync を使う: root commit での `HEAD^` は exit 128 になり、execFileSync は非 0 の
 * status で例外を投げるが、ここでは output と合わせて status も必要とする。 */
function git(repo: string, args: readonly string[]): { status: number; stdout: string } {
  const result = spawnSync("git", ["-C", repo, ...args], { encoding: "utf8" });
  return { status: result.status ?? 1, stdout: result.stdout };
}

function gitText(repo: string, args: readonly string[]): string | null {
  const { status, stdout } = git(repo, args);
  return status === 0 ? stdout.trim() : null;
}

function strings(value: unknown, label: string): string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string" || item === "")) {
    fail(`${label} must be an array of non-empty strings`);
  }
  return (value as unknown[]).map((item) => String(item));
}

/** --root がないと、最初のコミットはパスを 1 つも返さない。 */
function committedPaths(repo: string): string[] | null {
  const { status, stdout } = git(repo, [
    "diff-tree",
    "--root",
    "--no-commit-id",
    "--name-only",
    "-r",
    "-z",
    "HEAD",
  ]);
  if (status !== 0) return null;
  return stdout
    .split("\0")
    .filter((path) => path)
    .sort();
}

function subjectBlockers(subject: string): string[] {
  const blockers: string[] = [];
  if (subject.length > SUBJECT_MAX) {
    blockers.push(`subject is ${subject.length} characters, over the ${SUBJECT_MAX} limit`);
  }
  if (subject.endsWith(".")) {
    blockers.push("subject ends with a period");
  }
  if (!SUBJECT_SHAPE.test(subject)) {
    blockers.push("subject is not in <type>(<scope>): <description> form");
  }
  return blockers;
}

/** 置き換え元の Python 版 verify() が行っていたのと同じ 5 つの事後条件検査を実行し、
 * 同じ report 形状を同じ key 順で返す。 */
export function verify(payload: unknown): Record<string, unknown> {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    fail("payload must be a JSON object");
  }
  const record = payload as Record<string, unknown>;
  const repo = record.repo;
  const baselineHead = record.baseline_head;
  const body = record.body;
  if (typeof repo !== "string" || !isAbsolute(repo)) {
    fail("repo must be an absolute path");
  }
  if (typeof baselineHead !== "string" || !baselineHead.trim()) {
    fail("baseline_head must be a non-empty string");
  }
  if (typeof body !== "string" || !body.trim()) {
    fail("body must be a non-empty string");
  }
  const unitFiles = new Set(strings(record.unit_files, "unit_files"));
  if (unitFiles.size === 0) {
    fail("unit_files must not be empty");
  }

  const blockers: string[] = [];
  const head = gitText(repo, ["rev-parse", "HEAD"]);
  if (head === null) {
    fail("repo is not a readable Git worktree");
  }
  const parent = gitText(repo, ["rev-parse", "HEAD^"]);
  const paths = committedPaths(repo);
  const message = gitText(repo, ["show", "-s", "--format=%B", "HEAD"]);
  const subject = (message ?? "").split("\n", 1)[0];

  if (head === baselineHead) {
    blockers.push("HEAD did not move, so no commit was created");
  } else if (parent === null) {
    blockers.push("HEAD has no parent, so it did not land on the verified baseline");
  } else if (parent !== baselineHead) {
    blockers.push(
      `HEAD's parent is ${parent}, not the verified baseline ${baselineHead}; ` +
        "exactly one commit must land on it",
    );
  }

  let outside: string[] = [];
  if (paths === null) {
    blockers.push("the committed paths could not be read");
  } else if (paths.length === 0) {
    blockers.push("the commit is empty");
  } else {
    outside = paths.filter((path) => !unitFiles.has(path));
    if (outside.length > 0) {
      blockers.push(`committed paths outside the unit scope: ${outside.join(", ")}`);
    }
  }

  if (message === null) {
    blockers.push("the commit message could not be read");
  } else {
    const expected = `${subject}\n\n${body}`.trim();
    if (message.trim() !== expected) {
      blockers.push("the commit message body does not match the declared block verbatim");
    }
    blockers.push(...subjectBlockers(subject));
  }

  return {
    protocol: PROTOCOL,
    verdict: blockers.length ? "fail" : "pass",
    classification: blockers.length ? "commit_postcondition_failed" : "pass",
    reason_codes: blockers.length ? ["commit_postcondition_failed"] : [],
    failure_route: blockers.length ? "blocked" : null,
    blockers,
    head,
    parent,
    committed_files: paths ?? [],
    outside_scope: outside,
    subject,
  };
}

export function main(): number {
  const raw = readFileSync(0, "utf8");
  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch (error) {
    process.stderr.write(
      `stdin is not valid JSON: ${error instanceof Error ? error.message : String(error)}\n`,
    );
    return 1;
  }
  let report: Record<string, unknown>;
  try {
    report = verify(payload);
  } catch (error) {
    if (!(error instanceof PayloadError)) throw error;
    process.stderr.write(`${error.message}\n`);
    return 1;
  }
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  return 0;
}

if (isMainModule(import.meta.url)) {
  process.exit(main());
}
