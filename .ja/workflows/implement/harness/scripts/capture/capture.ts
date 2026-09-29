// ~/.agents/scripts/capture/capture.ts の複製。正本は向こうなので、先にそちらを編集する。
// 差分: ヘルパーは export しない (ここから import する先が無い)。出力は console でなく
// process.stdout と process.stderr に書く。import.meta.dir は import.meta.dirname に置き換えた。
import assert from "node:assert/strict";
import { access, writeFile, readFile, realpath, readdir, lstat } from "node:fs/promises";
import { resolve, isAbsolute } from "node:path";
import { pathToFileURL } from "node:url";
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import { isRecord, outside } from "../shared/values.ts";

// ブラウザーを固定した事前確認は、別のブラウザーで動く対象を弾いてしまう。
function captureUnavailable(report: unknown) {
  const text = JSON.stringify(report);
  return (
    /(?:browserType\.)?launch:[^"\n]*(?:Executable doesn't exist|Failed to launch|Host system is missing dependencies)|listen (?:EACCES|EPERM)|Process from config\.webServer was not able to start/.test(
      text,
    ) ||
    /(?:browserType\.)?launch: Target page, context or browser has been closed[^"\n]*bootstrap_check_in[^"\n]*Permission denied \(1100\)/.test(
      text,
    )
  );
}

function reportTests(
  suites: unknown,
  root: string,
): { file: string; test: Record<string, unknown> }[] {
  if (!Array.isArray(suites)) {
    return [];
  }
  return suites.filter(isRecord).flatMap((suite) => {
    const specs = Array.isArray(suite.specs) ? suite.specs.filter(isRecord) : [];
    const tests = specs.flatMap((item) => {
      if (typeof item.file !== "string" || !Array.isArray(item.tests)) {
        return [];
      }
      const file = resolve(root, item.file);
      return item.tests.filter(isRecord).map((test) => ({ file, test }));
    });
    return [...tests, ...reportTests(suite.suites, root)];
  });
}

function executedCapture(value: Record<string, unknown>, root: string, spec: string) {
  const tests = reportTests(value.suites, root);
  return (
    tests.some((item) => item.file === spec) &&
    tests.every(
      ({ test }) =>
        test.status === "expected" &&
        test.expectedStatus === "passed" &&
        Array.isArray(test.results) &&
        test.results.length > 0 &&
        test.results.every((result: unknown) => isRecord(result) && result.status === "passed"),
    )
  );
}

function capturePassed(value: unknown, spec: string) {
  return (
    isRecord(value) &&
    isRecord(value.stats) &&
    typeof value.stats.expected === "number" &&
    Number.isInteger(value.stats.expected) &&
    value.stats.expected > 0 &&
    value.stats.skipped === 0 &&
    value.stats.unexpected === 0 &&
    value.stats.flaky === 0 &&
    Array.isArray(value.errors) &&
    value.errors.length === 0 &&
    isRecord(value.config) &&
    typeof value.config.rootDir === "string" &&
    executedCapture(value, value.config.rootDir, spec)
  );
}

function mediaSignature(name: string, bytes: Buffer) {
  return /\.png$/i.test(name)
    ? bytes.subarray(0, 8).equals(Buffer.from("89504e470d0a1a0a", "hex"))
    : /\.jpe?g$/i.test(name)
      ? bytes.subarray(0, 3).equals(Buffer.from("ffd8ff", "hex"))
      : /\.webp$/i.test(name)
        ? bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP"
        : /\.mp4$/i.test(name)
          ? bytes.toString("ascii", 4, 8) === "ftyp"
          : /\.webm$/i.test(name) && bytes.subarray(0, 4).equals(Buffer.from("1a45dfa3", "hex"));
}

async function validateCaptureMedia(output: string) {
  const names = await readdir(output);
  assert(names.length, "Capture succeeded without required media");
  for (const name of names) {
    const file = resolve(output, name);
    assert((await lstat(file)).isFile(), `Invalid capture output: ${name}`);
    const bytes = await readFile(file);
    assert(bytes.length > 12 && mediaSignature(name, bytes), `Invalid capture media: ${name}`);
  }
}

// 外側のプロセスグループ・タイムアウト・出力ディレクトリは呼び出し側が持つ。
async function capture() {
  const [specPath, configPath, output] = process.argv.slice(2);
  if (!specPath || !configPath || !output || !isAbsolute(output)) {
    throw Error("Usage: bun scripts/capture/capture.ts SPEC CONFIG ABSOLUTE_OUTPUT");
  }
  const cwd = await realpath(process.cwd());
  const spec = resolve(cwd, specPath);
  await access(spec);
  const configFile = resolve(cwd, configPath);
  await access(configFile);
  const outputPath = await realpath(output);
  assert(outside(cwd, outputPath), "Capture output must be outside checkout");
  assert((await readdir(outputPath)).length === 0, "Capture output must be fresh");
  const requireTarget = createRequire(configFile);
  let cli: string;
  try {
    cli = requireTarget.resolve("@playwright/test/cli");
  } catch (error) {
    process.stderr.write(`Target Playwright is unavailable ${String(error)}\n`);
    process.exitCode = 78;
    return;
  }
  const report = `${outputPath}.report.json`;
  const config = `${outputPath}.config.mjs`;
  await writeFile(
    config,
    `import base from ${JSON.stringify(pathToFileURL(configFile).href)};
import { captureConfig } from ${JSON.stringify(pathToFileURL(resolve(import.meta.dirname, "config.ts")).href)};
export default captureConfig(base, ${JSON.stringify(configFile)}, ${JSON.stringify(spec)}, ${JSON.stringify(outputPath)});
`,
    { flag: "wx" },
  );
  const child = spawn(process.execPath, [cli, "test", "--config", config], {
    cwd,
    env: { ...process.env, CAPTURE_OUTPUT: outputPath },
    stdio: "inherit",
  });
  const code = await new Promise<number | null>((done) => {
    child.once("error", (error) => {
      process.stderr.write(`Playwright could not start ${String(error)}\n`);
      done(null);
    });
    child.once("close", done);
  });
  if (code === null) {
    process.exitCode = 78;
    return;
  }
  const value: unknown = JSON.parse(await readFile(report, "utf8"));
  if (code !== 0 && captureUnavailable(value)) {
    process.exitCode = 78;
    return;
  }
  assert(
    code === 0 && capturePassed(value, spec),
    `Capture must execute all registered tests successfully; report: ${report}`,
  );
  await validateCaptureMedia(outputPath);
  process.stdout.write(`Capture passed; report: ${report}\n`);
}

if (import.meta.main) {
  try {
    await capture();
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}
