/// <reference types="node" />
import { mkdirSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

export const HOLDERS_DIR = "launch-holders";
const RECORD_NAME = /^[1-9][0-9]*\.json$/;

export interface HolderStop {
  reason: string;
  detail: string;
  holder?: Record<string, unknown>;
}

export interface Holding {
  started: (pid: number) => void;
  ended: () => void;
  release: () => void;
}

const isRunning = (pid: number): boolean => {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === "EPERM";
  }
};

const groupRunning = (pid: number): boolean => isRunning(-pid);

const placeFile = (path: string, value: unknown): void => {
  writeFileSync(`${path}.tmp`, `${JSON.stringify(value)}\n`);
  renameSync(`${path}.tmp`, path);
};

const removeFile = (path: string): void => {
  try {
    rmSync(path, { force: true });
  } catch {
  }
};

const readText = (path: string): string | null => {
  try {
    return readFileSync(path, "utf8");
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === "ENOENT" ? null : "";
  }
};

const parsed = (text: string): unknown => {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
};

const recordOf = (value: unknown, n: number): { pid: number; action: string; at: string } | null => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const { pid, action, at } = value as Record<string, unknown>;
  return pid === n && typeof action === "string" && typeof at === "string" ? { pid, action, at } : null;
};

const childrenOf = (text: string | null): number[] | null => {
  if (text === null) return [];
  const value = parsed(text);
  return Array.isArray(value) && value.every((pid) => Number.isInteger(pid) && pid > 0) ? value : null;
};

type Judged =
  | { kind: "busy"; n: number; holder: Record<string, unknown> }
  | { kind: "claude-left-running"; n: number; holder: Record<string, unknown> }
  | { kind: "holder-unreadable"; n: number; holder: Record<string, unknown> }
  | null;

const judge = (dir: string, name: string): Judged => {
  const n = Number(name.slice(0, -".json".length));
  const file = join(dir, name);
  const text = readText(file);
  if (text === null) return null;
  const record = recordOf(parsed(text), n);
  if (record === null) return { kind: "holder-unreadable", n, holder: { file } };
  const held = { file, pid: record.pid, action: record.action, at: record.at };
  if (isRunning(record.pid)) return { kind: "busy", n, holder: held };
  const childrenFile = join(dir, `${n}.children.json`);
  const children = childrenOf(readText(childrenFile));
  if (children === null) return { kind: "holder-unreadable", n, holder: { file: childrenFile } };
  const claude = children.filter(groupRunning);
  if (claude.length > 0) return { kind: "claude-left-running", n, holder: { ...held, claude } };
  removeFile(file);
  removeFile(childrenFile);
  return null;
};

const STOP_ORDER = ["busy", "claude-left-running", "holder-unreadable"] as const;

const detailOf = (kind: (typeof STOP_ORDER)[number], holder: Record<string, unknown>, worktree: string): string => {
  const { file, pid, action, at, claude } = holder;
  if (kind === "busy") {
    return `launch.ts ${action} (pid ${pid}, started ${at}) is working on ${worktree}. Wait for it to end, or end it, and call again. Its record is ${file}. Delete the record only when \`ps -p ${pid} -o command=\`, run outside any sandbox, shows a process that is not launch.ts.`;
  }
  if (kind === "claude-left-running") {
    const ids = (claude as number[]).join(", ");
    return `launch.ts ${action} (pid ${pid}, started ${at}) ended and left claude running on ${worktree}. Process group ids still running: ${ids}. A claude that launch.ts ended on a signal is gone within a second, so call again first. If the groups stay, list their processes with \`ps -axo pid,pgid,command\`, run outside any sandbox, end each group that is claude with \`kill -TERM -- -<id>\`, and call again. Its record is ${file}. Delete the record only when ps shows that no process in those groups is claude.`;
  }
  return `The record ${file} of a launch.ts working on ${worktree} cannot be read. Confirm with \`ps -axo pid,pgid,command\`, run outside any sandbox, that no launch.ts and no claude it started is running on ${worktree}. Then delete ${file} and call again.`;
};

const stopOf = (judged: NonNullable<Judged>[], worktree: string): HolderStop | null => {
  for (const kind of STOP_ORDER) {
    const [first] = judged.filter((entry) => entry.kind === kind).sort((a, b) => a.n - b.n);
    if (first) return { reason: kind, detail: detailOf(kind, first.holder, worktree), holder: first.holder };
  }
  return null;
};

export const hold = (gateDir: string, action: string, worktree: string): Holding | HolderStop => {
  const dir = resolve(gateDir, HOLDERS_DIR);
  const own = `${process.pid}.json`;
  const recordFile = join(dir, own);
  const childrenFile = join(dir, `${process.pid}.children.json`);
  const release = () => {
    removeFile(childrenFile);
    removeFile(recordFile);
  };
  try {
    mkdirSync(dir, { recursive: true });
    placeFile(childrenFile, []);
    placeFile(recordFile, { pid: process.pid, action, at: new Date().toISOString() });
  } catch (error) {
    release();
    return { reason: "holder-write-failed", detail: `launch.ts could not write its record under ${dir}: ${(error as Error).message}` };
  }
  const others = readdirSync(dir).filter((name) => RECORD_NAME.test(name) && name !== own);
  const stop = stopOf(
    others.map((name) => judge(dir, name)).filter((entry): entry is NonNullable<Judged> => entry !== null),
    worktree,
  );
  if (stop !== null) {
    release();
    return stop;
  }
  let children: number[] = [];
  const rewrite = () => {
    children = children.filter(groupRunning);
    try {
      placeFile(childrenFile, children);
    } catch {
    }
  };
  return {
    started: (pid) => {
      children.push(pid);
      rewrite();
    },
    ended: rewrite,
    release,
  };
};
