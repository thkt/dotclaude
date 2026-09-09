/// <reference types="node" />
// 退役した Python 版 dr_common の共有ヘルパーを TypeScript に移植したもの。形は
// skills/_lib/harness_hash.ts と同じ (named export のみ、default export は持たない)。この
// module 自身は CLI の入口を持たない -- pre-check.ts、validate-dr.ts、update-index.ts が
// それぞれこれを import する -- そのため呼び出す側の script が持つ skills-CLI の
// shebang + 100755 とは違い、shebang 無しの mode 100644 で置く。
//
// Contract: 退役した Python 版 dr_common の fail / resolve_dr_dir / guard_skill_dir /
// split_frontmatter。Python の snake_case な名前は TS 側では camelCase になる。
// harness_hash.py の _digest -> harness_hash.ts の digest で既に行ったのと同じリネームである。
//
// resolveDrDir はここでは純関数であり、git の exit が非 0 のときに自分で fail() を呼ぶ
// 退役した Python 版 resolve_dr_dir とは違う。env、CLI 引数、git-toplevel の spawn 結
// 果を明示的な引数としてすべて受け取り、3 つのどれも見つからなかった呼び出し側が、返っ
// てきた null をどう扱うかを決める。これにより git の spawn と process.exit という副作
// 用は、main() の Usage ヘッダーの契約が既に文書化している CLI 側の wrapper に留まり、
// この module 自身のテストが直接 import する helper の中には埋もれない。
import { existsSync, statSync } from "node:fs";
import { join } from "node:path";

/** 各行を stderr に書き、status 1 でプロセスを終了する。退役した Python 版 dr_common の
 * fail(*lines): print(*lines, sep="\n", file=sys.stderr); sys.exit(1) に対応する。 */
export function fail(...lines: string[]): never {
  process.stderr.write(`${lines.join("\n")}\n`);
  process.exit(1);
}

/** resolveDrDir が読む node:child_process の
 * spawnSync(str, ["rev-parse", "--show-toplevel"], { encoding: "utf8" }) 結果のフィールド。
 * SpawnSyncReturns<string> 全体ではなく一部だけを持つ型にしてあるので、呼び出し側は実際の
 * spawnSync が返す残り (pid、signal、output) をでっち上げずに fixture を組み立てられる。 */
export interface GitTopLevelResult {
  status: number | null;
  stdout: string;
  error?: Error;
}

/** Decision Record の archive directory を解決する: DR_DIR env、次に CLI 引数、次に
 * docs/decisions を繋げた git top level、の順で見る -- どれも当てはまらないときは null を
 * 返す。git の spawn 自体が起動できなかった場合 (status が null かつ error あり) や、
 * 非 0 で終了した場合も null になる。純関数であり、process.env を自分で読むことも git を
 * 自分で spawn することも、fail() を呼ぶこともない。 */
export function resolveDrDir(
  env: NodeJS.ProcessEnv,
  arg: string | undefined,
  gitTopLevel: GitTopLevelResult,
): string | null {
  if (env.DR_DIR) {
    return env.DR_DIR;
  }
  if (arg) {
    return arg;
  }
  if (gitTopLevel.status !== 0) {
    return null;
  }
  return join(gitTopLevel.stdout.trim(), "docs", "decisions");
}

/** path が存在し、かつ通常ファイルであるとき true。Python の Path.is_file() に対応する
 * (SKILL.md という名前のディレクトリは、それを持つことにはならない)。 */
function isFile(path: string): boolean {
  return existsSync(path) && statSync(path).isFile();
}

/** drDir が SKILL.md を持つとき (skill-definition directory であって Decision Record の
 * archive ではない)、hint を添えて fail する。退役した Python 版 dr_common の
 * guard_skill_dir に対応する。それ以外は通常どおり返る。 */
export function guardSkillDir(drDir: string, hint: string): void {
  if (isFile(join(drDir, "SKILL.md"))) {
    fail(
      `Error: ${drDir} contains SKILL.md (skill-definition directory,` +
        " not a Decision Record archive)",
      hint,
    );
  }
}

/** text を --- の区切りペアで (frontmatter の行, body の行) に分割する。退役した Python
 * 版 dr_common の split_frontmatter に対応する: 1 行目にある --- だけが fence を開く。先
 * 頭行以外の --- は区切りにしないので、fence を一度も開かなかったファイルの body に出て
 * くる --- を区切りと誤認することはない。 */
export function splitFrontmatter(text: string): [string[], string[]] {
  const lines = text.split("\n");
  const fence = /^---[ \t]*$/;
  if (lines.length === 0 || !fence.test(lines[0])) {
    return [[], lines];
  }
  for (let i = 1; i < lines.length; i++) {
    if (fence.test(lines[i])) {
      return [lines.slice(1, i), lines.slice(i + 1)];
    }
  }
  return [[], lines];
}
