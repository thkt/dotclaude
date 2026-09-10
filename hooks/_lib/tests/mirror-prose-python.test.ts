/// <reference types="node" />
// Ports hooks/_lib/tests/mirror_prose_test.py's ProseExtraction suite's Python-specific cases to
// mirror_prose.ts's side (DR-0112, issue #644, unit U-002). The retired Python module's lines
// 44-70, `_python_prose`, walks Python source with `ast` and `tokenize`, which node carries no
// equivalent for, so this ports the walk as its own string-state scan (triple-quoted / single-
// quoted / prefixed literals, module / def / class docstrings) instead of reusing a regex --
// that module's line 45 states a regex cannot tell `# Heading` inside a triple-quoted template
// from a real comment, which is exactly what mirror_prose_test.py:62's
// `test_a_heading_inside_a_python_literal_is_not_a_comment` pins.
//
// pythonProse itself is not exported: extractProse (mirror_prose.ts) is the one export that
// dispatches a .py file to it, the same seam mirror_prose_test.py's ProseExtraction suite reads
// through via extract_prose. Every expected value below was captured by running the pinned,
// now-retired Python module's own `_python_prose` against the same source, so a Green
// implementation here stays provably parallel to the Python side rather than merely plausible.
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { extractProse } from "../mirror_prose.ts";

function writeFixture(name: string, content: string): string {
  const root = mkdtempSync(path.join(tmpdir(), "mirror-prose-python-"));
  const absolute = path.join(root, name);
  mkdirSync(path.dirname(absolute), { recursive: true });
  writeFileSync(absolute, content);
  return absolute;
}

test("T-369 a module-level string assigned to a name is not prose, while a module docstring is", () => {
  const path_ = writeFixture(
    "m.py",
    '"""Module docstring."""\nTEMPLATE = "assigned string, not prose"\n',
  );
  assert.deepEqual(extractProse(path_), ["Module docstring."]);
});

test("T-370 a prefixed literal and a triple-quoted literal inside a function body are classified the way the python cases record", () => {
  const path_ = writeFixture(
    "m.py",
    'def f():\n    """Function docstring.\n\n    More text."""\n    note = r"raw literal, not prose"\n',
  );
  assert.deepEqual(extractProse(path_), ["Function docstring.", "", "More text."]);
});

test("T-371 a comment after code on the same line is taken and one inside a string literal is not", () => {
  const path_ = writeFixture("m.py", 'x = 1  # inline comment\ns = "# not a comment"\n');
  assert.deepEqual(extractProse(path_), ["# inline comment"]);
});
