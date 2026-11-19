/// <reference types="node" />
import assert from "node:assert/strict";
import test from "node:test";
import { extractBracedBody } from "./_brace.ts";

test("T-048 extractBracedBody returns null when the brace opened after the marker never closes", () => {
  const source = 'const meta = { "name": "implement", "phases": [';
  assert.strictEqual(extractBracedBody(source, "const meta = {"), null);
});

test("T-049 extractBracedBody returns the inner text of a balanced literal whose string values carry nested braces", () => {
  const source = 'const meta = { "description": "Workflow({name:\'implement\'})" };';
  assert.strictEqual(
    extractBracedBody(source, "const meta = {"),
    ' "description": "Workflow({name:\'implement\'})" ',
  );
});

test("T-426 extractBracedBody returns the inner text through the outer closing brace when an object literal is nested inside", () => {
  const source = 'const meta = { "outer": { "inner": 1 }, "after": "tail" };';
  assert.strictEqual(
    extractBracedBody(source, "const meta = {"),
    ' "outer": { "inner": 1 }, "after": "tail" ',
  );
});
