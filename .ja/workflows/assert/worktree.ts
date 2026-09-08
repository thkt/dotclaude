#!/usr/bin/env node
/// <reference types="node" />
// Usage:
//   worktree.ts <session-id>             assert worktree を新規作成する
//   worktree.ts --cleanup <session-id>   assert worktree とその branch を削除する
//
// branch と path は session id から導出するため、作成と cleanup が drift しない。
// branch = assert-<id>、path = .claude/worktrees/assert-<id>。git はプロセスの cwd
// (repo root) から実行するため、path はそこからの相対。
//
// 作成はまず古い worktree と branch を除去し、続けて HEAD から新規に add する。
//
// stdout (create):  JSON {branch, path, status: "created"}
// stdout (cleanup): JSON {branch, path, status: "removed"}
// 作成失敗時: JSON {branch, path, status: "error", reason, stderr}、exit 1 (呼び出し側は
// これを worktree_ok: false にし、workflows/assert.js の envFail が env failure として読む
// -- #656)。cleanup は best-effort で、古い状態の除去失敗は無視し run を失敗させない。
// argv の形が `<session-id>` にも `--cleanup <session-id>` にも合わないときは、上記の
// usage 行を stderr に出して exit 1。
//
// 置き換え元の Python 版 assert worktree manager の TypeScript 移植。Contract: この CLI
// 自身の挙動。workflows/assert/tests/worktree.test.ts が、固定 fixture
// workflows/assert/tests/fixtures/worktree-cases.json に対してエンドツーエンドで検査する。
import { spawnSync } from "node:child_process";
import { isMainModule } from "../_lib/entry-point.ts";

/** 1 つのコマンドを実行し、その exit status と stderr を返す。test が実際の spawn の代わりに
 * fake を注入できるよう、create/cleanup はこの seam 越しに呼ぶ。退役した Python 版 worktree manager の
 * `Runner = Callable[[Sequence[str]], tuple[int, str]]` に対応する。 */
export type Runner = (cmd: readonly string[]) => { status: number; stderr: string };

/** `cmd[0]` を `cmd.slice(1)` とともに起動し、stderr を text として capture する。
 * 退役した Python 版 worktree manager の `_real_runner` に対応する。そちらは `subprocess.run(cmd,
 * capture_output=True, text=True, check=False)` を実行し `(returncode, stderr)` を
 * 返す。 */
function realRunner(cmd: readonly string[]): { status: number; stderr: string } {
  const result = spawnSync(cmd[0], cmd.slice(1), { encoding: "utf8" });
  return { status: result.status ?? 1, stderr: result.stderr ?? "" };
}

/** session id から導出した branch と worktree path: `assert-<id>` と
 * `.claude/worktrees/assert-<id>`。これにより create と cleanup が互いに drift しない。 */
export function paths(sessionId: string): { branch: string; path: string } {
  return { branch: `assert-${sessionId}`, path: `.claude/worktrees/assert-${sessionId}` };
}

/** 前回の run から残った worktree と branch を除去する。エラーは無視する: 古い状態の除去に
 * 失敗しても run を失敗させてはならない。退役した Python 版 worktree manager の `_remove` に対応する。 */
function removeStale(branch: string, path: string, runner: Runner): void {
  runner(["git", "worktree", "remove", path, "--force"]);
  runner(["git", "branch", "-D", branch]);
}

/** `sessionId` に対する古い worktree/branch を除去し、続けて HEAD から新規の worktree を
 * 追加する。失敗時は、throw する代わりに返す object が `status: "error"` を持ち、exit code を
 * `reason` に、git の stderr を添える -- それを `main` が exit 1 に変換する。 */
export function create(
  sessionId: string,
  runner: Runner = realRunner,
): Record<string, unknown> {
  const { branch, path } = paths(sessionId);
  removeStale(branch, path, runner);
  const { status, stderr } = runner(["git", "worktree", "add", "-b", branch, path, "HEAD"]);
  if (status !== 0) {
    return {
      branch,
      path,
      status: "error",
      reason: `env:worktree-add-exit-${status}`,
      stderr: stderr.trim(),
    };
  }
  return { branch, path, status: "created" };
}

/** `sessionId` の worktree と branch を除去する。`create` の古い状態除去と同じく
 * best-effort: 失敗を報告することは無い。 */
export function cleanup(
  sessionId: string,
  runner: Runner = realRunner,
): Record<string, unknown> {
  const { branch, path } = paths(sessionId);
  removeStale(branch, path, runner);
  return { branch, path, status: "removed" };
}

/** 退役した Python 版 worktree manager の `main` に対応する argv dispatch: `--cleanup <id>` は cleanup を、
 * `<id>` は create を実行し、それ以外は usage 行を stderr に出す。usage の文言は冒頭の
 * header comment と同じくこの script 自身の現在の entry point (worktree.ts) を名指す --
 * 退役した manager はもう比較対象として存在しないため、その名前を保ったままでは呼び出し側を
 * 誤導する (U-005)。 */
export function main(): number {
  const args = process.argv.slice(2);
  if (args.length === 2 && args[0] === "--cleanup") {
    process.stdout.write(`${JSON.stringify(cleanup(args[1]))}\n`);
    return 0;
  }
  if (args.length === 1 && !args[0].startsWith("-")) {
    const result = create(args[0]);
    process.stdout.write(`${JSON.stringify(result)}\n`);
    return result.status === "error" ? 1 : 0;
  }
  process.stderr.write("Usage: worktree.ts <session-id> | worktree.ts --cleanup <session-id>\n");
  return 1;
}

if (isMainModule(import.meta.url)) {
  process.exit(main());
}
