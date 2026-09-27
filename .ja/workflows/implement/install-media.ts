#!/usr/bin/env node
/// <reference types="node" />
// Usage: install-media.ts <output> <worktree> <destination>
//
// 撮影の出力ディレクトリにある媒体を検査し、worktree の destination (repo 相対) の内容を置き換える。
// 正本は ~/.agents/scripts/correction.ts の installMedia と capture.ts の validateCaptureMedia。
//
// stdout: JSON 1 行。成功は {ok: true, files: [{name, size, sha256}]}、失敗は {ok: false, reason}。
// exit 0 は成功。exit 1 は検査で拒否したとき (destination に触れない)。
//
// 拒否する条件:
//   - 出力が空、または PNG・JPEG・WebP・MP4・WebM 以外の名前、通常ファイルでないもの、先頭の形式識別子が合わないもの
//   - destination が worktree の外を指す、または親ディレクトリが symlink を経由する
//   - destination を git が ignore する (reason: "ignored")。媒体がレビュー対象の tree から外れるため。
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
import { isMainModule } from "../_lib/entry-point.ts";

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

/** 出力内の媒体を検査し、拒否理由か、名前・サイズ・sha256 の一覧を返す。 */
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

/** worktree 内の destination の絶対パスか、拒否理由を返す。 */
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
  // mkdir より先に各階層を確かめる。symlink の先にディレクトリを作らないため。
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
