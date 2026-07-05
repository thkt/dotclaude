#!/usr/bin/env python3
"""hook-payload fixture を再生成する。形は実キャプチャ (session 38b8fba4) 由来で sanitize 済み:
session_id / cwd / prompt_id を placeholder に置換し、probe 内容を現実的な issue タイトルに
差し替えている。実行: python3 gen_fixtures.py <outdir>"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from veto import (
    dumps,  # noqa: E402  (fixture は出荷スクリプトと同一のシリアライズを使う)
)

outdir = Path(sys.argv[1])
outdir.mkdir(parents=True, exist_ok=True)

TITLE = "[Feature] ゲート付き issue 作成フロー"
BASE = {
    "session_id": "SESSION-FIXTURE",
    "transcript_path": "/repo/transcript.jsonl",
    "cwd": "/repo",
    "prompt_id": "PROMPT-FIXTURE",
    "permission_mode": "auto",
    "effort": {"level": "medium"},
}


# on-the-wire の hook payload に合わせて compact な single-line JSON で出力する。PreToolUse gate
# の wrapper は Claude Code が届けるままの空白なし `"tool_name":"Bash"` を match するため、
# ここで pretty-print すると `": "` のスペースが入り本番と乖離する。
def write(name, obj):
    (outdir / name).write_text(dumps({**BASE, **obj}) + "\n", encoding="utf-8")


# -- Bash PostToolUse: title に対して GO を返す verdict-gate 実行 --------------------------------
write(
    "bash-verdict-go.json",
    {
        "hook_event_name": "PostToolUse",
        "tool_name": "Bash",
        "tool_input": {
            "command": f'python3 hooks/veto/veto.py verdict-gate --title "{TITLE}"'
        },
        "tool_response": {
            "stdout": dumps(
                {
                    "verdict": "GO",
                    "downgraded": False,
                    "reasons": [],
                    "normalized_title": TITLE,
                    "raw_input_sha": "deadbeef",
                }
            ),
            "stderr": "",
            "interrupted": False,
        },
        "duration_ms": 120,
    },
)

# -- Bash PostToolUse: title に対して ready=true を返す plan-gate 実行 ---------------------------
write(
    "bash-plan-ready.json",
    {
        "hook_event_name": "PostToolUse",
        "tool_name": "Bash",
        "tool_input": {
            "command": f'python3 hooks/veto/veto.py plan-gate --title "{TITLE}"'
        },
        "tool_response": {
            "stdout": dumps({"ready": True, "errors": [], "normalized_title": TITLE}),
            "stderr": "",
            "interrupted": False,
        },
        "duration_ms": 130,
    },
)

# -- Bash PostToolUse: title に対する保存済み research 出力を宣言する research-gate 実行 ---------
RESEARCH_FILE = ".claude/workspace/research/2026-07-05-gated-issue-flow.md"
write(
    "bash-research-done.json",
    {
        "hook_event_name": "PostToolUse",
        "tool_name": "Bash",
        "tool_input": {
            "command": f'python3 hooks/veto/veto.py research-gate --title "{TITLE}" --file {RESEARCH_FILE}',
        },
        "tool_response": {
            "stdout": dumps(
                {"done": True, "file": RESEARCH_FILE, "normalized_title": TITLE}
            ),
            "stderr": "",
            "interrupted": False,
        },
        "duration_ms": 110,
    },
)

# -- Bash PostToolUse: 成功した gh issue create (stdout に issue URL)、main agent ----------------
write(
    "bash-gh-create-success.json",
    {
        "hook_event_name": "PostToolUse",
        "tool_name": "Bash",
        "tool_input": {
            "command": f'gh issue create --title "{TITLE}" --body-file /tmp/body.md'
        },
        "tool_response": {
            "stdout": "https://github.com/thkt/dotclaude/issues/900",
            "stderr": "",
            "interrupted": False,
        },
        "duration_ms": 2100,
    },
)

# -- Bash PreToolUse: main agent の gh issue create (gate への入力) ------------------------------
write(
    "pre-gh-create-main.json",
    {
        "hook_event_name": "PreToolUse",
        "tool_name": "Bash",
        "tool_input": {
            "command": f'gh issue create --title "{TITLE}" --body-file /tmp/body.md'
        },
    },
)

# -- Bash PreToolUse: subagent 発の gh issue create (agent_id exemption) -------------------------
write(
    "pre-gh-create-subagent.json",
    {
        "hook_event_name": "PreToolUse",
        "tool_name": "Bash",
        "agent_id": "a81ba6791b718cdc1",
        "agent_type": "general-purpose",
        "tool_input": {
            "command": f'gh issue create --title "{TITLE}" --body-file /tmp/body.md'
        },
    },
)

# -- Bash PreToolUse: 似て非なる title の main agent gh create (title 不一致) --------------------
write(
    "pre-gh-create-mismatch.json",
    {
        "hook_event_name": "PreToolUse",
        "tool_name": "Bash",
        "tool_input": {
            "command": f'gh issue create --title "{TITLE} 改" --body-file /tmp/body.md'
        },
    },
)

# -- Bash PreToolUse: gh 以外のコマンド (fast-exit) ----------------------------------------------
write(
    "pre-bash-nonmatching.json",
    {
        "hook_event_name": "PreToolUse",
        "tool_name": "Bash",
        "tool_input": {"command": 'echo "hello world"'},
    },
)

# -- AskUserQuestion PostToolUse: 固定 skip header、kind = docs ----------------------------------
SKIP_Q = "この issue は docs / chore / minor-bug のため challenge / research / think を免除しますか?"
write(
    "askuserquestion-skip.json",
    {
        "hook_event_name": "PostToolUse",
        "tool_name": "AskUserQuestion",
        "tool_input": {
            "questions": [
                {
                    "question": SKIP_Q,
                    "header": "判定スキップ",
                    "options": [
                        {"label": "docs", "description": "ドキュメント"},
                        {"label": "chore", "description": "雑務"},
                        {"label": "minor-bug", "description": "軽微なバグ"},
                    ],
                    "multiSelect": False,
                }
            ]
        },
        "tool_response": {
            "questions": [{"question": SKIP_Q}],
            "answers": {SKIP_Q: "docs"},
            "annotations": {},
        },
    },
)

# -- AskUserQuestion PostToolUse: 別 header (skip として記録されてはならない) --------------------
OTHER_Q = "この issue を作成しますか?"
write(
    "askuserquestion-nonskip.json",
    {
        "hook_event_name": "PostToolUse",
        "tool_name": "AskUserQuestion",
        "tool_input": {
            "questions": [
                {
                    "question": OTHER_Q,
                    "header": "作成確認",
                    "options": [{"label": "はい", "description": "作成"}],
                    "multiSelect": False,
                }
            ]
        },
        "tool_response": {
            "questions": [{"question": OTHER_Q}],
            "answers": {OTHER_Q: "はい"},
            "annotations": {},
        },
    },
)

print(f"wrote fixtures to {outdir}")
