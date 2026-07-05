#!/usr/bin/env python3
"""Usage: pr-body.py   (ship payload JSON on stdin)

Deterministically render the build workflow's draft-PR body from structured data
build.js already holds, so the Ship agent does not hand-write it. The PR body is a
fail-closed surface -- it must always carry the user's veto targets (assumptions),
the unresolved critical/high findings, the "not re-audited" warning, and the verify
result -- and an LLM asked to "include all of the following" can silently drop or
soften a section. Moving the assembly here makes section presence and the
conditional wording tested code, not prompt adherence. The Ship agent is reduced to:
write the commit message, run git commit/push, pipe this payload in, and open the PR
with the generated body file. The commit message (a diff summary) stays the LLM's.

stdin:  JSON {issue, assumptions[], backlog_candidates[], residual_blocking[],
              reaudited, code_anomalies[], tests_pass, gates_pass, verify_output}
stdout: the PR body markdown.
exit 0 on a completed run. exit 1 on a parse error (fail-closed: a malformed payload
never yields a body that silently omits the required sections).
"""

import json
import sys


def _lines(items, render, empty):
    """Render a bullet list via render(item), or the empty placeholder."""
    items = items if isinstance(items, list) else []
    if not items:
        return empty
    return "\n".join(f"- {render(x)}" for x in items)


def _suffix(*parts):
    """Join present parts as ' (a, b)', or '' when none are present."""
    kept = [str(p) for p in parts if p]
    return f" ({', '.join(kept)})" if kept else ""


def render(payload):
    issue = str(payload.get("issue", "")).strip()
    reaudited = bool(payload.get("reaudited", True))
    tests_pass = bool(payload.get("tests_pass"))
    gates_pass = bool(payload.get("gates_pass"))

    sections = []
    sections.append(f"Closes #{issue}" if issue else "Closes #")

    sections.append(
        "## Assumptions (veto targets)\n"
        + _lines(payload.get("assumptions"), lambda a: str(a), "_None recorded._")
    )

    sections.append(
        "## Backlog candidates\n"
        "The build does not file these. Triage and run `/issue` on the ones worth filing.\n\n"
        + _lines(
            payload.get("backlog_candidates"),
            lambda c: f"[{c.get('source', '?')}] {c.get('summary', '')}".rstrip()
            + _suffix(c.get("file"), c.get("severity")),
            "_None._",
        )
    )

    if reaudited:
        finding_block = _lines(
            payload.get("residual_blocking"),
            lambda f: f"[{f.get('severity', '?')}] {f.get('summary', '')}".rstrip()
            + _suffix(f.get("file")),
            "_None; audit reached zero critical/high._",
        )
    else:
        # residual_blocking is empty by construction when the fix-round cap was hit;
        # the real signal is that the last round's fixes were never re-audited.
        finding_block = (
            "> The final fix round was not re-audited (re-audit budget spent); "
            "unresolved critical/high findings may remain."
        )
    sections.append("## Unresolved critical/high findings\n" + finding_block)

    sections.append(
        "## Red-unconfirmed anomalies\n"
        + _lines(
            payload.get("code_anomalies"),
            lambda a: f"{a.get('unit', '?')} ({a.get('kind', '?')}): {a.get('notes', '')}".rstrip(),
            "_None._",
        )
    )

    verify = f"tests: {'pass' if tests_pass else 'FAIL'}, gates: {'pass' if gates_pass else 'FAIL'}"
    if not (tests_pass and gates_pass):
        detail = payload.get("verify_output")
        if detail:
            body = detail if isinstance(detail, str) else json.dumps(detail, indent=2)
            verify += "\n\n```\n" + body + "\n```"
    sections.append("## Independent verify\n" + verify)

    return "\n\n".join(sections) + "\n"


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
