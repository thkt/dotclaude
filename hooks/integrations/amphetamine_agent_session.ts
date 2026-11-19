#!/opt/homebrew/bin/bun
/// <reference types="node" />
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { readStdin } from "../_lib/hook_payload.ts";
import {
  anyFresh,
  anyMarker,
  fresh,
  hasMarkers,
  removeMarker,
  sessionId,
  sweep,
  touchMarker,
} from "./amphetamine_state.ts";

const AMPH_TIMEOUT_SECONDS = 5;

const SESSION_MINUTES = 60;

const BG_REFRESH_MINUTES = 5;

const BG_FRESH_MINUTES = 15;

const NO_SESSION = -3;

function defaultStateDir(): string {
  return join(homedir(), "Library", "Application Support", "claude-amphetamine");
}

function amph(command: string): string {
  const result = spawnSync("osascript", ["-e", `tell application "Amphetamine" to ${command}`], {
    encoding: "utf8",
    timeout: AMPH_TIMEOUT_SECONDS * 1000,
  });
  return result.status === 0 ? (result.stdout ?? "").trim() : "";
}

function startSession(): void {
  amph(
    `start new session with options {duration:${SESSION_MINUTES}, interval:minutes, displaySleepAllowed:false}`,
  );
}

function remaining(): number | null {
  const text = amph("session time remaining");
  return /^-?\d+$/.test(text) ? Number.parseInt(text, 10) : null;
}

function foreignSession(stateDir: string, marker: string, bgMarker: string): boolean {
  if (existsSync(marker) || existsSync(bgMarker) || hasMarkers(stateDir)) return false;
  return remaining() !== NO_SESSION;
}

function release(stateDir: string, marker: string, bgMarker: string): void {
  removeMarker(marker);

  if (anyMarker(stateDir, "session-")) return;

  const left = remaining();
  if (left === null || left <= 0 || left > SESSION_MINUTES * 60) return;

  if (anyFresh(stateDir, "bg-", BG_FRESH_MINUTES)) {
    startSession();
    return;
  }

  removeMarker(bgMarker);
  amph("end session");
}

function run(action: string, payloadText: string, stateDir: string): void {
  const sid = sessionId(payloadText, action);
  if (sid === null) return;
  try {
    mkdirSync(stateDir, { recursive: true });
  } catch {
    return;
  }
  sweep(stateDir);

  const marker = join(stateDir, `session-${sid}`);
  const bgMarker = join(stateDir, `bg-${sid}`);

  if (action === "release") {
    release(stateDir, marker, bgMarker);
    return;
  }

  if (action === "background" && fresh(bgMarker, BG_REFRESH_MINUTES)) return;
  if (foreignSession(stateDir, marker, bgMarker)) return;
  touchMarker(action === "background" ? bgMarker : marker);
  startSession();
}

const DEFAULT_APP = "/Applications/Amphetamine.app";

function isDirectory(path: string): boolean {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}

function osascriptOnPath(): string | null {
  const found = spawnSync("/usr/bin/env", ["sh", "-c", "command -v osascript"], {
    encoding: "utf8",
  });
  const path = (found.stdout ?? "").trim();
  return found.status === 0 && path ? path : null;
}

function main(): number {
  const action = process.argv[2] ?? "";
  if (action !== "acquire" && action !== "release" && action !== "background") return 0;
  if (!isDirectory(process.env.CLAUDE_AMPHETAMINE_APP || DEFAULT_APP)) return 0;
  if (osascriptOnPath() === null) return 0;
  const stateDir = process.env.CLAUDE_AMPHETAMINE_STATE_DIR || defaultStateDir();
  run(action, readStdin(), stateDir);
  return 0;
}

process.exit(main());
