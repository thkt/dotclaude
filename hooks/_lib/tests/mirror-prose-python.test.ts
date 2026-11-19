/// <reference types="node" />
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

test("T-372 a function-body docstring with a two-letter rb prefix is classified as prose", () => {
  const path_ = writeFixture(
    "m.py",
    'def f():\n    rb"""Function docstring with an rb prefix."""\n    return 1\n',
  );
  assert.deepEqual(extractProse(path_), ["Function docstring with an rb prefix."]);
});

test("T-373 a string literal left open at end of file yields the prose the current scanner records", () => {
  const path_ = writeFixture("m.py", '"""Unterminated module docstring, never closed');
  assert.deepEqual(extractProse(path_), ["Unterminated module docstring, never closed"]);
});

test("T-374 a shebang first line is not taken as a comment", () => {
  const path_ = writeFixture("m.py", "#!/usr/bin/env python3\n# a real comment\n");
  assert.deepEqual(extractProse(path_), ["# a real comment"]);
});

test("T-375 a backslash-escaped quote inside a literal does not end the literal", () => {
  const path_ = writeFixture("m.py", '"Docstring with \\" an escaped quote inside it."\n');
  assert.deepEqual(extractProse(path_), ['Docstring with \\" an escaped quote inside it.']);
});
