#!/usr/bin/env node
/// <reference types="node" />
// Usage: diff-files.ts   (diff listing payload JSON を stdin で受ける)
//
// build が branch point から変更したファイル一覧を、agent に手順を再現させるのではなく git
// に問い合わせて取る。build.js の Verify はこの一覧を scope deviations と未変更 plan files の
// 両方に使うが、`git diff <sha>` を実行するよう指示された agent は baseline を自分で解決した
// HEAD にすり替えることがある。unit commit 後の HEAD から測ると、コミット済みの実装ファイルが
// 一覧から落ち、PR には plan files が変更されていないと書かれてしまう。
//
// stdin:  JSON {repo, base}
//   repo   repository の絶対パス
//   base   測定の起点となる commit (branch-point の sha、unit commit が無効なら HEAD)
//
// stdout: JSON {protocol, files, base, error}
//   files  `git diff <base> --name-only` と `git ls-files --others --exclude-standard` の
//          和集合。repo-root からの相対パス、重複除去、ソート済み。git が失敗したときは
//          null で、その stderr を error に載せる。build.js は null を「一覧が取れなかった」
//          と読む
// exit 0 は run が完了したことを意味する (結果は JSON から読む)。exit 1 は usage / parse
// エラー。Fail-closed: 壊れた payload が空の change list として報告されることはない。
//
// 置き換え元の Python 版 change-listing verifier の TypeScript 移植。Contract: この CLI 自身の
// 挙動。workflows/build/tests/diff-files.test.ts が、固定 fixture
// workflows/build/tests/fixtures/diff-files-cases.json に対してエンドツーエンドで検査する。
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { isAbsolute } from "node:path";
import { parseJson } from "../_lib/cli.ts";
import { isMainModule } from "../_lib/entry-point.ts";

const PROTOCOL = "claude-build-diff/v1";

/** git が非ゼロで終了した。message はその stderr。 */
class GitFailed extends Error {}

/** -z 区切りの stdout をパスの一覧にする。-z は名前に空白や非 ASCII を含むパスの引用符を
 * 外す。非ゼロ終了で GitFailed を投げる。message はプロセスの stderr (trim 済み)。git が
 * stderr に何も書かなかったときは "git <subcommand> exited <code>" にフォールバックする。 */
function gitPaths(repo: string, args: readonly string[]): string[] {
  const result = spawnSync("git", ["-C", repo, ...args, "-z"], { encoding: "utf8" });
  if (result.status !== 0) {
    const stderr = (result.stderr ?? "").trim();
    throw new GitFailed(stderr || `git ${args[0]} exited ${result.status}`);
  }
  return result.stdout.split("\0").filter((path) => path !== "");
}

/** `payload[key]` を trim した値。非空文字列のとき。それ以外は、値が欠けている・文字列でない・
 * 空白のときに Python 版 required_string が出す message。 */
function requiredString(payload: Record<string, unknown>, key: string): string | { error: string } {
  const value = payload[key];
  if (typeof value !== "string" || value.trim() === "") {
    return { error: `${key} must be a non-empty string` };
  }
  return value.trim();
}

interface ListFilesResult {
  protocol: string;
  files: string[] | null;
  base: string;
  error: string;
}

/** `repo` に対する `git diff <base> --name-only` と `git ls-files --others
 * --exclude-standard` の和集合。repo-root からの相対パス、重複除去、ソート済み。どちらかの
 * git 呼び出しが失敗したときは `files` が null になり、その stderr を `error` に載せる。
 *
 * base と作業ツリーの差分はコミット済みも未コミットも 1 つの diff に入る。未追跡ファイルは
 * diff に現れないので ls-files で足す。--exclude-standard は status と同じ ignore 規則。 */
export function listFiles(repo: string, base: string): ListFilesResult {
  try {
    const changed = gitPaths(repo, ["diff", base, "--name-only"]);
    const untracked = gitPaths(repo, ["ls-files", "--others", "--exclude-standard"]);
    return {
      protocol: PROTOCOL,
      files: [...new Set([...changed, ...untracked])].sort(),
      base,
      error: "",
    };
  } catch (error) {
    if (error instanceof GitFailed) {
      return { protocol: PROTOCOL, files: null, base, error: error.message };
    }
    throw error;
  }
}

export function main(): number {
  const raw = readFileSync(0, "utf8");
  const parsed = parseJson(raw);
  if ("error" in parsed) {
    process.stderr.write(`stdin is not valid JSON: ${parsed.error}\n`);
    return 1;
  }
  const payload = parsed.value;
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    process.stderr.write("payload must be a JSON object\n");
    return 1;
  }
  const record = payload as Record<string, unknown>;
  const repo = requiredString(record, "repo");
  if (typeof repo !== "string") {
    process.stderr.write(`${repo.error}\n`);
    return 1;
  }
  if (!isAbsolute(repo)) {
    process.stderr.write("repo must be an absolute path\n");
    return 1;
  }
  const base = requiredString(record, "base");
  if (typeof base !== "string") {
    process.stderr.write(`${base.error}\n`);
    return 1;
  }

  process.stdout.write(`${JSON.stringify(listFiles(repo, base), null, 2)}\n`);
  return 0;
}

if (isMainModule(import.meta.url)) {
  process.exit(main());
}
