/// <reference types="node" />
// workflow script (workflows/<name>.js) を、Claude Code の workflow 実行環境の外で実行する。
//
// Claude Code の中では script はコマンドを実行できないので、コマンドはすべて agent を通る (中継、DR-0126)。
// 中継の prompt はコマンドを spec として持つ。この host は relay.ts の runSpec でその spec を自分で実行するので、
// 中継に agent は要らない。spec を持たない agent() 呼び出し (実装・レビュー・修正・命名) は、1 つずつ
// `claude -p` の子 session に渡す。script の評価は、テストが使う run-workflow.ts の形である。
//
// Usage: claude-run.ts <workflow> --repo <abs path> [--issue N] [--base B] [--args <json>]
//                      [--state <file>] [--concurrency N]
// stdout: workflow の戻り値の JSON。stderr: log、phase、まとめの 1 行。
//
// --state は、agent() 呼び出しごとの結果を残すファイルを指す。同じファイルで始めた実行は、prompt と option が
// 同じ呼び出しに残っている結果を返し、何も実行しない。止まった実行はこの方法で再開する。同じファイルと、停止が
// 返した `retry` を --args に渡す (DR-0124)。
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { appendFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { makeSlots, parseArgv, resolveWorkflowPath } from "./codex-run.ts";
import { isMainModule } from "./entry-point.ts";
import { canonical, publicFields, runSpec } from "./relay.ts";
import type { Spec } from "./relay.ts";
import { runWorkflow } from "./run-workflow.ts";
import type { RunWorkflowStubs } from "./run-workflow.ts";
import { digest } from "./transcript.ts";

// workflow script が vm の境界を越えて渡す値、または子 session の返答から読んだ値。形は実行時に決まるので、
// この境界でだけ `any` にする。
type JsonValue = any;

interface AgentOptions {
  label?: string;
  model?: string;
  effort?: string;
  schema?: Record<string, unknown>;
}

// 子 session が尋ねずに使える tool。prompt が指す worktree で実装とレビューをするので、ファイルを編集し、
// コマンドを実行する。自分では agent も workflow も始めない。
const CHILD_TOOLS = "Bash,Read,Write,Edit,MultiEdit,Glob,Grep,LS";
// いちばん長い呼び出しは実装の session。上限はそれに合わせ、label ごとには分けない。
const CHILD_TIMEOUT_MS = Number(process.env.CLAUDE_RUN_TIMEOUT_MS) || 3_600_000;
// 並列に広げる script は、単位ごとに子を 1 つ始める。Claude Code は in-process の agent 数に上限を持つが、
// 子プロセスには上限が無い。
const DEFAULT_CONCURRENCY = 4;
const SPEC_BLOCK = /RELAY_SPEC ([0-9a-f]{8}:\d+)\n(.*)\nRELAY_SPEC_END/;

export interface ChildRun {
  prompt: string;
  model: string;
  effort: string | undefined;
  schema: Record<string, unknown> | undefined;
  cwd: string;
  timeoutMs: number;
  // 最初の返答が構造化された形でなかったときに、続きを行う session。
  resume?: string;
}
export interface ChildOutcome {
  code: number | null;
  stdout: string;
  stderr: string;
  timedOut: boolean;
}

const runClaudeOnce = ({ prompt, model, effort, schema, cwd, timeoutMs, resume }: ChildRun): Promise<ChildOutcome> =>
  new Promise((done) => {
    const argv = ["-p", "--model", model, "--output-format", "json", "--allowedTools", CHILD_TOOLS];
    if (effort) argv.push("--effort", effort);
    // session は作業を終え、文章で終わった。作業を知っている同じ session の中で、返答だけを求める。
    if (resume) argv.push("--resume", resume);
    if (schema) argv.push("--json-schema", JSON.stringify(schema));
    // 子だけに渡す設定。ブラウザーを使う check が動かない sandbox を外す、など。
    if (process.env.CLAUDE_RUN_SETTINGS) argv.push("--settings", process.env.CLAUDE_RUN_SETTINGS);
    const child = spawn("claude", argv, { cwd, stdio: ["pipe", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
    }, timeoutMs);
    child.stdout.setEncoding("utf8").on("data", (chunk: string) => {
      stdout += chunk;
    });
    child.stderr.setEncoding("utf8").on("data", (chunk: string) => {
      stderr += chunk;
    });
    child.on("error", (err) => {
      clearTimeout(timer);
      done({ code: -1, stdout, stderr: String(err.message), timedOut: false });
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      done({ code, stdout, stderr: stderr.slice(-4000), timedOut });
    });
    // prompt は stdin で渡す。Issue の本文を argv に載せない。
    child.stdin.on("error", () => {});
    child.stdin.end(prompt);
  });

// 結果を構造化された形で返さずに終わった session に伝える文。
const GIVE_REPLY =
  "Your work in this session is done. Give its result now through the structured output, in the shape the schema asks for. Do no further work.";

export interface Summary {
  relays: number;
  children: number;
  kept: number;
  cost_usd: number;
}

export interface HostOptions {
  repo: string;
  // 呼び出しごとの結果を残すファイル。その隣に、中継のコマンドが読む prompt を置く。
  state: string;
  concurrency?: number;
  onLog?: (message: string) => void;
  // テストが実際の子 session の代わりに差し込む口。
  runOnce?: (run: ChildRun) => Promise<ChildOutcome>;
}

const keyOf = (prompt: string, opts: AgentOptions): string =>
  createHash("sha256")
    .update(JSON.stringify([prompt, opts]))
    .digest("hex");

const readKept = (state: string): Map<string, JsonValue> => {
  const kept = new Map<string, JsonValue>();
  if (!existsSync(state)) return kept;
  for (const line of readFileSync(state, "utf8").split("\n")) {
    if (!line) continue;
    const { key, value } = JSON.parse(line) as { key: string; value: JsonValue };
    kept.set(key, value);
  }
  return kept;
};

// 中継の prompt が持つ spec。agent が答えるしかない prompt では null。
const specIn = (prompt: string): Spec | null => {
  const found = SPEC_BLOCK.exec(prompt);
  return found && digest(found[2]) === found[1] ? (JSON.parse(found[2]) as Spec) : null;
};

// 子 session の出力を、agent() が返す値にする。schema があれば構造化された返答、無ければ最後の文章。失敗した
// session は null で、これは Agent tool が落ちた agent に返す値と同じである。
const replyOf = (
  outcome: ChildOutcome,
  schema: unknown,
  label: string,
  onLog: (message: string) => void,
): { value: JsonValue; cost: number; unshaped?: string } => {
  const failed = (why: string) => {
    onLog(`[${label}] ${why}; the call returns null.`);
    return { value: null, cost: 0 };
  };
  if (outcome.timedOut) return failed("the child session was ended at its time limit");
  let reply: JsonValue;
  try {
    reply = JSON.parse(outcome.stdout);
  } catch {
    return failed(`the child session exited ${outcome.code} with no result. ${outcome.stderr.split("\n").slice(-3).join(" ")}`);
  }
  const cost = Number(reply.total_cost_usd) || 0;
  if (reply.is_error || outcome.code !== 0) {
    onLog(`[${label}] the child session ended as ${reply.subtype}; the call returns null.`);
    return { value: null, cost };
  }
  if (!schema) return { value: String(reply.result ?? "").trim(), cost };
  if (reply.structured_output === undefined || reply.structured_output === null) {
    onLog(`[${label}] the child session gave no reply in the schema's shape.`);
    return { value: null, cost, unshaped: String(reply.session_id ?? "") };
  }
  return { value: reply.structured_output, cost };
};

export function createHost({
  repo,
  state,
  concurrency = DEFAULT_CONCURRENCY,
  onLog = () => {},
  runOnce = runClaudeOnce,
}: HostOptions): { stubs: RunWorkflowStubs; summary: Summary } {
  const summary: Summary = { relays: 0, children: 0, kept: 0, cost_usd: 0 };
  const kept = readKept(state);
  const withSlot = makeSlots(concurrency);
  mkdirSync(dirname(state), { recursive: true });
  // 中継のコマンドは、それを実行する agent の prompt からデータを読むことがある (write-body.ts は PR 本文を
  // そう読む、DR-0125)。ここには agent がいないので、そのコマンドが探す場所に prompt を置く。RELAY_PROJECTS が
  // 指すディレクトリの下の、transcript の最初の行である。
  const transcripts = join(dirname(state), "projects", "claude-run", "host", "subagents");
  mkdirSync(transcripts, { recursive: true });
  process.env.RELAY_PROJECTS = join(dirname(state), "projects");
  const sessions = join(dirname(state), "sessions");
  mkdirSync(sessions, { recursive: true });
  let serial = 0;

  const relayed = async (prompt: string, spec: Spec): Promise<JsonValue> => {
    serial += 1;
    writeFileSync(
      join(transcripts, `agent-${serial}.jsonl`),
      `${JSON.stringify({ type: "user", message: { role: "user", content: prompt } })}\n`,
    );
    const { fields } = await runSpec(spec);
    const shown = publicFields(fields);
    summary.relays += 1;
    return { ...shown, relay_check: digest(canonical(shown)), relay_note: "" };
  };

  const answered = (prompt: string, opts: AgentOptions, label: string): Promise<JsonValue> =>
    withSlot(async () => {
      onLog(`[${label}] claude -p ${opts.model ?? "sonnet"}`);
      const run: ChildRun = {
        prompt,
        model: opts.model ?? "sonnet",
        effort: opts.effort,
        schema: opts.schema,
        cwd: repo,
        timeoutMs: CHILD_TIMEOUT_MS,
      };
      const session = async (asked: ChildRun, part: string) => {
        const outcome = await runOnce(asked);
      // session ごとの結果を残す。呼び出しが何も返さなかった理由と、かかった費用を読むため。
        serial += 1;
        writeFileSync(join(sessions, `${serial}-${label.replace(/[^\w.-]/g, "_")}${part}.json`), outcome.stdout);
        const reply = replyOf(outcome, opts.schema, label, onLog);
        summary.cost_usd += reply.cost;
        return reply;
      };
      summary.children += 1;
      const first = await session(run, "");
      if (!first.unshaped) return first.value;
      // session は作業を終えても、schema の形の返答を出さずに文章で終わることがある。作業は済んでいるので、
      // 作業ではなく返答だけを、その session でもう一度求める。
      const second = await session({ ...run, prompt: GIVE_REPLY, resume: first.unshaped }, "-reply");
      if (second.value === null) onLog(`[${label}] asked once more in the same session and got no reply; the call returns null.`);
      return second.value;
    });

  const stubs: RunWorkflowStubs = {};
  stubs.agent = async (prompt: string, opts: AgentOptions = {}) => {
    const label = opts.label || "agent";
    const key = keyOf(prompt, opts);
    if (kept.has(key)) {
      summary.kept += 1;
      return kept.get(key);
    }
    const spec = specIn(prompt);
    const value = spec ? await relayed(prompt, spec) : await answered(prompt, opts, label);
    // 何も返さなかった呼び出しは、再開のときにもう一度尋ねる。
    if (value !== null && value !== undefined) {
      kept.set(key, value);
      appendFileSync(state, `${JSON.stringify({ key, label, value })}\n`);
    }
    return value;
  };
  // 別の script を入れ子で呼ぶ script (build.js は code を呼ぶ) は、同じ host の上でそれを実行する。
  stubs.workflow = async (name: string, wfArgs: JsonValue) => {
    onLog(`[workflow] ${name}`);
    const nested = await runWorkflow(resolveWorkflowPath(name), {
      args: wfArgs,
      stubs,
      onLog,
      onPhase: (title) => onLog(`== ${name}: ${title}`),
    });
    return nested.result;
  };
  return { stubs, summary };
}

// --state はこの host だけの flag。残りは codex-run.ts が読む argv と同じ。
const takeState = (argv: string[]): { state: string | undefined; rest: string[] } => {
  const at = argv.indexOf("--state");
  return at < 0
    ? { state: undefined, rest: argv }
    : { state: argv[at + 1], rest: [...argv.slice(0, at), ...argv.slice(at + 2)] };
};

if (isMainModule(import.meta.url)) {
  const { state: named, rest } = takeState(process.argv.slice(2));
  const { name, args, concurrency } = parseArgv(rest);
  if (!name || typeof args.repo !== "string") {
    process.stderr.write(
      "usage: claude-run.ts <workflow> --repo <abs path> [--issue N] [--base B] [--args <json>] " +
        "[--state <file>] [--concurrency N]\n",
    );
    process.exit(2);
  }
  const state = named ?? join(mkdtempSync(join(process.env.TMPDIR || tmpdir(), "claude-run-")), "calls.jsonl");
  const onLog = (message: string) => process.stderr.write(`${message}\n`);
  onLog(`claude-run: state ${state}`);
  const { stubs, summary } = createHost({ repo: args.repo, state, concurrency, onLog });
  const { result } = await runWorkflow(resolveWorkflowPath(name), {
    args,
    stubs,
    onLog,
    onPhase: (title) => onLog(`== ${title}`),
  });
  onLog(`claude-run: ${JSON.stringify({ ...summary, state })}`);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}
