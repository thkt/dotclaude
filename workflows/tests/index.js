// Node v26 does not scan directories passed to `node --test <dir>`; it spawns them as entry modules.
// This index is the directory's module entry point and loads every *.test.js / *.test.mjs beneath it.
import { readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
for (const name of readdirSync(here)
  .filter((f) => f.endsWith(".test.js") || f.endsWith(".test.mjs"))
  .sort()) {
  await import(pathToFileURL(join(here, name)).href);
}
