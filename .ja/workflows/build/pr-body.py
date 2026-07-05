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

stdin:  JSON {issue, assumptions[], backlog_candidates[], residual_blocking[],
              reaudited, code_anomalies[], tests_pass, gates_pass, verify_output}
stdout: the markdown fact tail, led by a blank line + horizontal rule.
exit 0 on a completed run. exit 1 on a parse error (fail-closed).
"""

import json
import sys


def _suffix(*parts):
    """Join present parts as ' (a, b)', or '' when none are present."""
    kept = [str(p) for p in parts if p]
    return f" ({', '.join(kept)})" if kept else ""


def _list(items):
    return items if isinstance(items, list) else []


def render(payload):
    issue = str(payload.get("issue", "")).strip()
    reaudited = bool(payload.get("reaudited", True))
    tests = "pass" if payload.get("tests_pass") else "FAIL"
    gates = "pass" if payload.get("gates_pass") else "FAIL"
    residual = _list(payload.get("residual_blocking"))

    out = [f"Closes #{issue}" if issue else "Closes #"]

    blocking = str(len(residual)) if reaudited else "not re-audited"
    out.append(f"`verify tests={tests} gates={gates}` · `blocking {blocking}`")

    if not reaudited:
        out.append("> **Not re-audited** — final fix round unverified; blocking findings may remain.")

    if tests == "FAIL" or gates == "FAIL":
        detail = payload.get("verify_output")
        if detail:
            body = detail if isinstance(detail, str) else json.dumps(detail, indent=2)
            out.append(f"<details><summary>verify output</summary>\n\n```\n{body}\n```\n\n</details>")

    def section(label, items, render_item):
        items = _list(items)
        if items:
            out.append(f"**{label}**\n" + "\n".join(f"- {render_item(x)}" for x in items))

    section("Assumptions (veto targets)", payload.get("assumptions"), str)
    section(
        "Backlog — file via `/issue`",
        payload.get("backlog_candidates"),
        lambda c: f"[{c.get('source', '?')}] {c.get('summary', '')}".rstrip()
        + _suffix(c.get("file"), c.get("severity")),
    )
    if reaudited:
        section(
            "Unresolved critical/high",
            residual,
            lambda f: f"[{f.get('severity', '?')}] {f.get('summary', '')}".rstrip() + _suffix(f.get("file")),
        )
    section(
        "Anomalies (Red unconfirmed)",
        payload.get("code_anomalies"),
        lambda a: f"{a.get('unit', '?')} ({a.get('kind', '?')}): {a.get('notes', '')}".rstrip(),
    )

    # Lead with a blank line + rule so this machine tail stays separated when appended
    # (>>) below the agent's Summary, without turning the summary's last line into a
    # setext heading, and to signal where the auto-generated section begins.
    return "\n\n---\n\n" + "\n\n".join(out) + "\n"


def main():
    try:
        payload = json.loads(sys.stdin.read())
    except json.JSONDecodeError as exc:
        print(f"Error: ship payload is not valid JSON: {exc}", file=sys.stderr)
        sys.exit(1)
    if not isinstance(payload, dict):
        print("Error: ship payload must be a JSON object", file=sys.stderr)
        sys.exit(1)
    sys.stdout.write(render(payload))


if __name__ == "__main__":
    main()
