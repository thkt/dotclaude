#!/usr/bin/env python3
"""Usage: pr-body.py   (ship payload JSON on stdin)

Deterministically render the build workflow's draft-PR fact tail from structured
data build.js already holds, so the Ship agent does not hand-write it. The PR body
is a fail-closed surface -- it must always carry the verify result, the unresolved
critical/high count, and the "not re-audited" warning -- and an LLM asked to
"include all of the following" can silently drop or soften a section. Moving the
assembly here makes those guarantees tested code, not prompt adherence. The agent
writes only the lead "## Summary" (the human reviewer's entry point) and appends
this tail below it.

Format is deliberately terse and markdown-structured (a one-line status, bold
labels, bullets, a collapsed <details> for a failure log). Safety-critical facts
live in the always-present status line / callout; purely informational lists
(assumptions, backlog, anomalies) are shown only when non-empty, so a clean run
stays short instead of repeating "None" per section.

Fail-closed in two directions: an unparseable payload OR one missing a
safety-critical key (reaudited / tests_pass / gates_pass) exits 1 with nothing on
stdout, rather than a plausible-looking "clean" body -- a missing key must surface
(via the caller's `&&` chain aborting the PR), not default to a reassuring value.

stdin:  JSON {issue, assumptions[], backlog_candidates[], residual_blocking[],
              reaudited, code_anomalies[], tests_pass, gates_pass, verify_output,
              conformance[]}
stdout: the markdown fact tail, led by a blank line + horizontal rule.
exit 0 on a completed run. exit 1 on a parse error or a missing required key.
"""

import json
import sys
from pathlib import Path

REQUIRED_KEYS = ("reaudited", "tests_pass", "gates_pass")

# Human-facing labels by body language. Only prose labels translate; the GitHub
# keyword `Closes`, the code-fenced status line, and command names like `/issue`
# stay verbatim so auto-close and copy-paste keep working. Unknown languages fall
# back to English. Kept in code (not agent-provided) so the tail stays deterministic.
LABELS = {
    "english": {
        "not_reaudited": "> **Not re-audited**. Final fix round unverified; blocking findings may remain.",
        "verify_output": "verify output",
        "assumptions": "Assumptions (veto targets)",
        "backlog": "Backlog (file via `/issue`)",
        "unresolved": "Unresolved critical/high",
        "conformance": "Spec conformance (separate axis, review independently)",
        "anomalies": "Anomalies (Red unconfirmed)",
    },
    "japanese": {
        "not_reaudited": "> **未再audit**。最終修正ラウンドが未検証。blocking findings が残っている可能性がある。",
        "verify_output": "verify 出力",
        "assumptions": "前提 (veto 対象)",
        "backlog": "Backlog (`/issue` で起票)",
        "unresolved": "未解決 critical/high",
        "conformance": "Spec 適合性 (別軸、独立にレビュー)",
        "anomalies": "異常 (Red 未確認)",
    },
}


def _default_language():
    """The user's PR-body language from the dotclaude settings. Best-effort: any
    read/parse failure falls back to English so the tail still renders."""
    try:
        with open(Path.home() / ".claude" / "settings.json") as f:
            return json.load(f).get("language") or "english"
    except (OSError, json.JSONDecodeError):
        return "english"


def fail(message):
    print(f"Error: {message}", file=sys.stderr)
    sys.exit(1)


def _suffix(*parts):
    """Join present parts as ' (a, b)', or '' when none are present."""
    kept = [str(p) for p in parts if p]
    return f" ({', '.join(kept)})" if kept else ""


def _list(items):
    return items if isinstance(items, list) else []


def _fence(text):
    """A backtick fence at least one longer than the longest backtick run in text,
    so a code block never terminates early on content that itself contains ```."""
    longest = current = 0
    for ch in text:
        current = current + 1 if ch == "`" else 0
        longest = max(longest, current)
    return "`" * max(3, longest + 1)


def render(payload):
    issue = str(payload.get("issue", "")).strip()
    reaudited = bool(payload.get("reaudited", True))
    tests = "pass" if payload.get("tests_pass") else "FAIL"
    gates = "pass" if payload.get("gates_pass") else "FAIL"
    residual = _list(payload.get("residual_blocking"))
    lang = (payload.get("language") or "english").lower()
    L = LABELS.get(lang, LABELS["english"])

    out = [f"Closes #{issue}" if issue else "Closes #"]

    blocking = str(len(residual)) + ("" if reaudited else " (not re-audited)")
    out.append(f"`verify tests={tests} gates={gates}` · `blocking {blocking}`")

    if not reaudited:
        out.append(L["not_reaudited"])

    if tests == "FAIL" or gates == "FAIL":
        detail = payload.get("verify_output")
        if detail:
            body = detail if isinstance(detail, str) else json.dumps(detail, indent=2)
            fence = _fence(body)
            out.append(
                f"<details><summary>{L['verify_output']}</summary>\n\n{fence}\n{body}\n{fence}\n\n</details>"
            )

    def section(label, items, render_item):
        items = _list(items)
        if not items:
            return
        lines = []
        for x in items:
            try:
                text = render_item(x)
            except (AttributeError, TypeError, KeyError):
                # A malformed (e.g. non-dict) item must not crash the render and drop
                # the whole fail-closed tail; degrade to its raw string instead.
                text = str(x)
            # Keep each item on one line so an embedded newline can't break the list
            # or promote a following line to a heading.
            lines.append("- " + " ".join(str(text).split("\n")))
        out.append(f"**{label}**\n" + "\n".join(lines))

    section(L["assumptions"], payload.get("assumptions"), str)
    section(
        L["backlog"],
        payload.get("backlog_candidates"),
        lambda c: (
            f"[{c.get('source', '?')}] {c.get('summary', '')}".rstrip()
            + _suffix(c.get("file"), c.get("severity"))
        ),
    )
    section(
        L["unresolved"],
        residual,
        lambda f: (
            f"[{f.get('severity', '?')}] {f.get('summary', '')}".rstrip()
            + _suffix(f.get("file"))
        ),
    )
    section(
        L["conformance"],
        payload.get("conformance"),
        lambda f: (
            f"[{f.get('category', '?')}] {f.get('detail', '')}".rstrip()
            + _suffix(f.get("location"), f.get("spec_line"))
        ),
    )
    section(
        L["anomalies"],
        payload.get("code_anomalies"),
        lambda a: (
            f"{a.get('unit', '?')} ({a.get('kind', '?')}): {a.get('notes', '')}".rstrip()
        ),
    )

    # Lead with a blank line + rule so this machine tail stays separated when appended
    # (>>) below the agent's Summary, without turning the summary's last line into a
    # setext heading, and to signal where the auto-generated section begins.
    return "\n\n---\n\n" + "\n\n".join(out) + "\n"


def main():
    try:
        payload = json.loads(sys.stdin.read())
    except json.JSONDecodeError as exc:
        fail(f"ship payload is not valid JSON: {exc}")
    if not isinstance(payload, dict):
        fail("ship payload must be a JSON object")
    missing = [k for k in REQUIRED_KEYS if k not in payload]
    if missing:
        fail(f"ship payload missing required key(s): {', '.join(missing)}")
    payload.setdefault("language", _default_language())
    sys.stdout.write(render(payload))


if __name__ == "__main__":
    main()
