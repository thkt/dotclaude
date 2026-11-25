/// <reference types="node" />
import { spawn } from "node:child_process";
import { lstatSync, mkdirSync, renameSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { treeHash } from "../../../hooks/_lib/gate_record.ts";
import { endGroup } from "./claude-child.ts";
import { baseConfigOf, DONE_GATE, finishedSessionOf, gateStatusOf, isCapture, isPositiveInteger, listOf, notDoneOf, notImplemented, notPrepared, objectOf, parseObject, type Prepared, preparedAt, type Problem, type Result, runQuiet, stopped, type WorktreeCall, writeLaunch } from "./launch-state.ts";

interface CaptureState {
  config: CaptureConfig;
  failed: Record<string, unknown> | null;
}

export const captureStateOf = (worktree: string, { gate, stored, launch }: Prepared): CaptureState | null => {
  const config = captureConfigOf(worktree, launch.base);
  if (config === null || "reason" in config) return null;
  const tree = treeHash(gate.root);
  if (tree === null) return null;
  const captures = listOf(stored, "captures");
  if (captureDecisionOf(worktree, launch.base, config, tree, lastPassedOf(captures)) !== "execute") return null;
  const last = objectOf(captures[captures.length - 1]);
  const unrepaired = last !== null && last.outcome === "failed" && last.tree === tree && isPositiveInteger(last.n);
  return { config, failed: unrepaired ? last : null };
};

const CAPTURE_TIMEOUT_MS = 570_000;
const CAPTURE_KILL_DELAY_MS = 2_000;
const LONGEST_TIMER_MS = 2_147_483_647;
const HARNESS = resolve(dirname(fileURLToPath(import.meta.url)), "..", "harness");
const INSTALLER = resolve(dirname(fileURLToPath(import.meta.url)), "install-media.ts");
const OUTPUT_SIBLINGS = ["", ".artifacts", ".config.mjs", ".report.json"];
const DIFF_LINE = /^:(\d{6}) (\d{6}) [0-9a-f]+ [0-9a-f]+ [A-Z]\d*\t(.+)$/;
const UNRENDERED_MODES = ["000000", "100644"];
const RECORD_FILE = /\.(json|txt|log|stdout|stderr|diff)$/;

export interface CaptureConfig {
  command: string[];
  destination: string;
  required: boolean;
}

type PassedCapture = Record<string, unknown> & { installed: string };

type CaptureDecision = "reused" | "not_required" | "execute";

interface Shot {
  code: number | null;
  signal: NodeJS.Signals | null;
  timedOut: boolean;
  text: string;
}

let captureGroup: number | null = null;

const captureTimeoutMs = (): number => {
  const text = process.env.LAUNCH_CAPTURE_TIMEOUT_MS ?? "";
  const value = /^\d+$/.test(text) ? Number(text) : 0;
  return value >= 1 && value <= LONGEST_TIMER_MS ? value : CAPTURE_TIMEOUT_MS;
};

export const captureConfigOf = (worktree: string, base: string): CaptureConfig | null | Problem => {
  const config = baseConfigOf(worktree, base);
  if (config !== null && isCapture(config.capture)) return config.capture as CaptureConfig | null;
  const detail = `The base commit ${base} of ${worktree} has no .dotagents.json with a capture that is null or {command, destination, required}.`;
  return { reason: "no-config", detail };
};

export const lastPassedOf = (captures: unknown[]): PassedCapture | null => {
  const last = objectOf(captures[captures.length - 1]);
  return last !== null && last.outcome === "passed" && typeof last.installed === "string" ? (last as PassedCapture) : null;
};

const definitionsOf = (command: string[]): string[] =>
  command
    .filter((part) => !part.includes("{harness}"))
    .map((part) => (part.startsWith("-") && part.includes("=") ? part.slice(part.indexOf("=") + 1) : part))
    .filter((part) => part !== "" && !part.startsWith("-"))
    .map((part) => (part.startsWith("./") ? part.slice(2) : part));

const isRecordFile = (destination: string, path: string): boolean => {
  const dir = destination.replace(/\/+$/, "");
  if (!dir.includes("/")) return false;
  return RECORD_FILE.test(path) && path.startsWith(dir.slice(0, dir.lastIndexOf("/") + 1)) && !path.startsWith(`${dir}/`);
};

const needsNoRecapture = (line: string, capture: CaptureConfig, afterPassed: boolean): boolean => {
  const match = DIFF_LINE.exec(line);
  if (match === null) return false;
  const [, before, after, path] = match;
  if (!UNRENDERED_MODES.includes(before) || !UNRENDERED_MODES.includes(after)) return false;
  if (definitionsOf(capture.command).includes(path)) return false;
  return path.endsWith(".md") || (afterPassed && isRecordFile(capture.destination, path));
};

export const captureDecisionOf = (worktree: string, base: string, capture: CaptureConfig, tree: string, passed: PassedCapture | null): CaptureDecision => {
  if (passed?.installed === tree) return "reused";
  if (capture.required) return "execute";
  const diff = runQuiet("git", ["diff-tree", "-r", "--no-renames", passed?.installed ?? `${base}^{tree}`, tree], worktree);
  if (diff.status !== 0) return "execute";
  const lines = diff.stdout.split("\n").filter((line) => line !== "");
  if (lines.length === 0 || !lines.every((line) => needsNoRecapture(line, capture, passed !== null))) return "execute";
  return passed === null ? "not_required" : "reused";
};

const nextCaptureNumber = (captures: unknown[]): number =>
  Math.max(0, ...captures.map((entry) => objectOf(entry)?.n).filter(isPositiveInteger)) + 1;

const setAsideOutput = (output: string): string | null => {
  try {
    const stamp = `${Math.floor(Date.now() / 1000)}-${process.pid}`;
    for (const suffix of OUTPUT_SIBLINGS) {
      const path = `${output}${suffix}`;
      if (lstatSync(path, { throwIfNoEntry: false }) !== undefined) renameSync(path, `${path}.stale-${stamp}`);
    }
    mkdirSync(output);
    return null;
  } catch (error) {
    return (error as Error).message;
  }
};

const runInGroup = (argv: string[], cwd: string, timeoutMs: number | null): Promise<Shot | { error: string }> =>
  new Promise((done) => {
    const [file, ...args] = argv;
    const child = spawn(file, args, { cwd, stdio: ["ignore", "pipe", "pipe"], detached: true });
    if (typeof child.pid === "number") captureGroup = child.pid;
    let text = "";
    const collect = (chunk: string) => {
      text += chunk;
    };
    child.stdout.setEncoding("utf8").on("data", collect);
    child.stderr.setEncoding("utf8").on("data", collect);
    let started = false;
    child.on("error", (error) => {
      if (started) return;
      captureGroup = null;
      done({ error: error.message });
    });
    child.once("spawn", () => {
      started = true;
      const pid = child.pid as number;
      let timedOut = false;
      let killed: Promise<void> = Promise.resolve();
      const timer = timeoutMs === null ? undefined : setTimeout(() => {
        timedOut = true;
        endGroup(pid, "SIGTERM");
        killed = new Promise((wake) =>
          setTimeout(() => {
            endGroup(pid, "SIGKILL");
            wake();
          }, CAPTURE_KILL_DELAY_MS),
        );
      }, timeoutMs);
      child.once("close", async (code, signal) => {
        clearTimeout(timer);
        await killed;
        captureGroup = null;
        done({ code, signal, timedOut, text });
      });
    });
  });

const logTailOf = (text: string): string => text.replace(/\n+$/, "").split("\n").slice(-80).join("\n").slice(-6000);

const shotOutcomeOf = (shot: Shot, tree: string, after: string | null, timeoutMs: number): { outcome: string; stop: Problem | null } => {
  if (shot.timedOut) {
    return { outcome: "timed_out", stop: { reason: "capture-timeout", detail: `The capture did not end within ${timeoutMs} ms.` } };
  }
  if (shot.code === 78) {
    const detail = "The capture command reported that the capture cannot run here (exit 78).";
    return { outcome: "unavailable", stop: { reason: "capture-unavailable", detail } };
  }
  if (after !== tree) {
    const detail = `The working tree was ${tree} before the capture and ${after} after it. A capture does not write into the checkout.`;
    return { outcome: "source_changed", stop: { reason: "source-changed", detail } };
  }
  if (shot.code !== 0) {
    return { outcome: "failed", stop: { reason: "capture-failed", detail: `The capture command exited ${shot.code ?? shot.signal}.` } };
  }
  return { outcome: "passed", stop: null };
};

const installMedia = (output: string, worktree: string, destination: string): { files: unknown[] } | { outcome: string; stop: Problem } => {
  const installed = runQuiet(process.execPath, [INSTALLER, output, worktree, destination], worktree);
  const result = parseObject(installed.stdout ?? "");
  if (result?.ok === true && Array.isArray(result.files)) return { files: result.files };
  if (result?.reason === "ignored") {
    const detail = `git ignores the capture destination ${destination} in ${worktree}, so the media would not be in the reviewed tree.`;
    return { outcome: "media_ignored", stop: { reason: "capture-media-ignored", detail } };
  }
  const reason = typeof result?.reason === "string" ? result.reason : "Could not get the media install result.";
  return { outcome: "invalid_media", stop: { reason: "invalid-capture", detail: `The capture output ${output} was not installed: ${reason}` } };
};

interface Shooting {
  worktree: string;
  root: string;
  launchPath: string;
  stored: Record<string, unknown>;
  captures: unknown[];
  destination: string;
  decision: CaptureDecision;
  tree: string;
  n: number;
  output: string;
  timeoutMs: number;
}

const failedCheckTail = async (worktree: string): Promise<string | null> => {
  const checked = await runInGroup([process.execPath, DONE_GATE, "check"], worktree, null);
  if ("error" in checked) return checked.error;
  return checked.code === 0 ? null : logTailOf(checked.text);
};

const settleShot = async (shot: Shot, { worktree, root, launchPath, stored, captures, destination, decision, tree, n, output, timeoutMs }: Shooting): Promise<Result> => {
  const exitCode = shot.timedOut ? null : shot.code;
  const record = (outcome: string, extra: Record<string, unknown> = {}) => {
    const entry = { n, tree, output, outcome, exit_code: exitCode, log_tail: outcome === "passed" ? "" : logTailOf(shot.text), ...extra, at: new Date().toISOString() };
    writeLaunch(launchPath, { ...stored, captures: [...captures, entry] });
    return entry;
  };
  const stopAfterStart = (outcome: string, { reason, detail }: Problem) => {
    const entry = record(outcome);
    return stopped("capture", reason, detail, { tree, n, output, exit_code: entry.exit_code, log_tail: entry.log_tail });
  };

  const shotResult = shotOutcomeOf(shot, tree, treeHash(root), timeoutMs);
  if (shotResult.stop !== null) return stopAfterStart(shotResult.outcome, shotResult.stop);
  const media = installMedia(output, worktree, destination);
  if ("stop" in media) return stopAfterStart(media.outcome, media.stop);
  const installed = treeHash(root);
  if (installed === null) {
    const detail = `The working tree of ${worktree} has no tree id after the media were installed.`;
    return stopAfterStart("unavailable", { reason: "capture-unavailable", detail });
  }
  const { files } = media;
  record("passed", { files, installed });
  const logTail = installed === tree ? null : await failedCheckTail(worktree);
  if (logTail !== null) {
    const detail = "done_gate.ts check did not pass after the media were installed.";
    return stopped("capture", "not-done", detail, { tree, n, output, files, installed, log_tail: logTail });
  }
  return { action: "capture", ok: true, decision, tree, n, output, files, installed };
};

export const capture = async ({ worktree }: WorktreeCall): Promise<Result> => {
  const stop = (reason: string, detail: string, extra: Record<string, unknown> = {}) =>
    stopped("capture", reason, detail, extra);

  const prepared = preparedAt(worktree);
  if (prepared === null) return stop("not-prepared", notPrepared(worktree));
  const { gate, launchPath, stored, launch } = prepared;
  if (finishedSessionOf(stored) === null) return stop("not-implemented", notImplemented(worktree, stored));
  const status = gateStatusOf(worktree);
  if (status.status !== 0) return stop("not-done", notDoneOf(status));
  const config = captureConfigOf(worktree, launch.base);
  if (config === null) return { action: "capture", ok: true, decision: "not_configured" };
  if ("reason" in config) return stop(config.reason, config.detail);
  const tree = treeHash(gate.root);
  if (tree === null) return stop("capture-unavailable", `The working tree of ${worktree} has no tree id.`);

  const captures = listOf(stored, "captures");
  const passed = lastPassedOf(captures);
  const decision = captureDecisionOf(worktree, launch.base, config, tree, passed);
  if (decision === "not_required") return { action: "capture", ok: true, decision, tree };
  if (decision === "reused") return { action: "capture", ok: true, decision, tree, n: passed?.n };

  const n = nextCaptureNumber(captures);
  const output = `${worktree}-capture-${n}`;
  if (!statSync(join(HARNESS, "scripts"), { throwIfNoEntry: false })?.isDirectory()) {
    return stop("capture-unavailable", `The capture adapter directory ${HARNESS}/scripts does not exist.`);
  }
  const unprepared = setAsideOutput(output);
  if (unprepared !== null) return stop("capture-unavailable", `The capture output directory ${output} could not be prepared: ${unprepared}`);
  const timeoutMs = captureTimeoutMs();
  const argv = [...config.command.map((part) => part.replaceAll("{harness}", HARNESS)), output];
  const shot = await runInGroup(argv, worktree, timeoutMs);
  if ("error" in shot) return stop("capture-unavailable", `The capture command could not start: ${shot.error}`);

  return settleShot(shot, { worktree, root: gate.root, launchPath, stored, captures, destination: config.destination, decision, tree, n, output, timeoutMs });
};

export const endCapture = () => {
  if (captureGroup !== null) endGroup(captureGroup, "SIGTERM");
};
