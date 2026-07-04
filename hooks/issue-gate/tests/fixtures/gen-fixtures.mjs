// Regenerates the hook-payload fixtures. Shapes are taken from live capture (session 38b8fba4)
// and sanitized: session_id / cwd / prompt_id replaced with placeholders, probe content swapped
// for a realistic issue title. Run: node gen-fixtures.mjs <outdir>
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const outdir = process.argv[2];
mkdirSync(outdir, { recursive: true });

const TITLE = "[Feature] ゲート付き issue 作成フロー";
const base = {
  session_id: "SESSION-FIXTURE",
  transcript_path: "/repo/transcript.jsonl",
  cwd: "/repo",
  prompt_id: "PROMPT-FIXTURE",
  permission_mode: "auto",
  effort: { level: "medium" },
};

// Emit compact single-line JSON to mirror the on-the-wire hook payload. The PreToolUse gate
// wrapper matches `"tool_name":"Bash"` with no whitespace, exactly as Claude Code delivers it;
// pretty-printing here would insert a `": "` space and diverge from production.
const write = (name, obj) => writeFileSync(join(outdir, name), `${JSON.stringify(obj)}\n`, "utf8");

// -- Bash PostToolUse: a verdict-gate run returning GO for the title ----------------------------
write("bash-verdict-go.json", {
  ...base,
  hook_event_name: "PostToolUse",
  tool_name: "Bash",
  tool_input: { command: `node scripts/issue-gate/verdict-gate.mjs --title "${TITLE}"` },
  tool_response: {
    stdout: JSON.stringify({
      verdict: "GO",
      downgraded: false,
      reasons: [],
      normalized_title: TITLE,
      raw_input_sha: "deadbeef",
    }),
    stderr: "",
    interrupted: false,
  },
  duration_ms: 120,
});

// -- Bash PostToolUse: a plan-gate run returning ready=true for the title -----------------------
write("bash-plan-ready.json", {
  ...base,
  hook_event_name: "PostToolUse",
  tool_name: "Bash",
  tool_input: { command: `node scripts/issue-gate/plan-gate.mjs --title "${TITLE}"` },
  tool_response: {
    stdout: JSON.stringify({ ready: true, errors: [], normalized_title: TITLE }),
    stderr: "",
    interrupted: false,
  },
  duration_ms: 130,
});

// -- Bash PostToolUse: a successful gh issue create (issue URL on stdout), main agent -----------
write("bash-gh-create-success.json", {
  ...base,
  hook_event_name: "PostToolUse",
  tool_name: "Bash",
  tool_input: { command: `gh issue create --title "${TITLE}" --body-file /tmp/body.md` },
  tool_response: {
    stdout: "https://github.com/thkt/dotclaude/issues/900",
    stderr: "",
    interrupted: false,
  },
  duration_ms: 2100,
});

// -- Bash PreToolUse: a main-agent gh issue create (the gate input) -----------------------------
write("pre-gh-create-main.json", {
  ...base,
  hook_event_name: "PreToolUse",
  tool_name: "Bash",
  tool_input: { command: `gh issue create --title "${TITLE}" --body-file /tmp/body.md` },
});

// -- Bash PreToolUse: a subagent-originated gh issue create (agent_id exemption, T-029) ---------
write("pre-gh-create-subagent.json", {
  ...base,
  hook_event_name: "PreToolUse",
  tool_name: "Bash",
  agent_id: "a81ba6791b718cdc1",
  agent_type: "general-purpose",
  tool_input: { command: `gh issue create --title "${TITLE}" --body-file /tmp/body.md` },
});

// -- Bash PreToolUse: a main-agent gh create with a near-but-different title (T-023 mismatch) ---
write("pre-gh-create-mismatch.json", {
  ...base,
  hook_event_name: "PreToolUse",
  tool_name: "Bash",
  tool_input: { command: `gh issue create --title "${TITLE} 改" --body-file /tmp/body.md` },
});

// -- Bash PreToolUse: a non-gh command (fast-exit) ----------------------------------------------
write("pre-bash-nonmatching.json", {
  ...base,
  hook_event_name: "PreToolUse",
  tool_name: "Bash",
  tool_input: { command: 'echo "hello world"' },
});

// -- AskUserQuestion PostToolUse: the fixed skip header, kind = docs ----------------------------
const skipQ =
  "この issue は docs / chore / minor-bug のため challenge / research / think を免除しますか?";
write("askuserquestion-skip.json", {
  ...base,
  hook_event_name: "PostToolUse",
  tool_name: "AskUserQuestion",
  tool_input: {
    questions: [
      {
        question: skipQ,
        header: "判定スキップ",
        options: [
          { label: "docs", description: "ドキュメント" },
          { label: "chore", description: "雑務" },
          { label: "minor-bug", description: "軽微なバグ" },
        ],
        multiSelect: false,
      },
    ],
  },
  tool_response: {
    questions: [{ question: skipQ }],
    answers: { [skipQ]: "docs" },
    annotations: {},
  },
});

// -- AskUserQuestion PostToolUse: a different header (must NOT be recorded as a skip) -----------
const otherQ = "この issue を作成しますか?";
write("askuserquestion-nonskip.json", {
  ...base,
  hook_event_name: "PostToolUse",
  tool_name: "AskUserQuestion",
  tool_input: {
    questions: [
      {
        question: otherQ,
        header: "作成確認",
        options: [{ label: "はい", description: "作成" }],
        multiSelect: false,
      },
    ],
  },
  tool_response: {
    questions: [{ question: otherQ }],
    answers: { [otherQ]: "はい" },
    annotations: {},
  },
});

process.stdout.write(`wrote fixtures to ${outdir}\n`);
