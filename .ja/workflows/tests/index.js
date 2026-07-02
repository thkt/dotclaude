// Node v26 は `node --test <dir>` でディレクトリを走査せず entry module として spawn する。
// この index がディレクトリ解決の入口になり、配下の全 *.test.js / *.test.mjs を読み込む。
import { readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
for (const name of readdirSync(here)
  .filter((f) => f.endsWith(".test.js") || f.endsWith(".test.mjs"))
  .sort()) {
  await import(pathToFileURL(join(here, name)).href);
}
