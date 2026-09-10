/// <reference types="node" />
// TypeScript side of hooks/pre-bash/issue_body_gate.py's skeleton-selection primitives (unit
// U-001): which template a filed issue's bracketed type maps to, and the wording that denies a
// type with no template on either path. ROOT / VALIDATOR / TEMPLATES / _issue_type / _template
// carry the Python side's names and shapes.
//
// _unmatched_type_reason is not a Python-side name: it extracts the deny message
// issue_body_gate.py's main() builds inline (the f-string after `if template is None`) into its
// own function, so this unit's tests can hold that wording to the contract's "deny の文言は1文字
// も変えない" before a later unit adds main() and wires deny() to it. Its output is
// byte-identical to that inline string; only the placement is factored out.
//
// The validator invocation, the bun/node interpreter lookup, and main itself are outside this
// unit's contract and land in a later one, once their own TypeScript-side dependencies exist --
// the same staging hooks/pre-bash/body_proofread.ts's unit U-006 used for _target /
// _heredoc_body / _flag (see that file's own header). Until that later unit adds main(), this
// file carries no hook entry point -- no shebang, no process.exit(main()) (DR-0114 names that
// shape for the hook body itself, which this file does not become until that unit). Tests
// import this module directly for that reason, the same way body-proofread-target.test.ts did
// before body_proofread.ts grew a main().
import { readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
// Imported per this unit's contract ("gh_filing.ts を import する") even though nothing here
// calls it yet: the later unit that adds main() reads the filing's title through it, the same
// way issue_body_gate.py's main() reaches gh_filing.find only after this module's own pieces
// resolve a template.
import * as ghFiling from "../_lib/gh_filing.ts";

const HERE = dirname(fileURLToPath(import.meta.url));

// hooks/pre-bash/issue_body_gate.ts -> hooks/pre-bash -> hooks -> repo root, the same two
// levels issue_body_gate.py's Path(__file__).resolve().parents[2] climbs.
export const ROOT: string = join(HERE, "..", "..");
export const VALIDATOR: string = join(ROOT, "skills", "issue", "scripts", "validate-issue-body.ts");
export const TEMPLATES: string = join(ROOT, "skills", "issue", "templates");

/** The lowercased type prefix, or null when the title does not open with one
 * (issue_body_gate.py's _issue_type).
 *
 * `\p{L}` rather than `[A-Za-z]`: Python's `str.isalpha()` accepts any Unicode letter, not
 * ASCII alone, and this mirrors that rather than narrowing it. */
export function _issue_type(title: string): string | null {
  if (!title.startsWith("[") || !title.includes("]")) {
    return null;
  }
  const name = title.slice(1, title.indexOf("]"));
  return /^\p{L}+$/u.test(name) ? name.toLowerCase() : null;
}

function _isFile(path: string): boolean {
  try {
    return statSync(path).isFile();
  } catch {
    return false;
  }
}

/** The repository's own template wins over the skill's: that is what the web UI files against
 * (issue_body_gate.py's _template). */
export function _template(issueType: string, repoDir: string): string | null {
  const forms = join(repoDir, ".github", "ISSUE_TEMPLATE");
  const candidates = [
    join(forms, `${issueType}.yml`),
    join(forms, `${issueType}.yaml`),
    join(forms, `${issueType}.md`),
    join(TEMPLATES, `${issueType}.md`),
  ];
  for (const candidate of candidates) {
    if (_isFile(candidate)) {
      return candidate;
    }
  }
  return null;
}

/** The deny wording for a type with no template on either path (issue_body_gate.py's main(),
 * the branch taken when _template returns None). Byte-identical to that inline f-string; see
 * this module's header for why it is factored out here. */
export function _unmatched_type_reason(issueType: string): string {
  const known = readdirSync(TEMPLATES)
    .filter((name) => name.endsWith(".md"))
    .map((name) => name.slice(0, -".md".length))
    .sort()
    .join(", ");
  const choices = known ? `型を ${known} のいずれかにするか、` : "";
  return (
    `issue-body-template: 型 [${issueType}] に対応する骨格が .github/ISSUE_TEMPLATE/ にも ` +
    `skills/issue/templates/ にも無く本文を照合できない。${choices}` +
    `skills/issue/templates/${issueType}.md を足す`
  );
}

// Referenced so tsc's `strict` build never flags the import as unused across a future edit
// that reorders these declarations; the later unit that adds main() replaces this line with a
// real call.
void ghFiling;
