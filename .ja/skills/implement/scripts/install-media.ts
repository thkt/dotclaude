#!/usr/bin/env node
/// <reference types="node" />
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  cpSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
} from "node:fs";
import { dirname, relative, resolve, sep } from "node:path";
import { isMainModule } from "../../../workflows/_lib/entry-point.ts";

const MEDIA_NAME = /\.(png|jpe?g|webp|mp4|webm)$/i;

function mediaSignature(name: string, bytes: Buffer): boolean {
  if (/\.png$/i.test(name))
    return bytes.subarray(0, 8).equals(Buffer.from("89504e470d0a1a0a", "hex"));
  if (/\.jpe?g$/i.test(name)) return bytes.subarray(0, 3).equals(Buffer.from("ffd8ff", "hex"));
  if (/\.webp$/i.test(name))
    return bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP";
  if (/\.mp4$/i.test(name)) return bytes.toString("ascii", 4, 8) === "ftyp";
  return /\.webm$/i.test(name) && bytes.subarray(0, 4).equals(Buffer.from("1a45dfa3", "hex"));
}

function inspectOutput(
  output: string,
): { reason: string } | { files: { name: string; size: number; sha256: string }[] } {
  const names = readdirSync(output).sort();
  if (!names.length) return { reason: "Capture succeeded without required media" };
  const files = [];
  for (const name of names) {
    const file = resolve(output, name);
    if (!MEDIA_NAME.test(name) || !lstatSync(file).isFile())
      return { reason: `Invalid capture output: ${name}` };
    const bytes = readFileSync(file);
    if (bytes.length <= 12 || !mediaSignature(name, bytes))
      return { reason: `Invalid capture media: ${name}` };
    files.push({
      name,
      size: bytes.length,
      sha256: createHash("sha256").update(bytes).digest("hex"),
    });
  }
  return { files };
}

function resolveDestination(
  worktree: string,
  destination: string,
  probe: string,
): { path: string } | { reason: string } {
  const root = realpathSync(worktree);
  const path = resolve(root, destination);
  const inside = relative(root, path);
  if (!inside || inside.startsWith("..") || inside.startsWith(sep))
    return { reason: "Capture destination is outside the worktree" };
  const parent = dirname(path);
  let current = root;
  for (const part of relative(root, parent).split(sep)) {
    current = resolve(current, part);
    if (lstatSync(current, { throwIfNoEntry: false })?.isSymbolicLink())
      return { reason: "Capture destination must not resolve through a symlink" };
  }
  mkdirSync(parent, { recursive: true });
  const ignored = spawnSync("git", ["-C", root, "check-ignore", "-q", resolve(path, probe)]);
  return ignored.status === 0 ? { reason: "ignored" } : { path };
}

export function main(argv: string[]): number {
  const [output, worktree, destination] = argv;
  const fail = (reason: string) => {
    process.stdout.write(`${JSON.stringify({ ok: false, reason })}\n`);
    return 1;
  };
  if (!output || !worktree || !destination)
    return fail("Usage: install-media.ts <output> <worktree> <destination>");
  const inspected = inspectOutput(output);
  if ("reason" in inspected) return fail(inspected.reason);
  const target = resolveDestination(worktree, destination, inspected.files[0].name);
  if ("reason" in target) return fail(target.reason);
  rmSync(target.path, { recursive: true, force: true });
  cpSync(output, target.path, { recursive: true });
  process.stdout.write(`${JSON.stringify({ ok: true, files: inspected.files })}\n`);
  return 0;
}

if (isMainModule(import.meta.url)) {
  process.exit(main(process.argv.slice(2)));
}
