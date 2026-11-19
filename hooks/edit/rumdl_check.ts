#!/opt/homebrew/bin/bun
/// <reference types="node" />
import { spawnSync } from "node:child_process";
import { statSync } from "node:fs";
import { editedFile, notify, readStdin } from "../_lib/hook_payload.ts";

function isFile(path: string): boolean {
  try {
    return statSync(path).isFile();
  } catch {
    return false;
  }
}

function main(): number {
  const path = editedFile(readStdin());
  if (path === null || !path.endsWith(".md")) return 0;
  if (!isFile(path)) return 0;

  const result = spawnSync("rumdl", ["check", path], { encoding: "utf8" });
  if (result.status === null) return 0;

  const output = (result.stdout ?? "").trim();
  if (result.status !== 0 && output) notify(output);
  return 0;
}

process.exit(main());
