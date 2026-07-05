// Node v26 does not scan directories passed to `node --test <dir>`; it spawns them as entry modules.
// This index is the entry point for `node --test workflows/tests/` and recursively loads every
// *.test.js under workflows/, so tests can live in the subdir of the workflow they exercise.
import { readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const workflowsRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

function* testFiles(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) =>
    a.name.localeCompare(b.name),
  )) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* testFiles(full);
    } else if (entry.name.endsWith(".test.js")) {
      yield full;
    }
  }
}

for (const file of testFiles(workflowsRoot)) {
  await import(pathToFileURL(file).href);
}
