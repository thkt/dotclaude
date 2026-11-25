/// <reference types="node" />
import { type SpawnSyncReturns, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { type GateLocation, gateLocation, LAUNCH_FILE, readJson } from "../../../hooks/_lib/gate_record.ts";
import { type Holding } from "./holders.ts";

export const DONE_GATE = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "hooks", "lifecycle", "done_gate.ts");

const DIGEST = /^[0-9a-f]{64}$/;

export const ASSESSED = ["code", "requirements", "tests", "documentation"] as const;

export type Result = Record<string, unknown> & { ok: boolean };

export interface Launch {
  issue: number;
  repository: string;
  branch: string;
  base: string;
  issue_digest: string;
}

export const stopped = (action: string, reason: string, detail: string, extra: Record<string, unknown> = {}): Result => ({
  action,
  ok: false,
  ...extra,
  reason,
  detail,
});

export const oneLine = (text: string): string => text.trim().replace(/\s+/g, " ");

export const outputOf = (run: SpawnSyncReturns<string>): string =>
  oneLine(`${run.stdout ?? ""} ${run.stderr ?? ""} ${run.error?.message ?? ""}`);

export const runQuiet = (file: string, args: string[], cwd: string): SpawnSyncReturns<string> =>
  spawnSync(file, args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });

export const nonEmpty = (value: unknown): value is string => typeof value === "string" && value.trim() !== "";

export const objectOf = (value: unknown): Record<string, unknown> | null =>
  typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : null;

export const parseObject = (text: string): Record<string, unknown> | null => {
  try {
    return objectOf(JSON.parse(text));
  } catch {
    return null;
  }
};

export const isDigest = (value: unknown): value is string => typeof value === "string" && DIGEST.test(value);

export const listOf = (stored: Record<string, unknown>, name: string): unknown[] => (Array.isArray(stored[name]) ? stored[name] : []);

export const writeLaunch = (path: string, value: unknown): void => writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);

export const gateStatusOf = (worktree: string): SpawnSyncReturns<string> => runQuiet(process.execPath, [DONE_GATE, "status"], worktree);

export const notDoneOf = (status: SpawnSyncReturns<string>): string => `done_gate.ts status is not done: ${outputOf(status)}`;

export const gateAt = (worktree: string): GateLocation | null => (existsSync(worktree) ? gateLocation(worktree) : null);

export const baseConfigOf = (worktree: string, base: string): Record<string, unknown> | null => {
  const shown = runQuiet("git", ["show", `${base}:.dotagents.json`], worktree);
  return shown.status === 0 ? parseObject(shown.stdout) : null;
};

export const isCommandArgv = (value: unknown): value is string[] =>
  Array.isArray(value) && value.length > 0 && value.every((part) => typeof part === "string") && value[0].trim() !== "";

export const isShellOrArgv = (value: unknown): boolean => nonEmpty(value) || isCommandArgv(value);

export const isUniqueNames = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every(nonEmpty) && new Set(value).size === value.length;

const isRepoRelative =(path: unknown): boolean =>
  nonEmpty(path) && !path.startsWith("/") && !path.split("/").includes("..");

export const isCapture = (value: unknown): boolean => {
  if (value === null) return true;
  const capture = objectOf(value);
  return capture !== null && isCommandArgv(capture.command) && isRepoRelative(capture.destination) && typeof capture.required === "boolean";
};

type ViewedIssue = Record<string, unknown> & { title: string; state: string };

export const viewIssue = (issue: number, repository: string, fields: string, cwd: string): ViewedIssue | string => {
  const viewed = runQuiet("gh", ["issue", "view", String(issue), "--repo", repository, "--json", fields], cwd);
  const found = viewed.status === 0 ? parseObject(viewed.stdout) : null;
  if (!found || typeof found.title !== "string" || typeof found.state !== "string") {
    return `gh could not read Issue #${issue} of ${repository}: ${outputOf(viewed)}`;
  }
  return found as ViewedIssue;
};

export const digestOf = ({ title, body, state }: Record<string, unknown>): string =>
  createHash("sha256").update(JSON.stringify([title, body, state])).digest("hex");

export const agreedIssueOf = ({ issue, repository, issue_digest }: Launch, worktree: string): { found: ViewedIssue } | Problem => {
  const found = viewIssue(issue, repository, "title,body,state", worktree);
  if (typeof found === "string") return { reason: "issue-unreadable", detail: found };
  if (digestOf(found) === issue_digest) return { found };
  const detail = `The title, body, or state of Issue #${issue} of ${repository} changed after the agreed version was recorded.`;
  return { reason: "requirements-changed", detail };
};

const REMOTE_LINE = /^(\S+)\s+(\S+)\s+\((fetch|push)\)$/;
const GITHUB_URL = /^(?:https:\/\/github\.com\/|git@github\.com:|ssh:\/\/git@github\.com\/)([\w.-]+\/[\w.-]+?)(?:\.git)?$/;
const PUSH_PERMISSIONS = ["ADMIN", "MAINTAIN", "WRITE"];

const remotePointsAt = (repo: string, remote: string, repository: string): boolean => {
  const listed = runQuiet("git", ["-C", repo, "remote", "-v"], repo);
  const lines = (listed.status === 0 ? listed.stdout : "")
    .split("\n")
    .map((line) => REMOTE_LINE.exec(line.trim()))
    .filter((match): match is RegExpExecArray => match !== null && match[1] === remote);
  const kinds = new Set(lines.map((match) => match[3]));
  return kinds.has("fetch") && kinds.has("push") && lines.every((match) => GITHUB_URL.exec(match[2])?.[1] === repository);
};

export type Problem = { reason: string; detail: string };

export const remoteProblem = (repo: string, remote: string, repository: string): Problem | null => {
  const host = (process.env.GH_HOST ?? "").trim();
  if (host !== "" && host !== "github.com") {
    return { reason: "gh-host", detail: `GH_HOST points at ${host}. launch.ts handles only github.com.` };
  }
  if (remotePointsAt(repo, remote, repository)) return null;
  const detail = `The fetch and push URLs of remote ${remote} in ${repo} do not all point at ${repository} on github.com. Fix .dotagents.json or the remote.`;
  return { reason: "remote-mismatch", detail };
};

export const publishTargetProblem = (repository: string, repo: string): Problem | null => {
  const viewed = runQuiet("gh", ["repo", "view", repository, "--json", "nameWithOwner,viewerPermission"], repo);
  const found = viewed.status === 0 ? parseObject(viewed.stdout) : null;
  if (!found || typeof found.nameWithOwner !== "string") {
    return { reason: "repo-unreadable", detail: `gh could not read the repository ${repository}: ${outputOf(viewed)}` };
  }
  const { nameWithOwner, viewerPermission } = found;
  if (nameWithOwner !== repository) {
    const detail = `GitHub names the repository ${nameWithOwner}, which differs from repository ${repository} in .dotagents.json.`;
    return { reason: "repository-mismatch", detail };
  }
  if (typeof viewerPermission === "string" && PUSH_PERMISSIONS.includes(viewerPermission)) return null;
  const permission = typeof viewerPermission === "string" && viewerPermission !== "" ? viewerPermission : "unknown";
  return { reason: "no-permission", detail: `The permission of the gh user on ${repository} is ${permission}, which cannot push.` };
};

const launchOf = (value: unknown): Launch | null => {
  const fields = objectOf(value);
  if (!fields) return null;
  const { issue, repository, branch, base, issue_digest } = fields;
  if (!Number.isInteger(issue) || !nonEmpty(repository) || !nonEmpty(branch) || !nonEmpty(base)) return null;
  if (!isDigest(issue_digest)) return null;
  return { issue: issue as number, repository, branch, base, issue_digest };
};

export interface WorktreeCall {
  worktree: string;
  model: string;
  effort: string | undefined;
  fresh: boolean;
}

export interface Prepared {
  gate: GateLocation;
  launchPath: string;
  stored: Record<string, unknown>;
  launch: Launch;
}

export const preparedAt = (worktree: string): Prepared | null => {
  const gate = gateAt(worktree);
  const launchPath = gate ? join(gate.dir, LAUNCH_FILE) : "";
  const stored = gate ? objectOf(readJson(launchPath)) : null;
  const launch = launchOf(stored);
  return gate && stored && launch ? { gate, launchPath, stored, launch } : null;
};

export const notPrepared = (worktree: string): string => `${worktree} has no launch.json that prepare wrote.`;

type ImplementState = "none" | "unfinished" | "finished";

export const implementStateOf = (stored: Record<string, unknown>): ImplementState => {
  const record = objectOf(stored.implement);
  if (!nonEmpty(record?.session_id)) return "none";
  return typeof record?.at === "string" ? "finished" : "unfinished";
};

export const finishedSessionOf = (stored: Record<string, unknown>): string | null =>
  implementStateOf(stored) === "finished" ? (objectOf(stored.implement)?.session_id as string) : null;

export const notImplemented = (worktree: string, stored: Record<string, unknown>): string =>
  implementStateOf(stored) === "none"
    ? `launch.json of ${worktree} has no implement.session_id.`
    : `The implementing session of ${worktree} has not finished. Call implement or run to resume it.`;

export let holding: Holding | null = null;

export const setHolding = (held: Holding | null): void => {
  holding = held;
};

export const isPositiveInteger = (value: unknown): value is number => Number.isInteger(value) && (value as number) > 0;
