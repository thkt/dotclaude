/// <reference types="node" />
// Usage: relay.ts <digest> [--spec <file>] [--projects <dir>]
//        relay.ts <digest> --replay
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
//                 tail:N      stdout と stderr を合わせた末尾 N 行
//                 fail_tail:N 終了コードが 0 でないときは同じもの、0 なら空文字
//   append      list の欄 <- source を足す
// 名前が `_` で始まる欄は、when を通して後の step の進め方を決めるだけで、出力しない。
//
// stdout は 1 行の JSON:
//   {...fields, relay_check}    すべての step を実行した。relay_check は欄の digest で、agent が欄を返すときに
//                               1 文字でも変えたら script が気づける
//   {"relay_continue": true}    次の step がこの呼び出しに収まらないかもしれない。同じコマンドをもう一度実行する
//   {"relay_error": "..."}      その digest の spec が見つからない、またはファイルの digest が違う
// exit 0。relay_error のときは 1。
//
// --replay は、その spec を最後まで実行したときに出力した行を出力するだけで、何も実行しない。agent が返した欄が
// relay_check を持たないときに script が求める。誤ったのは写しで、コマンドではないため。
import { spawnSync } from "node:child_process";
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
// agent は、Bash tool の timeout を上限の 600 秒にしてこれを実行する。呼び出しは、それを超えて走りうる step の
// 手前で止まる。tool に止められる前に、必ず自分の 1 行を出力するため。
// この変数は、9 分待てないテストのためにある。
const CALL_BUDGET_MS = Number(process.env.RELAY_CALL_BUDGET_MS) || 540_000;
// 途中で落ちた呼び出しが残した状態ファイルを、同じ spec の後の実行が拾わないようにする。
const STATE_MAX_AGE_MS = 15 * 60 * 1000;
const BLOCK = /RELAY_SPEC ([0-9a-f]{8}:\d+)\n\s*(\S.*)\n\s*RELAY_SPEC_END/g;

// key を並べ替えるので、digest は agent が欄を返す順番によらない。
export const canonical = (fields: Record<string, unknown>): string =>
  JSON.stringify(
    Object.fromEntries(
      Object.keys(fields)
        .sort()
        .map((key) => [key, fields[key]]),
    ),
  );

const publicFields = (fields: Fields): Fields =>
  Object.fromEntries(Object.entries(fields).filter(([key]) => !key.startsWith("_")));

const lastLines = (text: string, count: number): string =>
  text.replace(/\n+$/, "").split("\n").slice(-count).join("\n");

const runStep = (step: Step): ((source: string) => Value) => {
  const result = spawnSync("/bin/sh", ["-c", step.sh], {
    cwd: step.cwd,
    input: step.stdin,
    timeout: step.timeout_ms ?? STEP_TIMEOUT_MS,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  const timedOut = (result.error as NodeJS.ErrnoException | undefined)?.code === "ETIMEDOUT";
  const exit = timedOut || result.status === null ? -1 : result.status;
  const stdout = result.stdout ?? "";
  const combined = `${stdout}${result.stderr ?? ""}`;
  return (source) => {
    if (source === "exit") return exit;
    if (source === "ok") return exit === 0;
    if (source === "timed_out") return timedOut;
    if (source === "out") return stdout.replace(/\n$/, "");
    if (source === "last") return lastLines(stdout, 1);
    const tail = /^(fail_)?tail:(\d+)$/.exec(source);
    if (!tail) throw new Error(`unknown source "${source}"`);
    return tail[1] && exit === 0 ? "" : lastLines(combined, Number(tail[2]));
  };
};

const holds = (when: Fields | undefined, fields: Fields): boolean =>
  !when || Object.entries(when).every(([key, value]) => fields[key] === value);

// from 番目の step から実行して欄を返す。fits が「呼び出し側の残り時間に収まらないかもしれない」と答えた step の
// 手前で止まり、その番号を返す。
export const runSpec = (
  spec: Spec,
  from = 0,
  seed: Fields = { ...spec.defaults },
  fits: (step: Step, index: number) => boolean = () => true,
): { fields: Fields; next: number } => {
  const fields = { ...seed };
  for (let index = from; index < spec.steps.length; index += 1) {
    const step = spec.steps[index];
    if (!holds(step.when, fields)) continue;
    if (!fits(step, index)) return { fields, next: index };
    const pick = runStep(step);
    for (const [field, source] of Object.entries(step.set ?? {})) fields[field] = pick(source);
    for (const [field, source] of Object.entries(step.append ?? {}))
      fields[field] = [...((fields[field] as number[] | undefined) ?? []), pick(source) as number];
  }
  return { fields, next: spec.steps.length };
};

const readSpec = (text: string, wanted: string): Spec | null =>
  digest(text) === wanted ? (JSON.parse(text) as Spec) : null;

const specInTranscript = (projects: string, wanted: string): Spec | null => {
  for (const { text } of recentPrompts(projects, "RELAY_SPEC")) {
    for (const [, named, json] of text.matchAll(BLOCK)) {
      if (named !== wanted) continue;
      const spec = readSpec(json, wanted);
      if (spec) return spec;
    }
  }
  return null;
};

const flag = (argv: string[], name: string): string | undefined => {
  const at = argv.indexOf(name);
  return at < 0 ? undefined : argv[at + 1];
};

function main(argv: string[]): number {
  const print = (value: object) => process.stdout.write(`${JSON.stringify(value)}\n`);
  const wanted = argv[0] ?? "";
  if (!/^[0-9a-f]{8}:\d+$/.test(wanted)) {
    print({ relay_error: "usage: relay.ts <digest> [--spec <file>] [--projects <dir>]" });
    return 1;
  }
  const keptPath = join(tmpdir(), `relay-${wanted.replace(":", "-")}.out.json`);
  if (argv.includes("--replay")) {
    const kept = existsSync(keptPath) && Date.now() - statSync(keptPath).mtimeMs <= STATE_MAX_AGE_MS;
    if (!kept) {
      print({ relay_error: `no result of ${wanted} is kept` });
      return 1;
    }
    process.stdout.write(readFileSync(keptPath, "utf8"));
    return 0;
  }
  const specFile = flag(argv, "--spec");
  let spec: Spec | null;
  try {
    spec = specFile
      ? readSpec(readFileSync(specFile, "utf8"), wanted)
      : specInTranscript(flag(argv, "--projects") ?? defaultProjects(), wanted);
  } catch (error) {
    print({ relay_error: `the spec could not be read: ${String(error)}` });
    return 1;
  }
  if (!spec) {
    print({
      relay_error: specFile
        ? `the spec in ${specFile} does not have the digest ${wanted}`
        : `no recent agent transcript opens with a spec of digest ${wanted}`,
    });
    return 1;
  }

  const statePath = join(tmpdir(), `relay-${wanted.replace(":", "-")}.json`);
  const fresh =
    existsSync(statePath) && Date.now() - statSync(statePath).mtimeMs <= STATE_MAX_AGE_MS;
  const state = fresh
    ? (JSON.parse(readFileSync(statePath, "utf8")) as { next: number; fields: Fields })
    : { next: 0, fields: { ...spec.defaults } };
  const started = Date.now();
  // 呼び出しの最初の step は必ず実行する。残り時間より長い step が 1 つあっても、先へ進むため。
  const fits = (step: Step, index: number) =>
    index === state.next ||
    Date.now() - started + (step.timeout_ms ?? STEP_TIMEOUT_MS) <= CALL_BUDGET_MS;
  const { fields, next } = runSpec(spec, state.next, state.fields, fits);
  if (next < spec.steps.length) {
    writeFileSync(statePath, JSON.stringify({ next, fields }));
    print({ relay_continue: true });
    return 0;
  }
  rmSync(statePath, { force: true });
  const shown = publicFields(fields);
  const line = `${JSON.stringify({ ...shown, relay_check: digest(canonical(shown)) })}\n`;
  // 行を残しておく。agent が写し間違えた返り値を、step を実行し直さずにもう一度求められるようにするため。
  writeFileSync(keptPath, line);
  process.stdout.write(line);
  return 0;
}

if (isMainModule(import.meta.url)) {
  process.exit(main(process.argv.slice(2)));
}
