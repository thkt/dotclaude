#!/usr/bin/env node
/// <reference types="node" />
// Usage: bootstrap.ts <worktree-path>
//
// <worktree-path> 内のプロジェクト種別を検出し、依存を install して build smoke test を
// 実行する。ステップごとの timeout (install 180s、build 600s) は runner 自身が課すため、
// timeout(1) が無いプラットフォーム (macOS 等) でも結果が成立する。
//
// stdout: JSON {project_type, install, build, install_cmd, build_cmd, reason}
//   install: ok | fail | skip   (skip = そのプロジェクト種別に依存ステップが無い)
//   build:   pass | fail | skipped
// exit 0 は完走した run (verdict は JSON から読む)、exit 1 は usage / path エラー。
//
// Gate routing: workflows/assert.js の envFail/dynamicOk の 2 定数が経路を決める -- #656。
// 三値は build 単独ではなく (install, build) の組で決まる:
//
//   install=fail    + build=skipped -> env 失敗          -> Ready (caveat) 経路
//   install=ok      + build=fail    -> build smoke 破損  -> NotReady
//   install=ok/skip + build=skipped -> build 概念なし    -> 通常どおり前進
//   install=ok/skip + build=pass    -> 問題なし          -> 通常どおり前進
//
// build 開始後に発火した build timeout は build=fail として報告する。ハングした build は
// 壊れた build と区別できず、環境起因として扱うと Ready (caveat) に達してしまう
// (workflows/assert.js の envFail は install/worktree のみで定義され、build を含まない)。
//
// 置き換え元の Python 版 assert bootstrap runner の TypeScript 移植。Contract: この CLI 自身の
// 挙動。workflows/assert/tests/bootstrap.test.ts が、固定 fixture
// workflows/assert/tests/fixtures/bootstrap-cases.json に対してエンドツーエンドで検査する。
import { spawnSync } from "node:child_process";
import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { isMainModule } from "../_lib/entry-point.ts";

const INSTALL_TIMEOUT = 180;
const BUILD_TIMEOUT = 600;

// この順で最初に一致したものが勝つ。この順序自体が正典であり、外部の文書には依らない。
// 退役した Python 版 bootstrap script の `PROJECT_MARKERS` に対応する。
const PROJECT_MARKERS: ReadonlyArray<readonly [marker: string, ptype: string]> = [
  ["package.json", "node"],
  ["Cargo.toml", "rust"],
  ["Makefile", "make"],
  ["Taskfile.yml", "task"],
  ["pyproject.toml", "python"],
  ["Gemfile", "ruby"],
];

// 最初に一致した lock file のコマンドが勝つ。退役した Python 版 bootstrap script の `NPM_LOCK_COMMANDS` に対応する。
const NPM_LOCK_COMMANDS: ReadonlyArray<readonly [lock: string, cmd: readonly string[]]> = [
  ["bun.lockb", ["bun", "install", "--frozen-lockfile"]],
  ["bun.lock", ["bun", "install", "--frozen-lockfile"]],
  ["pnpm-lock.yaml", ["pnpm", "install", "--frozen-lockfile"]],
  ["yarn.lock", ["yarn", "install", "--frozen-lockfile"]],
  ["package-lock.json", ["npm", "ci"]],
];
const NPM_INSTALL_DEFAULT: readonly string[] = ["npm", "install"];

// null はその種別に依存ステップが無いことを表す。退役した Python 版 bootstrap script の `INSTALL_COMMANDS` に対応する。
const INSTALL_COMMANDS: Record<string, readonly string[] | null> = {
  rust: ["cargo", "fetch"],
  make: null,
  task: null,
  python: ["pip", "install", "-e", "."],
  ruby: ["bundle", "install"],
};

// null はその種別に build 概念が無いことを表す (build=skipped、前進)。退役した Python 版 bootstrap script の
// `BUILD_COMMANDS` に対応する。
const BUILD_COMMANDS: Record<string, readonly string[] | null> = {
  rust: ["cargo", "build"],
  make: ["make", "build"],
  task: ["task", "build"],
  python: null,
  ruby: null,
};

/** runner の結果を実在の exit code ではなく "timed out" として印付けし、timeout 経路が通常の
 * status と同じ戻り値型を通れるようにする -- int の sentinel は実在の exit code と衝突する。
 * 退役した Python 版 bootstrap script の `TIMED_OUT = object()` に対応する。 */
export const TIMED_OUT: unique symbol = Symbol("bootstrap-timed-out");

/** `cwd` で 1 つのコマンドを実行し、その exit status、`timeoutSeconds` 後の TIMED_OUT、または
 * バイナリが見つからないときの 127 を返す。test が実際の spawn の代わりに fake を注入できる
 * よう、`run` はこの seam 越しに呼ぶ。退役した Python 版 bootstrap script の `Runner = Callable[[Sequence[str], Path,
 * int], object]` に対応する。 */
export type Runner = (
  cmd: readonly string[],
  cwd: string,
  timeoutSeconds: number,
) => number | typeof TIMED_OUT;

/** `cwd` で `cmd[0]` を `cmd.slice(1)` とともに起動し、何も capture しない (呼び出し側は
 * exit status しか読まない)。退役した Python 版 bootstrap script の `_real_runner` に対応する。 */
function realRunner(cmd: readonly string[], cwd: string, timeoutSeconds: number): number | typeof TIMED_OUT {
  const result = spawnSync(cmd[0], cmd.slice(1), { cwd, timeout: timeoutSeconds * 1000 });
  if (result.error && (result.error as NodeJS.ErrnoException).code === "ETIMEDOUT") {
    return TIMED_OUT;
  }
  if (result.error) {
    return 127;
  }
  return result.status ?? 127;
}

/** `path` が通常ファイルを指すかどうか。directory や存在しない path では false。 */
function isFile(path: string): boolean {
  try {
    return statSync(path).isFile();
  } catch {
    return false;
  }
}

/** PROJECT_MARKERS の順序で `worktree` が持つ最初のマーカーファイルが表すプロジェクト種別、
 * どれも一致しなければ null。退役した Python 版 bootstrap script の `detect_project_type` に対応する。 */
export function detectProjectType(worktree: string): string | null {
  for (const [marker, ptype] of PROJECT_MARKERS) {
    if (isFile(join(worktree, marker))) {
      return ptype;
    }
  }
  return null;
}

/** `worktree` 内の `ptype` に対する依存 install コマンド、その種別に依存ステップが無ければ
 * null。退役した Python 版 bootstrap script の `install_command` に対応する。 */
export function installCommand(worktree: string, ptype: string): readonly string[] | null {
  if (ptype === "node") {
    for (const [lock, cmd] of NPM_LOCK_COMMANDS) {
      if (isFile(join(worktree, lock))) {
        return cmd;
      }
    }
    return NPM_INSTALL_DEFAULT;
  }
  return INSTALL_COMMANDS[ptype] ?? null;
}

/** `worktree` の package.json が空でない `scripts.build` を宣言しているかどうか。
 * 退役した Python 版 bootstrap script の `_has_npm_build_script` に対応する: package.json が無い・parse できない、
 * または scripts.build が無い・空のときは、いずれも throw ではなく false として読む。 */
function hasNpmBuildScript(worktree: string): boolean {
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(join(worktree, "package.json"), "utf8"));
  } catch {
    return false;
  }
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return false;
  }
  const scripts = (raw as Record<string, unknown>).scripts;
  if (typeof scripts !== "object" || scripts === null || Array.isArray(scripts)) {
    return false;
  }
  return Boolean((scripts as Record<string, unknown>).build);
}

/** `worktree` 内の `ptype` に対する build-smoke コマンド、その種別に build 概念が無ければ
 * null。退役した Python 版 bootstrap script の `build_command` に対応する。 */
export function buildCommand(worktree: string, ptype: string): readonly string[] | null {
  if (ptype === "node") {
    return hasNpmBuildScript(worktree) ? ["npm", "run", "build"] : null;
  }
  return BUILD_COMMANDS[ptype] ?? null;
}

interface BootstrapResult {
  project_type: string | null;
  install: string;
  build: string;
  install_cmd: string | null;
  build_cmd: string | null;
  reason: string;
}

/** `worktree` のプロジェクト種別を検出し、依存を install し、build smoke を実行して、各
 * ステップの結果を返す object に載せる -- ステップの失敗では決して throw せず、結果に載る。
 * 退役した Python 版 bootstrap script の `run` に対応する。 */
export function run(worktree: string, runner: Runner = realRunner): BootstrapResult {
  const ptype = detectProjectType(worktree);
  const result: BootstrapResult = {
    project_type: ptype,
    install: "skip",
    build: "skipped",
    install_cmd: null,
    build_cmd: null,
    reason: "",
  };
  if (ptype === null) {
    result.reason = "project-type-unknown";
    return result;
  }

  const installCmd = installCommand(worktree, ptype);
  if (installCmd !== null) {
    result.install_cmd = installCmd.join(" ");
    const rc = runner(installCmd, worktree, INSTALL_TIMEOUT);
    if (rc === TIMED_OUT) {
      result.install = "fail";
      result.reason = "env:install-timeout";
      return result;
    }
    if (rc !== 0) {
      result.install = "fail";
      result.reason = `env:install-exit-${rc}`;
      return result;
    }
    result.install = "ok";
  }

  const buildCmd = buildCommand(worktree, ptype);
  if (buildCmd === null) {
    result.reason = "no-build-script";
    return result;
  }
  result.build_cmd = buildCmd.join(" ");
  const rc = runner(buildCmd, worktree, BUILD_TIMEOUT);
  if (rc === TIMED_OUT) {
    result.build = "fail";
    result.reason = "build-timeout";
    return result;
  }
  if (rc !== 0) {
    result.build = "fail";
    result.reason = `build-exit-${rc}`;
    return result;
  }
  result.build = "pass";
  return result;
}

/** `path` が directory を指すかどうか。file や存在しない path では false。 */
function isDirectory(path: string): boolean {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}

/** `result` を Python の `json.dumps` が flat dict に対して整形する形 -- `:` と `,` の後に
 * 必ず空白を 1 つ置く -- のまま serialize し、bootstrap.ts の stdout が 退役した Python 版 bootstrap script の stdout
 * と byte 単位で一致するようにする。`JSON.stringify` の compact な区切りではそうならない。
 * `run` の結果の各 field は string か null なので、値ごとの `JSON.stringify` (quoting/escaping
 * 用) と手動での結合だけで、汎用の pretty-printer に頼らずこの形全体をカバーできる。 */
function toPythonJson(result: BootstrapResult): string {
  const parts = Object.entries(result).map(
    ([key, value]) => `${JSON.stringify(key)}: ${JSON.stringify(value)}`,
  );
  return `{${parts.join(", ")}}`;
}

/** 退役した Python 版 bootstrap script の `main` に対応する argv dispatch: directory を指す `<worktree-path>` を
 * ちょうど 1 つ渡されたときだけ `run` を実行しその JSON 結果を出力する。それ以外は usage
 * 行を stderr に出して exit 1。usage 行は冒頭の header comment と同じくこの script 自身の
 * 現在の entry point (bootstrap.ts) を名指す -- 退役した script はもう比較対象として存在しない
 * ため、その名前を保ったままでは呼び出し側を誤導する (U-005)。 */
export function main(): number {
  const args = process.argv.slice(2);
  if (args.length !== 1) {
    process.stderr.write("Usage: bootstrap.ts <worktree-path>\n");
    return 1;
  }
  const [worktree] = args;
  if (!isDirectory(worktree)) {
    process.stderr.write(`Error: not a directory: ${worktree}\n`);
    return 1;
  }
  process.stdout.write(`${toPythonJson(run(worktree))}\n`);
  return 0;
}

if (isMainModule(import.meta.url)) {
  process.exit(main());
}
