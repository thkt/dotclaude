/// <reference types="node" />
import { closeSync, openSync, readdirSync, rmSync, statSync, utimesSync } from "node:fs";
import { join } from "node:path";
import { parse } from "../_lib/hook_payload.ts";

export const STALE_MINUTES = 480;

export function fresh(path: string, minutes: number): boolean {
  try {
    return Date.now() - statSync(path).mtimeMs < minutes * 60_000;
  } catch {
    return false;
  }
}

function markerNames(dir: string, prefix: string): string[] {
  try {
    return readdirSync(dir).filter((name) => name.startsWith(prefix));
  } catch {
    return [];
  }
}

export function anyFresh(stateDir: string, prefix: string, minutes: number): boolean {
  return markerNames(stateDir, prefix).some((name) => fresh(join(stateDir, name), minutes));
}

export function anyMarker(stateDir: string, prefix: string): boolean {
  return markerNames(stateDir, prefix).length > 0;
}

export function hasMarkers(stateDir: string): boolean {
  return anyMarker(stateDir, "session-") || anyMarker(stateDir, "bg-");
}

export function sweep(stateDir: string): void {
  for (const name of [...markerNames(stateDir, "session-"), ...markerNames(stateDir, "bg-")]) {
    const path = join(stateDir, name);
    if (!fresh(path, STALE_MINUTES)) {
      removeMarker(path);
    }
  }
}

export function touchMarker(path: string): void {
  closeSync(openSync(path, "a"));
  const now = new Date();
  utimesSync(path, now, now);
}

export function removeMarker(path: string): void {
  rmSync(path, { force: true });
}

export function sessionId(payloadText: string, action: string): string | null {
  const payload = parse(payloadText);
  const fromAgent = Boolean(payload.agent_id);
  if (action === "background") {
    if (!fromAgent && payload.tool_name !== "Workflow" && payload.tool_name !== "Agent") {
      return null;
    }
  } else if (fromAgent) {
    return null;
  }
  const value = payload.session_id;
  return typeof value === "string" && /^[A-Za-z0-9_-]{1,128}$/.test(value) ? value : null;
}
