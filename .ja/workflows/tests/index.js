// Node v26 は `node --test <dir>` でディレクトリを走査せず entry module として spawn する。
// この index が `node --test workflows/tests/` の入口になり、workflows/ 配下の全 *.test.js を
// 再帰的に読み込む。テストは対象ワークフローの subdir に置ける。
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
