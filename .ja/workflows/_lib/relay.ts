/// <reference types="node" />
// Usage: relay.ts <digest> [--spec <file>] [--projects <dir>]
//        relay.ts <digest> --replay <relay_check>
//
// workflow script が実行させたいコマンドを実行し、その結果を 1 行の JSON で出力する。
// script はコマンドをデータ (spec) として宣言し、中継 agent の prompt の `RELAY_SPEC <digest>` と
// `RELAY_SPEC_END` の間に置く。agent は digest を付けてこのコマンドを実行し、これが agent の transcript から
// spec を読み戻す。agent はコマンドを写さない。script を自分で評価する host は、agent を介さずに runSpec を直接呼ぶ。
//
// spec は {defaults, steps}。defaults は、どの step も設定しなかった欄の値になる。
// step は {sh, cwd?, stdin?, timeout_ms?, when?, set?, append?}:
//   sh          /bin/sh -c に渡す 1 行
//   when        挙げた欄がすべてその値のときだけ、step を実行する
//   set         欄 <- source。source は次のどれか
//                 exit        終了コード。起動できなかったか時間切れなら -1
//                 ok          終了コードが 0 か
//                 out         stdout から最後の改行を除いたもの
//                 last        stdout の、空でない最後の行
//                 timed_out   timeout_ms を超えて走ったか
//                 tail:N      stdout と stderr を届いた順に並べた末尾 N 行
//                 fail_tail:N 終了コードが 0 でないときは同じもの、0 なら空文字
//   append      list の欄 <- source を足す
// 名前が `_` で始まる欄は、when を通して後の step の進め方を決めるだけで、出力しない。
//
// stdout は 1 行の JSON:
//   {...fields, relay_check}    すべての step を実行した。relay_check は欄の digest で、agent が欄を返すときに
//                               1 文字でも変えたら script が気づける
//   {"relay_continue": true}    次の step がこの呼び出しに収まらないかもしれない。同じコマンドをもう一度実行する
//   {"relay_missing": "..."}    その digest の spec が見つからない、またはファイルの digest が違う。step は 1 つも
//                               実行していないので、agent は spec をファイルで渡す
//   {"relay_error": "..."}      行が Bash 呼び出しの返せる長さを超える、または実行そのものが失敗した。step は実行済みの
//                               ことがあるので、agent は spec を実行し直さない
// exit 0。relay_missing と relay_error のときは 1。
//
// 呼び出しは、spec を運んだ transcript の agent のものである。その agent がコマンドをもう一度実行すると、前の呼び出しが
// 止まった所から続きを実行する。すべての step を実行した後なら同じ行を返す。1 つの agent に対して、step は 2 度実行
// されない。同じ spec を持つ別の agent は、最初の step から始める。--replay は、その spec のすべての step を実行した
// 最後の呼び出しの行を出力するだけで、何も実行しない。agent が返した欄が relay_check を持たないときに script が求める。
// --replay にはその agent が返した relay_check を付け、残っている行の check がそれと違えば返さない。呼び出しは
// 始まるときに残っている行を消す。
import { spawn } from "node:child_process";
import { existsSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { isMainModule } from "./entry-point.ts";
import { defaultProjects, digest, recentPrompts } from "./transcript.ts";

type Value = string | number | boolean | number[];
type Fields = Record<string, Value>;
interface Step {
  sh: string;
  cwd?: string;
  stdin?: string;
  timeout_ms?: number;
  when?: Fields;
  set?: Record<string, string>;
  append?: Record<string, string>;
}
export interface Spec {
  defaults: Fields;
  steps: Step[];
}

const STEP_TIMEOUT_MS = 100_000;
// agent は、Bash tool の timeout を上限の 600 秒にしてこれを実行する。呼び出しは、残り時間を超えて走りうる step の
// 手前で止まる。tool に止められる前に、必ず自分の 1 行を出力するため。
// この変数は、10 分待てないテストのためにある。
const CALL_BUDGET_MS = Number(process.env.RELAY_CALL_BUDGET_MS) || 590_000;
// 途中で落ちた呼び出しが残したファイルを、後の呼び出しが拾わないようにする。
const STATE_MAX_AGE_MS = 15 * 60 * 1000;
// Bash 呼び出しが返すのは約 30,000 文字。それより長い行は、途中で切れて agent に届く。
const MAX_LINE = 28_000;
const BLOCK = /RELAY_SPEC ([0-9a-f]{8}:\d+)\n\s*(\S[^\n]*)\n\s*RELAY_SPEC_END/g;

// key を並べ替えるので、digest は agent が欄を返す順番によらない。
export const canonical = (fields: Record<string, unknown>): string =>
  JSON.stringify(
    Object.fromEntries(
      Object.keys(fields)
        .sort()
        .map((key) => [key, fields[key]]),
    ),
  );

export const publicFields = (fields: Fields): Fields =>
  Object.fromEntries(Object.entries(fields).filter(([key]) => !key.startsWith("_")));

const lastLines = (text: string, count: number): string =>
  text.replace(/\n+$/, "").split("\n").slice(-count).join("\n");
// 末尾は文字数でも切る。minify されたエラーの 80 行や、復帰文字で描いた進捗バーは Bash 呼び出しの返せる長さを超える。
// 失敗した check は、末尾を持って修正へ届かなければならない。
const TAIL_MAX_CHARS = 6000;
const tailOf = (text: string, count: number): string => lastLines(text, count).slice(-TAIL_MAX_CHARS);

interface Ran {
  exit: number;
  timedOut: boolean;
  stdout: string;
  // stdout と stderr を、chunk が届いた順に並べたもの。
  combined: string;
}

// コマンドは自分の process group で走る。時間切れは group 全体を終わらせるので、複合コマンドの子が、step を報告した後に
// worktree へ書き込み続けることは無い。
// step は自分の process group で走るので、この process への signal は step に届かない。実行中の step の group を
// 先に終わらせ、この process が消えた後に worktree へ書き込み続けるものを残さない。spec を自分の process で実行する
// host (claude-run.ts) も、同じ方法で終わらせる。
const runningGroups = new Set<number>();
export const endRunningGroups = () => {
  for (const group of runningGroups) {
    try {
      process.kill(-group, "SIGTERM");
    } catch {
      // すでに終わっている
    }
  }
};
const endGroupOnSignal = () => {
  for (const name of ["SIGTERM", "SIGINT", "SIGHUP"] as const) {
    process.on(name, () => {
      endRunningGroups();
      process.exit(143);
    });
  }
};

const runStep = (step: Step): Promise<Ran> =>
  new Promise((resolve) => {
    const child = spawn("/bin/sh", ["-c", step.sh], { cwd: step.cwd, detached: true });
    const group = child.pid ?? 0;
    if (group) runningGroups.add(group);
    const ran: Ran = { exit: -1, timedOut: false, stdout: "", combined: "" };
    const signal = (name: NodeJS.Signals) => {
      try {
        if (child.pid) process.kill(-child.pid, name);
      } catch {
        // group はもう無い。
      }
    };
    const timer = setTimeout(() => {
      ran.timedOut = true;
      signal("SIGTERM");
      setTimeout(() => signal("SIGKILL"), 2000).unref();
    }, step.timeout_ms ?? STEP_TIMEOUT_MS);
    child.stdout.setEncoding("utf8").on("data", (chunk: string) => {
      ran.stdout += chunk;
      ran.combined += chunk;
    });
    child.stderr.setEncoding("utf8").on("data", (chunk: string) => {
      ran.combined += chunk;
    });
    child.stdin.on("error", () => {});
    child.stdin.end(step.stdin ?? "");
    child.on("error", () => {
      clearTimeout(timer);
      runningGroups.delete(group);
      resolve(ran);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      runningGroups.delete(group);
      resolve({ ...ran, exit: ran.timedOut || code === null ? -1 : code });
    });
  });

const pick = (ran: Ran, source: string): Value => {
  if (source === "exit") return ran.exit;
  if (source === "ok") return ran.exit === 0;
  if (source === "timed_out") return ran.timedOut;
  if (source === "out") return ran.stdout.replace(/\n$/, "");
  if (source === "last") return lastLines(ran.stdout, 1);
  const tail = /^(fail_)?tail:(\d+)$/.exec(source);
  if (!tail) throw new Error(`unknown source "${source}"`);
  return tail[1] && ran.exit === 0 ? "" : tailOf(ran.combined, Number(tail[2]));
};

const holds = (when: Fields | undefined, fields: Fields): boolean =>
  !when || Object.entries(when).every(([key, value]) => fields[key] === value);

// from 番目の step から実行して欄を返す。fits が「呼び出し側の残り時間に収まらないかもしれない」と答えた step の
// 手前で止まり、その番号を返す。
export const runSpec = async (
  spec: Spec,
  from = 0,
  seed: Fields = { ...spec.defaults },
  fits: (step: Step, index: number) => boolean = () => true,
  ran: (next: number, fields: Fields) => void = () => {},
): Promise<{ fields: Fields; next: number }> => {
  const fields = { ...seed };
  for (let index = from; index < spec.steps.length; index += 1) {
    const step = spec.steps[index];
    if (!holds(step.when, fields)) continue;
    if (!fits(step, index)) return { fields, next: index };
    const result = await runStep(step);
    for (const [field, source] of Object.entries(step.set ?? {})) fields[field] = pick(result, source);
    for (const [field, source] of Object.entries(step.append ?? {}))
      fields[field] = [...((fields[field] as number[] | undefined) ?? []), pick(result, source) as number];
    ran(index + 1, fields);
  }
  return { fields, next: spec.steps.length };
};

const readSpec = (text: string, wanted: string): Spec | null =>
  digest(text) === wanted ? (JSON.parse(text) as Spec) : null;

// spec と、それが属する呼び出し元。呼び出し元は、spec を運んだ transcript。
const specInTranscript = (
  projects: string,
  wanted: string,
): { spec: Spec; caller: string } | null => {
  for (const { transcript, text } of recentPrompts(projects, "RELAY_SPEC")) {
    for (const [, named, json] of text.matchAll(BLOCK)) {
      if (named !== wanted) continue;
      const spec = readSpec(json, wanted);
      if (spec) return { spec, caller: transcript };
    }
  }
  return null;
};

const flag = (argv: string[], name: string): string | undefined => {
  const at = argv.indexOf(name);
  return at < 0 ? undefined : argv[at + 1];
};

type State = { next: number; fields: Fields } | { done: string; code?: number };
const fresh = (path: string): boolean =>
  existsSync(path) && Date.now() - statSync(path).mtimeMs <= STATE_MAX_AGE_MS;
// step は実行済みなので、ファイルを書けないことで結果を失ってはならない。
const keep = (path: string, text: string): boolean => {
  try {
    writeFileSync(path, text);
    return true;
  } catch {
    return false;
  }
};

// spec と、それが属する呼び出し元。見つからなければその理由。ファイルで渡された spec は、そのファイルを書いた agent のものである。
const findSpec = (argv: string[], wanted: string): { spec: Spec; caller: string } | string => {
  const specFile = flag(argv, "--spec");
  if (!specFile) {
    return (
      specInTranscript(flag(argv, "--projects") ?? defaultProjects(), wanted) ??
      `no recent agent transcript opens with a spec of digest ${wanted}`
    );
  }
  if (!existsSync(specFile)) return `the spec file ${specFile} cannot be read`;
  const spec = readSpec(readFileSync(specFile, "utf8"), wanted);
  return spec
    ? { spec, caller: `${specFile}@${statSync(specFile).mtimeMs}` }
    : `the spec in ${specFile} does not have the digest ${wanted}`;
};

// 1 つの呼び出し元の 1 回の呼び出し。その呼び出し元の前の呼び出しが止まった所から続け、出力する行を返す。
const runCall = async (
  spec: Spec,
  statePath: string,
  keptPath: string,
): Promise<{ line: string; code: number }> => {
  const state: State = fresh(statePath)
    ? (JSON.parse(readFileSync(statePath, "utf8")) as State)
    : { next: 0, fields: { ...spec.defaults } };
  if ("done" in state) return { line: state.done, code: state.code ?? 0 };
  if (state.next === 0) rmSync(keptPath, { force: true });

  const started = Date.now();
  let saved = true;
  // 呼び出しの最初の step は必ず実行する。残り時間より長い step が 1 つあっても、先へ進むため。状態を保存できなかった
  // ときは、止まらずに実行を続ける。止まると、実行済みの step を失う。
  const fits = (step: Step, index: number) =>
    index === state.next ||
    !saved ||
    Date.now() - started + (step.timeout_ms ?? STEP_TIMEOUT_MS) <= CALL_BUDGET_MS;
  let from = state.next;
  let fields = state.fields;
  while (from < spec.steps.length) {
  // step が終わるたびに残す。step の途中で終わらされた呼び出しはその step から続け、それより前の step を
  // 2 度実行しない。
    const ran = await runSpec(spec, from, fields, fits, (next, reached) => {
      keep(statePath, JSON.stringify({ next, fields: reached }));
    });
    ({ fields } = ran);
    from = ran.next;
    if (from >= spec.steps.length) break;
    saved = keep(statePath, JSON.stringify({ next: from, fields }));
    if (saved) return { line: `${JSON.stringify({ relay_continue: true })}\n`, code: 0 };
  }

  const shown = publicFields(fields);
  const line = `${JSON.stringify({ ...shown, relay_check: digest(canonical(shown)) })}\n`;
  if (line.length > MAX_LINE) {
    const relay_error = `the result is ${line.length} characters, more than a Bash call returns. A field has to be bounded by its command`;
    const refused = `${JSON.stringify({ relay_error })}\n`;
  // step は実行済み。同じ呼び出し元がコマンドをもう一度実行しても、この行を返すだけで何も実行し直さない。
    keep(statePath, JSON.stringify({ done: refused, code: 1 }));
    return { line: refused, code: 1 };
  }
  keep(statePath, JSON.stringify({ done: line }));
  keep(keptPath, line);
  return { line, code: 0 };
};

async function main(argv: string[]): Promise<number> {
  const fail = (relay_error: string) => {
    process.stdout.write(`${JSON.stringify({ relay_error })}\n`);
    return 1;
  };
  const wanted = argv[0] ?? "";
  if (!/^[0-9a-f]{8}:\d+$/.test(wanted)) {
    return fail("usage: relay.ts <digest> [--spec <file>] [--projects <dir>]");
  }
  const name = wanted.replace(":", "-");
  const keptPath = join(tmpdir(), `relay-${name}.out.json`);
  if (argv.includes("--replay")) {
    if (!fresh(keptPath)) return fail(`no result of ${wanted} is kept`);
    const kept = readFileSync(keptPath, "utf8");
    // 行は、それを見た agent にだけ返す。agent が名乗る check が、この行の持つ check であること。同じ spec の別の
    // 呼び出しが残した行は返さない。
    const check = flag(argv, "--replay");
    if ((JSON.parse(kept) as { relay_check?: string }).relay_check !== check)
      return fail(`the kept result of ${wanted} does not carry the check ${String(check)}`);
    process.stdout.write(kept);
    return 0;
  }
  const found = findSpec(argv, wanted);
  if (typeof found === "string") {
    process.stdout.write(`${JSON.stringify({ relay_missing: found })}\n`);
    return 1;
  }
  const statePath = join(tmpdir(), `relay-${name}-${digest(found.caller).replace(":", "-")}.json`);
  const { line, code } = await runCall(found.spec, statePath, keptPath);
  process.stdout.write(line);
  return code;
}

if (isMainModule(import.meta.url)) {
  endGroupOnSignal();
  main(process.argv.slice(2)).then(
    (code) => process.exit(code),
    (error) => {
      process.stdout.write(`${JSON.stringify({ relay_error: `the run failed: ${String(error)}` })}\n`);
      process.exit(1);
    },
  );
}
