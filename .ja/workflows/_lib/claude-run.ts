/// <reference types="node" />
// workflow script (workflows/<name>.js) を、Claude Code の workflow 実行環境の外で実行する。
//
// Claude Code の中では script はコマンドを実行できないので、コマンドはすべて agent を通る (中継、DR-0126)。
// 中継の prompt はコマンドを spec として持つ。この host は relay.ts の runSpec でその spec を自分で実行するので、
// 中継に agent は要らない。中継でない agent() 呼び出し (実装・レビュー・修正・命名) は、1 つずつ
// `claude -p` の子 session に渡す。script の評価は、テストが使う run-workflow.ts の形である。
//
// Usage: claude-run.ts <workflow> --repo <abs path> [--issue N] [--base B] [--args <json>]
//                      [--state <file>] [--concurrency N]
// stdout: workflow の戻り値の JSON。stderr: log、phase、まとめの 1 行。
// exit: script が値を返したら 0 (停止を含む)。script が throw したら 1。読めない呼び出しは 2。
//
// --state は、agent() 呼び出しごとの結果を残すファイルを指す。同じファイルで始めた実行は、prompt と option が
// 同じ呼び出しに残っている結果を返し、何も実行しない。止まった実行はこの方法で再開する。同じファイルと、停止が
// 返した `retry` を --args に渡す (DR-0124)。1 つの state ファイルを持てる host は同時に 1 つである。
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { makeSlots, parseArgv, resolveWorkflowPath } from "./codex-run.ts";
import { isMainModule } from "./entry-point.ts";
import { canonical, endRunningGroups, publicFields, runSpec } from "./relay.ts";
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
  schema?: { properties?: Record<string, unknown>; [key: string]: unknown };
}

// 子 session が尋ねずに使える tool。prompt には script が書いていない文章 (Issue の本文、check の出力) が入る
// ので、Bash は含めない。コマンドは、Claude Code の中の agent と同じく、利用者自身の permission の規則が許す
// ときに実行される。尋ねる相手がおらず、リポジトリを信頼する呼び出し元は、CLAUDE_RUN_TOOLS に広い一覧を書く。
const CHILD_TOOLS = process.env.CLAUDE_RUN_TOOLS || "Read,Write,Edit,MultiEdit,Glob,Grep,LS";
// Claude Code の workflow 実行環境の中の agent は、自分で agent を始めない。子 session は 1 つの完全な session
// なので始めてしまう。実装の session が reviewer を 2 つ始め、script 自身のレビューがそれを繰り返した。
const CHILD_DENIED = "Agent,Workflow";
// いちばん長い呼び出しは実装の session。上限はそれに合わせ、label ごとには分けない。
const CHILD_TIMEOUT_MS = Number(process.env.CLAUDE_RUN_TIMEOUT_MS) || 3_600_000;
// 並列に広げる script は、単位ごとに子を 1 つ始める。Claude Code は in-process の agent 数に上限を持つが、
// 子プロセスには上限が無い。
const DEFAULT_CONCURRENCY = 4;
const SPEC_BLOCK = /RELAY_SPEC ([0-9a-f]{8}:\d+)\n([^\n]*)\nRELAY_SPEC_END/;
// 結果を構造化された形で返さずに終わった session に伝える文。
const GIVE_REPLY =
  "Your work in this session is done. Give its result now through the structured output, in the shape the schema asks for. Do no further work.";
// state ファイルとその隣に残すものは、prompt とコマンドの出力を持つ。そこには token が入りうる (認証情報付きの
// remote の URL)。読めるのは利用者だけにする。
const PRIVATE_DIR = { recursive: true, mode: 0o700 } as const;
const PRIVATE_FILE = { mode: 0o600 } as const;

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

// 実行中の子 session。それぞれ自分の process group で走らせ、session が始めた tool も一緒に終わるようにする。
const runningChildren = new Set<number>();
const endGroup = (pid: number, name: NodeJS.Signals) => {
  try {
    process.kill(-pid, name);
  } catch {
    // すでに終わっている
  }
};
// この host が始めたもの (中継の step と子 session) を終わらせる。終わらされた host は、再開した実行と競合して
// worktree へ書き込み続けるものを残さない。
export const endAll = () => {
  endRunningGroups();
  for (const pid of runningChildren) endGroup(pid, "SIGTERM");
};

export const runClaudeOnce = ({
  prompt,
  model,
  effort,
  schema,
  cwd,
  timeoutMs,
  resume,
}: ChildRun): Promise<ChildOutcome> =>
  new Promise((done) => {
    const argv = ["-p", "--model", model, "--output-format", "json", "--allowedTools", CHILD_TOOLS];
    argv.push("--disallowedTools", CHILD_DENIED);
    if (effort) argv.push("--effort", effort);
    // session は作業を終え、文章で終わった。作業を知っている同じ session の中で、返答だけを求める。
    if (resume) argv.push("--resume", resume);
    if (schema) argv.push("--json-schema", JSON.stringify(schema));
    // 子だけに渡す設定。ブラウザーを使う check が動かない sandbox を外す、など。
    if (process.env.CLAUDE_RUN_SETTINGS) argv.push("--settings", process.env.CLAUDE_RUN_SETTINGS);
    const child = spawn("claude", argv, { cwd, stdio: ["pipe", "pipe", "pipe"], detached: true });
    const pid = child.pid ?? 0;
    if (pid) runningChildren.add(pid);
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      if (pid) endGroup(pid, "SIGKILL");
    }, timeoutMs);
    const finish = (outcome: ChildOutcome) => {
      clearTimeout(timer);
      runningChildren.delete(pid);
      done(outcome);
    };
    child.stdout.setEncoding("utf8").on("data", (chunk: string) => {
      stdout += chunk;
    });
    child.stderr.setEncoding("utf8").on("data", (chunk: string) => {
      stderr += chunk;
    });
    child.on("error", (err) => finish({ code: -1, stdout, stderr: String(err.message), timedOut: false }));
    child.on("close", (code) => finish({ code, stdout, stderr: stderr.slice(-4000), timedOut }));
    // prompt は stdin で渡す。Issue の本文を argv に載せない。
    child.stdin.on("error", () => {});
    child.stdin.end(prompt);
  });

export interface Summary {
  relays: number;
  children: number;
  kept: number;
  cost_usd: number;
  // 中継のコマンドと子 session にかかった時間。この host が測った値である。session 自身が報告する時間は、
  // 自分が始めたものを待った時間を含まない。
  relay_ms: number;
  child_ms: number;
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

// 書き込みの途中で終わらされた host は、途中で切れた最後の行を残す。その行は 1 つの呼び出しをもう一度尋ねれば
// 済み、それより前の呼び出しをすべて失う理由にはならない。
const readKept = (state: string): Map<string, JsonValue> => {
  const kept = new Map<string, JsonValue>();
  if (!existsSync(state)) return kept;
  for (const line of readFileSync(state, "utf8").split("\n")) {
    try {
      const { key, value } = JSON.parse(line) as { key: string; value: JsonValue };
      if (typeof key === "string") kept.set(key, value);
    } catch {
      // 行として揃っていない
    }
  }
  return kept;
};

// 中継とは、schema が relay_check を求める呼び出しである。schema は script のものなので、script が書いていない
// 文章が呼び出しを中継にすることは無い。実装の prompt に引用された Issue の本文は自前の spec のブロックを
// 持ちうるが、それは実行されない。spec は最初のブロックで、中継の prompt では script が後ろに足すものより前にある。
const isRelay = (opts: AgentOptions): boolean =>
  Boolean(opts.schema?.properties && "relay_check" in opts.schema.properties);
const specIn = (prompt: string): Spec | null => {
  const found = SPEC_BLOCK.exec(prompt);
  return found && digest(found[2]) === found[1] ? (JSON.parse(found[2]) as Spec) : null;
};

// 子 session の出力を、agent() が返す値にする。schema があれば構造化された返答、無ければ最後の文章。失敗した
// session は null で、これは Agent tool が落ちた agent に返す値と同じである。`unshaped` は、構造化された形を
// 出さずに終わった session を指す。
const replyOf = (
  outcome: ChildOutcome,
  schema: unknown,
  label: string,
  onLog: (message: string) => void,
): { value: JsonValue; cost: number; unshaped?: string } => {
  if (outcome.timedOut) {
    onLog(`[${label}] the child session was ended at its time limit; the call returns null.`);
    return { value: null, cost: 0 };
  }
  let reply: JsonValue;
  try {
    reply = JSON.parse(outcome.stdout);
  } catch {
    const tail = outcome.stderr.split("\n").slice(-3).join(" ");
    onLog(`[${label}] the child session exited ${outcome.code} with no result. ${tail}; the call returns null.`);
    return { value: null, cost: 0 };
  }
  const cost = Number(reply.total_cost_usd) || 0;
  const failed = Boolean(reply.is_error) || outcome.code !== 0;
  // schema の形の返答は session の結果である。その後に session がエラーで終わっても変わらない。
  if (schema && reply.structured_output !== undefined && reply.structured_output !== null) {
    if (failed) onLog(`[${label}] the child session ended as ${reply.subtype} after giving its reply.`);
    return { value: reply.structured_output, cost };
  }
  if (failed) {
    onLog(`[${label}] the child session ended as ${reply.subtype}; the call returns null.`);
    return { value: null, cost };
  }
  if (!schema) return { value: String(reply.result ?? "").trim(), cost };
  onLog(`[${label}] the child session gave no reply in the schema's shape.`);
  return { value: null, cost, unshaped: String(reply.session_id ?? "") };
};

export function createHost({
  repo,
  state,
  concurrency = DEFAULT_CONCURRENCY,
  onLog = () => {},
  runOnce = runClaudeOnce,
}: HostOptions): { stubs: RunWorkflowStubs; summary: Summary } {
  const summary: Summary = { relays: 0, children: 0, kept: 0, cost_usd: 0, relay_ms: 0, child_ms: 0 };
  const beside = dirname(state);
  mkdirSync(beside, PRIVATE_DIR);
  const kept = readKept(state);
  // 途中で切れた行の後に揃った行を書くには、先に改行が要る。
  if (existsSync(state) && !readFileSync(state, "utf8").endsWith("\n")) appendFileSync(state, "\n", PRIVATE_FILE);
  const withSlot = makeSlots(concurrency);
  // 中継のコマンドは、それを実行する agent の prompt からデータを読むことがある (write-body.ts は PR 本文を
  // そう読む、DR-0125)。ここには agent がいないので、そのコマンドが探す場所に prompt を置く。RELAY_PROJECTS が
  // 指すディレクトリの下の、transcript の最初の行である。
  const transcripts = join(beside, "projects", "claude-run", "host", "subagents");
  mkdirSync(transcripts, PRIVATE_DIR);
  process.env.RELAY_PROJECTS = join(beside, "projects");
  const sessions = join(beside, "sessions");
  mkdirSync(sessions, PRIVATE_DIR);
  // 再開した実行は、止まった実行が残したファイルの続きから番号を振る。
  let serial = readdirSync(transcripts).length + readdirSync(sessions).length;

  const relayed = async (prompt: string, label: string): Promise<JsonValue> => {
    const spec = specIn(prompt);
    if (!spec) {
      // 中継のコマンドを、session に手で実行させることはしない。
      onLog(`[${label}] the relay's prompt carries no spec with the digest it names; the call returns null.`);
      return null;
    }
    serial += 1;
    writeFileSync(
      join(transcripts, `agent-${serial}.jsonl`),
      `${JSON.stringify({ type: "user", message: { role: "user", content: prompt } })}\n`,
      PRIVATE_FILE,
    );
    const started = Date.now();
    const { fields } = await runSpec(spec);
    const shown = publicFields(fields);
    summary.relays += 1;
    summary.relay_ms += Date.now() - started;
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
        const started = Date.now();
        const outcome = await runOnce(asked);
        summary.child_ms += Date.now() - started;
        // session ごとの結果を残す。呼び出しが何も返さなかった理由と、かかった費用を読むため。
        serial += 1;
        writeFileSync(
          join(sessions, `${serial}-${label.replace(/[^\w.-]/g, "_")}${part}.json`),
          outcome.stdout,
          PRIVATE_FILE,
        );
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
      if (second.value === null)
        onLog(`[${label}] asked once more in the same session and got no reply; the call returns null.`);
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
    const value = isRelay(opts) ? await relayed(prompt, label) : await answered(prompt, opts, label);
    // 何も返さなかった呼び出しは、再開のときにもう一度尋ねる。
    if (value !== null && value !== undefined) {
      kept.set(key, value);
      appendFileSync(state, `${JSON.stringify({ key, label, value })}\n`, PRIVATE_FILE);
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

// 1 つの state ファイルに host が 2 つ付くと、互いの結果を見ずに同じ push を 2 度実行する。lock はファイルを
// 持つ process を名乗り、その process がもういない lock は引き継ぐ。
export const holdState = (state: string): (() => void) => {
  const lock = `${state}.lock`;
  mkdirSync(dirname(state), PRIVATE_DIR);
  const holder = existsSync(lock) ? Number(readFileSync(lock, "utf8")) : 0;
  const alive = (pid: number) => {
    try {
      process.kill(pid, 0);
      return true;
    } catch (error) {
      // 別の利用者の process でも、実行中であることに変わりはない。
      return (error as NodeJS.ErrnoException).code === "EPERM";
    }
  };
  if (holder && holder !== process.pid && alive(holder)) {
    throw new Error(`the state file ${state} is held by the running process ${holder}`);
  }
  writeFileSync(lock, String(process.pid), PRIVATE_FILE);
  return () => rmSync(lock, { force: true });
};

interface Call {
  name: string;
  args: Record<string, unknown> & { repo: string };
  concurrency: number | undefined;
  state: string | undefined;
}

// --state はこの host だけの flag。残りは codex-run.ts が読む argv と同じ。読めない呼び出しは null で、
// 呼び出し側が usage を出力する。
export const readCall = (argv: string[]): Call | null => {
  const at = argv.indexOf("--state");
  const state = at < 0 ? undefined : argv[at + 1];
  if (at >= 0 && (!state || state.startsWith("--"))) return null;
  const rest = at < 0 ? argv : [...argv.slice(0, at), ...argv.slice(at + 2)];
  try {
    const { name, args, concurrency } = parseArgv(rest);
    if (!name || typeof args.repo !== "string") return null;
    if (concurrency !== undefined && !(Number.isInteger(concurrency) && concurrency >= 1)) return null;
    // step は worktree で走るので、host を始めた場所からの相対パスはそこからは見つからない。
    return { name, args: { ...args, repo: args.repo }, concurrency, state: state ? resolve(state) : undefined };
  } catch {
    return null;
  }
};

if (isMainModule(import.meta.url)) {
  const call = readCall(process.argv.slice(2));
  if (!call) {
    process.stderr.write(
      "usage: claude-run.ts <workflow> --repo <abs path> [--issue N] [--base B] [--args <json>] " +
        "[--state <file>] [--concurrency N]\n",
    );
    process.exit(2);
  }
  const state =
    call.state ?? join(mkdtempSync(join(process.env.TMPDIR || tmpdir(), "claude-run-")), "calls.jsonl");
  const onLog = (message: string) => process.stderr.write(`${message}\n`);
  const release = holdState(state);
  for (const name of ["SIGTERM", "SIGINT", "SIGHUP"] as const) {
    process.on(name, () => {
      endAll();
      release();
      process.exit(143);
    });
  }
  onLog(`claude-run: state ${state}`);
  const { stubs, summary } = createHost({ repo: call.args.repo, state, concurrency: call.concurrency, onLog });
  let code = 0;
  try {
    const { result } = await runWorkflow(resolveWorkflowPath(call.name), {
      args: call.args,
      stubs,
      onLog,
      onPhase: (title) => onLog(`== ${title}`),
    });
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } catch (error) {
    endAll();
    onLog(`claude-run: the script threw: ${error instanceof Error ? error.message : String(error)}`);
    code = 1;
  }
  onLog(`claude-run: ${JSON.stringify({ ...summary, state })}`);
  release();
  process.exit(code);
}
