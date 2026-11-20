#!/usr/bin/env node
/// <reference types="node" />
import { type SpawnSyncReturns, spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { gateLocation, git, readJson, treeHash } from "../../../hooks/_lib/gate_record.ts";
import { runClaudeOnce } from "../../../workflows/_lib/claude-run.ts";
import { isMainModule } from "../../../workflows/_lib/entry-point.ts";

export const TYPE_BY_PREFIX: Record<string, string> = { bug: "fix", feature: "feat", docs: "docs", chore: "chore" };

const DONE_GATE = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "hooks", "lifecycle", "done_gate.ts");
const LAUNCH_FILE = "launch.json";
const CHILD_TIMEOUT_MS = 3_600_000;
const DESCRIPTION = /^[a-z0-9]+(-[a-z0-9]+){1,3}$/;

const USAGE =
  "usage: launch.ts prepare --repo <abs path> --issue <number> [--description <words>] [--gate-mode record|enforce]\n" +
  "       launch.ts implement --worktree <abs path> [--model <name>]\n";

const promptFor = (issue: number, repository: string, doneGate: string): string =>
  `この worktree で、${repository} の GitHub Issue #${issue} を実装してください。

1. \`gh issue view ${issue} --repo ${repository} --json title,body\` で Issue を読んでください。Issue は合意済みの要件です。範囲を変えず、範囲外に挙げたことは行わないでください。
2. Issue が求める変更を、触るファイルに当てはまる repository の規則に従って行ってください。
3. \`${doneGate} check\` を走らせてください。repository の全体の検査を走らせ、今の作業ツリーに対する結果を記録します。失敗したところを直し、もう一度走らせてください。
4. \`${doneGate} status\` が \`done\` を出したら完了です。検査が通った後に編集すると記録が古くなるので、最後の編集の後にもう一度検査を走らせてください。

commit、push、pull request の作成はしないでください。この worktree の外のファイルは編集しないでください。

完了したら、次を返してください。変更したファイル、\`${doneGate} status\` が出した内容、Issue に書かれていない点についてあなたが決めたこと、Issue が名前を挙げた人に引き渡す手順。
`;

type Flags = Record<string, string>;
type Result = Record<string, unknown> & { ok: boolean };

interface Launch {
  issue: number;
  repository: string;
  branch: string;
  base: string;
}

const readFlags = (argv: string[], allowed: readonly string[]): Flags | null => {
  const flags: Flags = {};
  for (let index = 0; index < argv.length; index += 2) {
    const [name, value] = [argv[index], argv[index + 1]];
    if (!allowed.includes(name) || Object.hasOwn(flags, name) || value === undefined || value === "") return null;
    flags[name] = value;
  }
  return flags;
};

const stopped = (action: string, reason: string, detail: string, extra: Record<string, unknown> = {}): Result => ({
  action,
  ok: false,
  ...extra,
  reason,
  detail,
});

const oneLine = (text: string): string => text.trim().replace(/\s+/g, " ");

const outputOf = (run: SpawnSyncReturns<string>): string =>
  oneLine(`${run.stdout ?? ""} ${run.stderr ?? ""} ${run.error?.message ?? ""}`);

const runQuiet = (file: string, args: string[], cwd: string): SpawnSyncReturns<string> =>
  spawnSync(file, args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });

const runShown = (file: string, args: string[], cwd: string): SpawnSyncReturns<Buffer> =>
  spawnSync(file, args, { cwd, stdio: ["ignore", 2, 2] });

const exitOf = (run: SpawnSyncReturns<Buffer>): string =>
  `exited ${run.status ?? run.error?.message ?? run.signal}; its output is on stderr`;

const nonEmpty = (value: unknown): value is string => typeof value === "string" && value.trim() !== "";

const objectOf = (value: unknown): Record<string, unknown> | null =>
  typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : null;

const parseObject = (text: string): Record<string, unknown> | null => {
  try {
    return objectOf(JSON.parse(text));
  } catch {
    return null;
  }
};

const descriptionOf = (title: string): string | null => {
  const words = (title.replace(/^\[\w+\]/, "").toLowerCase().match(/[a-z0-9]+/g) ?? []).slice(0, 4);
  return words.length >= 2 ? words.join("-") : null;
};

const setupSteps = (setup: unknown): string[][] | null => {
  if (setup === undefined || setup === null) return [];
  if (typeof setup === "string") return setup.trim() === "" ? [] : [["/bin/sh", "-c", setup]];
  const isArgv = (step: unknown): step is string[] =>
    Array.isArray(step) && step.length > 0 && step.every((part) => typeof part === "string") && step[0] !== "";
  return Array.isArray(setup) && setup.every(isArgv) ? setup : null;
};

const runSetup = (worktree: string): string | null => {
  const config = parseObject(existsSync(join(worktree, ".dotagents.json")) ? readFileSync(join(worktree, ".dotagents.json"), "utf8") : "");
  const steps = setupSteps(config?.setup);
  if (steps === null) return "setup in .dotagents.json is neither a shell string nor an array of argv arrays";
  for (const [file, ...args] of steps) {
    const run = runShown(file, args, worktree);
    if (run.status !== 0) return `setup step ${JSON.stringify([file, ...args])} ${exitOf(run)}`;
  }
  return null;
};

interface PrepareCall {
  repo: string;
  issue: number;
  description: string | undefined;
  gateMode: string;
}

interface Plan {
  repository: string;
  remote: string;
  baseBranch: string;
  branch: string;
  worktree: string;
}

const prepareCall = (argv: string[]): PrepareCall | null => {
  const flags = readFlags(argv, ["--repo", "--issue", "--description", "--gate-mode"]);
  if (flags === null) return null;
  const call = {
    repo: flags["--repo"] ?? "",
    issue: Number(flags["--issue"]),
    description: flags["--description"],
    gateMode: flags["--gate-mode"] ?? "record",
  };
  const fits =
    isAbsolute(call.repo) &&
    /^[1-9]\d*$/.test(flags["--issue"] ?? "") &&
    (call.description === undefined || DESCRIPTION.test(call.description)) &&
    (call.gateMode === "record" || call.gateMode === "enforce");
  return fits ? call : null;
};

const prepareStop = (issue: number, reason: string, detail: string): Result =>
  stopped("prepare", reason, detail, { issue });

const planOf = ({ repo, issue, description }: PrepareCall): Plan | Result => {
  const config = parseObject(runQuiet("git", ["-C", repo, "show", "HEAD:.dotagents.json"], repo).stdout ?? "");
  if (!config || !nonEmpty(config.repository) || !nonEmpty(config.remote) || !nonEmpty(config.baseBranch)) {
    return prepareStop(issue, "no-config", `HEAD of ${repo} has no .dotagents.json with non-empty repository, remote, and baseBranch strings.`);
  }
  const { repository, remote, baseBranch } = config;
  const viewed = runQuiet("gh", ["issue", "view", String(issue), "--repo", repository, "--json", "number,title,body,state"], repo);
  const found = viewed.status === 0 ? parseObject(viewed.stdout) : null;
  if (!found || typeof found.title !== "string" || typeof found.state !== "string") {
    return prepareStop(issue, "issue-unreadable", `gh could not read Issue #${issue} of ${repository}: ${outputOf(viewed)}`);
  }
  if (found.state !== "OPEN") return prepareStop(issue, "issue-not-open", `Issue #${issue} is ${found.state}, not OPEN.`);
  const prefix = (/^\[(\w+)\]/.exec(found.title)?.[1] ?? "").toLowerCase();
  if (!Object.hasOwn(TYPE_BY_PREFIX, prefix)) {
    const accepted = Object.keys(TYPE_BY_PREFIX).map((key) => `[${key[0].toUpperCase()}${key.slice(1)}]`);
    return prepareStop(issue, "issue-untyped", `The title of Issue #${issue} starts with none of ${accepted.join(", ")}.`);
  }
  const words = description ?? descriptionOf(found.title);
  if (words === null) {
    return prepareStop(issue, "no-description", `The title of Issue #${issue} has fewer than 2 English words; pass --description.`);
  }
  const branch = `${TYPE_BY_PREFIX[prefix]}/${issue}-${words}`;
  return { repository, remote, baseBranch, branch, worktree: join(repo, ".claude", "worktrees", `implement-${issue}`) };
};

const createWorktree = ({ repo, issue }: PrepareCall, { remote, baseBranch, branch, worktree }: Plan): string | Result => {
  const fetched = runShown("git", ["-C", repo, "fetch", remote, baseBranch], repo);
  if (fetched.status !== 0) return prepareStop(issue, "fetch-failed", `git fetch ${remote} ${baseBranch} ${exitOf(fetched)}.`);
  if (git(["rev-parse", "--verify", "--quiet", `refs/heads/${branch}`], repo) !== null) {
    return prepareStop(issue, "branch-exists", `The branch ${branch} already exists in ${repo}.`);
  }
  if (existsSync(worktree)) return prepareStop(issue, "worktree-exists", `${worktree} already exists.`);
  const added = runShown("git", ["-C", repo, "worktree", "add", "-b", branch, worktree, `refs/remotes/${remote}/${baseBranch}`], repo);
  const base = added.status === 0 ? git(["rev-parse", "HEAD"], worktree) : null;
  return base ?? prepareStop(issue, "worktree-failed", `git worktree add for ${branch} at ${worktree} ${exitOf(added)}.`);
};

const prepare = (argv: string[]): Result | null => {
  const call = prepareCall(argv);
  if (call === null) return null;
  const plan = planOf(call);
  if ("ok" in plan) return plan;
  const base = createWorktree(call, plan);
  if (typeof base !== "string") return base;
  const { issue, gateMode } = call;
  const { repository, branch, worktree } = plan;
  const kept = `The worktree ${worktree} and the branch ${branch} are left in place.`;
  const setupFailure = runSetup(worktree);
  if (setupFailure !== null) return prepareStop(issue, "setup-failed", `${setupFailure}. ${kept}`);
  const gateOn = runShown(process.execPath, [DONE_GATE, "on", "--mode", gateMode], worktree);
  const gate = gateOn.status === 0 ? gateLocation(worktree) : null;
  if (gate === null) return prepareStop(issue, "gate-failed", `done_gate.ts on --mode ${gateMode} ${exitOf(gateOn)}. ${kept}`);
  const launch: Launch = { issue, repository, branch, base };
  writeFileSync(join(gate.dir, LAUNCH_FILE), `${JSON.stringify(launch, null, 2)}\n`);
  return { action: "prepare", ok: true, issue, branch, worktree, base, gate_mode: gateMode };
};

const launchOf = (value: unknown): Launch | null => {
  const fields = objectOf(value);
  if (!fields) return null;
  const { issue, repository, branch, base } = fields;
  if (!Number.isInteger(issue) || !nonEmpty(repository) || !nonEmpty(branch) || !nonEmpty(base)) return null;
  return { issue: issue as number, repository, branch, base };
};

const implement = async (argv: string[]): Promise<Result | null> => {
  const flags = readFlags(argv, ["--worktree", "--model"]);
  if (flags === null) return null;
  const worktree = flags["--worktree"];
  if (!worktree || !isAbsolute(worktree)) return null;
  const stop = (reason: string, detail: string, extra: Record<string, unknown> = {}) =>
    stopped("implement", reason, detail, extra);

  const gate = existsSync(worktree) ? gateLocation(worktree) : null;
  const launchPath = gate ? join(gate.dir, LAUNCH_FILE) : "";
  const launch = gate ? launchOf(readJson(launchPath)) : null;
  if (gate === null || launch === null) return stop("not-prepared", `${worktree} has no launch.json that prepare wrote.`);

  const outcome = await runClaudeOnce({
    prompt: promptFor(launch.issue, launch.repository, DONE_GATE),
    model: flags["--model"] ?? "opus",
    effort: undefined,
    schema: undefined,
    cwd: worktree,
    timeoutMs: CHILD_TIMEOUT_MS,
  });
  const tail = oneLine(outcome.stderr.split("\n").slice(-3).join(" "));
  if (outcome.timedOut) return stop("child-failed", `claude -p was ended at its ${CHILD_TIMEOUT_MS} ms limit. ${tail}`);
  if (outcome.code !== 0) return stop("child-failed", `claude -p exited ${outcome.code}. ${tail}`);
  const reply = parseObject(outcome.stdout);
  if (reply === null) return stop("child-failed", `claude -p printed no JSON object. ${tail}`);
  if (typeof reply.session_id !== "string") return stop("child-failed", "the JSON claude -p printed has no session_id string.");

  const status = runQuiet(process.execPath, [DONE_GATE, "status"], worktree);
  const tree = treeHash(gate.root);
  writeFileSync(
    launchPath,
    `${JSON.stringify({ ...launch, implement: { session_id: reply.session_id, tree, at: new Date().toISOString() } }, null, 2)}\n`,
  );
  const shown = {
    session_id: reply.session_id,
    tree,
    result: reply.result,
    cost_usd: reply.total_cost_usd,
    duration_ms: reply.duration_ms,
  };
  if (status.status !== 0) return stop("not-done", `done_gate.ts status is not done: ${outputOf(status)}`, shown);
  return { action: "implement", ok: true, ...shown };
};

export async function launch(argv: string[]): Promise<number> {
  const [action, ...rest] = argv;
  const result = action === "prepare" ? prepare(rest) : action === "implement" ? await implement(rest) : null;
  if (result === null) {
    process.stderr.write(USAGE);
    return 2;
  }
  process.stdout.write(`${JSON.stringify(result)}\n`);
  return result.ok ? 0 : 1;
}

if (isMainModule(import.meta.url)) process.exitCode = await launch(process.argv.slice(2));
