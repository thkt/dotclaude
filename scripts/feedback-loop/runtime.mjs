// 生成元: thkt/feedback-loop scripts/build.ts。直接編集せず、正本を変更して再生成してください
// バージョン: 0.5.5
// src/runtime.ts
import assert12 from "node:assert/strict";
import { readFileSync as readFileSync5 } from "node:fs";
import { basename, join as join11 } from "node:path";
import { fileURLToPath as fileURLToPath2 } from "node:url";
import { parseArgs } from "node:util";

// src/changes.ts
import assert3 from "node:assert/strict";
import { existsSync as existsSync2 } from "node:fs";
import { join as join2 } from "node:path";

// src/git.ts
import assert2 from "node:assert/strict";
import { execFile, spawnSync } from "node:child_process";
import { posix, resolve } from "node:path";

// src/values.ts
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { isAbsolute } from "node:path";
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function assertObject(value) {
  assert(isRecord(value), "オブジェクトが必要です");
}
function assertStringArray(value, name) {
  assert(Array.isArray(value) && value.every((item) => typeof item === "string" && item.trim().length > 0), `${name}は空でない文字列の配列で指定してください`);
}
function isRepoRelativePath(path) {
  return !isAbsolute(path) && !path.split("/").includes("..") && !path.startsWith("./") && !path.includes("\\");
}
function assertRepoRelativePath(path) {
  assert(isRepoRelativePath(path), `repo相対パスが必要です: ${path}`);
}
function stringRecord(value) {
  assertObject(value);
  const result = {};
  for (const [key, item] of Object.entries(value)) {
    assert(typeof item === "string", `${key}は文字列で指定してください`);
    result[key] = item;
  }
  return result;
}
function shellQuote(argument) {
  return /^[\w./-]+$/.test(argument) ? argument : `'${argument.replaceAll("'", "'\\''")}'`;
}
function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}
function hasErrorCode(error, code) {
  return error instanceof Error && "code" in error && error.code === code;
}
function sha256(body) {
  return createHash("sha256").update(body).digest("hex");
}

// src/git.ts
function gitOutput(root, args, env) {
  const result = spawnSync("git", args, { cwd: root, encoding: "utf8", env });
  return result.status === 0 ? result.stdout.trim() : undefined;
}
function resolveCommit(root, ref, subject) {
  const unreadable = `${subject}をGitのcommitとして読めません: ${ref}`;
  assert2(!ref.startsWith("-"), unreadable);
  let commit = ref;
  for (const revision of [(id) => id, (id) => `${id}^{commit}`]) {
    const result = spawnSync("git", ["rev-parse", "--verify", revision(commit)], {
      cwd: root,
      encoding: "utf8"
    });
    commit = result.status === 0 ? result.stdout.trim() : "";
    if (!/^[0-9a-f]{40,64}$/.test(commit)) {
      const reason = result.error?.message ?? result.stderr.trim();
      assert2.fail(reason ? `${unreadable}（${reason}）` : unreadable);
    }
  }
  return commit;
}
function defaultBase(root) {
  const verified = (ref) => gitOutput(root, ["rev-parse", "--verify", "--quiet", ref]);
  const remoteHead = gitOutput(root, [
    "symbolic-ref",
    "--quiet",
    "--short",
    "refs/remotes/origin/HEAD"
  ]);
  if (remoteHead) {
    const commit = verified(`refs/remotes/${remoteHead}`);
    return commit ? { base: remoteHead, commit } : { base: null, reason: `origin/HEADの指す先の${remoteHead}がありません` };
  }
  for (const [prefix, label] of [
    ["refs/remotes/origin/", "origin/"],
    ["refs/heads/", ""]
  ]) {
    const found = ["main", "master"].flatMap((name) => {
      const commit = verified(`${prefix}${name}`);
      return commit ? [{ base: `${label}${name}`, commit }] : [];
    });
    if (found.length === 1 && found[0]) {
      return found[0];
    }
    if (found.length > 1) {
      return { base: null, reason: `${label}mainと${label}masterの両方があります` };
    }
  }
  return { base: null, reason: "origin/HEADがなく、mainもmasterもありません" };
}

class NoMergeBase extends Error {
}
function git(root, args) {
  return new Promise((done, fail) => {
    execFile("git", args, { cwd: root, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) {
        fail(new Error(`git ${args.join(" ")} failed: ${stderr}`));
      } else {
        done(stdout);
      }
    });
  });
}
function nulSeparated(text) {
  return text.split("\x00").filter((path) => path !== "");
}
async function changesSince(root, base, existingOnly = false) {
  const [merged, untracked, shown] = await Promise.all([
    git(root, ["merge-base", base, "HEAD"]).catch((error) => {
      throw new NoMergeBase(errorMessage(error));
    }),
    git(root, ["ls-files", "--others", "--exclude-standard", "-z"]),
    git(root, ["rev-parse", "--show-prefix"])
  ]);
  const comparison = merged.trim();
  const tracked = nulSeparated(await git(root, [
    "diff",
    "--name-only",
    "--no-renames",
    "--no-relative",
    ...existingOnly ? ["--diff-filter=d"] : [],
    "-z",
    comparison
  ]));
  const prefix = shown.trim();
  const up = "../".repeat(prefix.split("/").filter(Boolean).length);
  const inside = tracked.filter((path) => path.startsWith(prefix));
  return {
    comparison,
    changed: [
      ...new Set([...inside.map((path) => path.slice(prefix.length)), ...nulSeparated(untracked)])
    ],
    outside: tracked.filter((path) => !path.startsWith(prefix)).map((path) => posix.relative(prefix, path)),
    top: resolve(root, up)
  };
}
async function untrackedAmong(root, paths) {
  return paths.length === 0 ? [] : nulSeparated(await git(root, ["ls-files", "--others", "--exclude-standard", "-z", "--", ...paths]));
}
async function changesWithStatus(root, base) {
  const [merged, shown, untracked] = await Promise.all([
    git(root, ["merge-base", base, "HEAD"]).catch((error) => {
      throw new NoMergeBase(errorMessage(error));
    }),
    git(root, ["rev-parse", "--show-prefix"]),
    git(root, ["ls-files", "--others", "--exclude-standard", "--full-name", "-z", "--", ":/"])
  ]);
  const prefix = shown.trim();
  const fromRoot = (path) => posix.relative(prefix, path);
  const fields = nulSeparated(await git(root, [
    "diff",
    "--name-status",
    "--no-renames",
    "--no-relative",
    "-z",
    merged.trim()
  ]));
  return [
    ...fields.flatMap((status, index) => index % 2 === 0 ? [{ status, path: fromRoot(fields[index + 1] ?? "") }] : []),
    ...nulSeparated(untracked).map((path) => ({ status: "A", path: fromRoot(path) }))
  ];
}

// src/lockfiles.ts
import { existsSync } from "node:fs";
import { dirname, join, relative, resolve as resolve2, sep } from "node:path";

// src/installed.ts
var packageManagers = ["bun", "npm", "pnpm"];
var installedDirectory = "scripts/feedback-loop";
var runtimePath = `${installedDirectory}/runtime.mjs`;
var recorderPath = `${installedDirectory}/record-modules.ts`;
var improveTestsPath = `${installedDirectory}/improve-tests.md`;
var mutationPreloadPath = `${installedDirectory}/mutation-preload.ts`;

// src/lockfiles.ts
var lockfileManagers = [
  ["bun.lock", "bun"],
  ["package-lock.json", "npm"],
  ["yarn.lock", "yarn"],
  ["pnpm-lock.yaml", "pnpm"]
];
var supportedManagers = packageManagers;
var lockfileNames = lockfileManagers.filter(([, manager]) => supportedManagers.includes(manager)).map(([name]) => name);
function lockfilesIn(directory) {
  return lockfileManagers.filter(([name]) => existsSync(join(directory, name))).map(([name, manager]) => ({ name, manager }));
}
function ancestors(root, top) {
  const found = [];
  let directory = root;
  while (directory !== top && directory.startsWith(top + sep)) {
    directory = dirname(directory);
    found.push(directory);
  }
  return found;
}
function fromRoot(root, path) {
  return relative(root, resolve2(root, path)).split(sep).join("/");
}
function ancestorLockfileCandidates(root, top, manager) {
  if (lockfilesIn(root).length > 0) {
    return [];
  }
  const name = lockfileManagers.find(([, owner]) => owner === manager)?.[0];
  return name === undefined ? [] : ancestors(root, top).map((directory) => fromRoot(root, join(directory, name)));
}

// src/changes.ts
var baseVariable = "FEEDBACK_LOOP_BASE";
function undecidable(root, reason) {
  const hasOrigin = gitOutput(root, ["remote", "get-url", "origin"]) !== undefined;
  return assert3.fail(`比較元を決められません（${reason}）。差分を取る比較元を、.feedback-loop.jsonのbase` + (hasOrigin ? '（例: "origin/main"）か、git remote set-head origin --autoで決めてください' : '（例: "main"）で決めてください'));
}
function runtimeBase(option) {
  const variable = process.env[baseVariable];
  delete process.env[baseVariable];
  if (option !== undefined) {
    return { ref: option, from: "option" };
  }
  if (variable === undefined) {
    return;
  }
  const ref = variable.trim();
  assert3(ref !== "", `${baseVariable}には参照を指定してください`);
  return { ref, from: "environment" };
}
var runtimeSources = {
  option: { subject: "--baseに指定した参照", runtime: "実行時の指定" },
  environment: { subject: `${baseVariable}に指定した参照`, runtime: `${baseVariable}の指定` }
};
function specifiedBase(config, specified) {
  if (specified !== undefined) {
    return { ...runtimeSources[specified.from], ref: specified.ref };
  }
  return config.base === undefined ? undefined : { subject: ".feedback-loop.jsonのbase", ref: config.base };
}
function comparisonBase(root, config, runtime) {
  const specified = specifiedBase(config, runtime);
  if (specified !== undefined) {
    return { ...specified, commit: resolveCommit(root, specified.ref, specified.subject) };
  }
  const found = defaultBase(root);
  if (found.base === null) {
    return undecidable(root, found.reason);
  }
  return { subject: "既定の比較元", ref: found.base, commit: found.commit };
}
function failWithoutMergeBase(base) {
  return (error) => {
    if (error instanceof NoMergeBase) {
      assert3.fail(`${base.subject}とHEADの分岐点を求められません: ${base.ref}（${error.message}）`);
    }
    throw error;
  };
}
function changesFrom(root, base, existingOnly = false) {
  return changesSince(root, base.commit, existingOnly).catch(failWithoutMergeBase(base));
}
function statusChangesFrom(root, base) {
  return changesWithStatus(root, base.commit).catch(failWithoutMergeBase(base));
}
async function ancestorLockfile(root, top, outside, manager) {
  const path = ancestorLockfileCandidates(root, top, manager).find((candidate) => outside.includes(candidate) || existsSync2(join2(root, candidate)));
  if (path === undefined) {
    return;
  }
  const changed = outside.includes(path) || (await untrackedAmong(root, [path])).length > 0;
  return { path, changed, exists: existsSync2(join2(root, path)) };
}
async function affectedChanges(root, base, manager) {
  const { comparison, changed, outside, top } = await changesFrom(root, base);
  const lockfile = await ancestorLockfile(root, top, outside, manager);
  const lockfileChanges = lockfile?.changed ? [lockfile.path] : [];
  return {
    comparison,
    changed: [...changed, ...lockfileChanges],
    outside: outside.filter((path) => !lockfileChanges.includes(path)),
    lockfileChanges,
    ancestorLockfiles: lockfile?.exists ? [lockfile.path] : []
  };
}
async function existingChanges(root, base) {
  return (await changesFrom(root, base, true)).changed;
}

// src/classification.ts
import assert5 from "node:assert/strict";
import { lstatSync, readdirSync, statSync as statSync2 } from "node:fs";
import { join as join4 } from "node:path";

// src/config.ts
import assert4 from "node:assert/strict";
import { existsSync as existsSync3, readFileSync, realpathSync, statSync } from "node:fs";
import { isAbsolute as isAbsolute2, join as join3, relative as relative2, resolve as resolve3, sep as sep2 } from "node:path";
var configKeys = {
  runner: true,
  base: true,
  collect: true,
  testGlobs: true,
  assurance: true,
  prepare: true,
  bunArgs: true,
  bunWorkers: true,
  testArgs: true,
  allowSkipped: true,
  mutation: true,
  commitHook: true,
  globalChanges: true,
  ignoredChanges: true,
  dependencies: true
};
function readConfig(root) {
  const value = JSON.parse(readFileSync(join3(root, ".feedback-loop.json"), "utf8"));
  assertObject(value);
  const unknownKeys = Object.keys(value).filter((key) => !Object.hasOwn(configKeys, key));
  assert4(unknownKeys.length === 0, `.feedback-loop.jsonの未知のキーです: ${unknownKeys.join(", ")}`);
  assert4(value.runner === "bun" || value.runner === "vitest", "runnerはbunまたはvitestです");
  if (value.base !== undefined) {
    assert4(typeof value.base === "string" && value.base.trim().length > 0, "比較元baseが必要です");
  }
  const {
    collect,
    testGlobs,
    prepare = [],
    testArgs = [],
    globalChanges = [],
    ignoredChanges = [],
    bunArgs = [],
    bunWorkers = 4,
    allowSkipped = true,
    mutation = true,
    commitHook = true,
    assurance: assuranceValue = [],
    dependencies: dependenciesValue = []
  } = value;
  if (collect !== undefined || value.runner === "vitest") {
    assertStringArray(collect, "collect");
    assert4(collect.length > 0, "収集コマンドは空にできません");
  }
  assertStringArray(testGlobs, "testGlobs");
  assertStringArray(prepare, "prepare");
  assertStringArray(testArgs, "testArgs");
  assertStringArray(globalChanges, "globalChanges");
  assertStringArray(ignoredChanges, "ignoredChanges");
  assert4(testGlobs.length > 0, "テストglobは必須です");
  assert4(typeof allowSkipped === "boolean", "allowSkippedはbooleanです");
  assert4(typeof mutation === "boolean", "mutationはbooleanです");
  assert4(typeof commitHook === "boolean", "commitHookはbooleanです");
  assertStringArray(bunArgs, "bunArgs");
  assert4(value.runner === "bun" || bunArgs.length === 0, "VitestにはbunArgsを指定できません");
  assert4(typeof bunWorkers === "number" && Number.isSafeInteger(bunWorkers) && bunWorkers > 0, "bunWorkersは正の安全な整数で指定してください");
  assert4(value.runner === "bun" || value.bunWorkers === undefined, "VitestにはbunWorkersを指定できません");
  if (value.runner === "bun") {
    assert4(![...bunArgs, ...testArgs].some((arg) => /^--(?:no-)?(?:isolate|parallel)(?:=|$)/.test(arg)), "テストファイルごとの分離は固定です。並列数はbunWorkersで指定してください");
  }
  assert4(Array.isArray(assuranceValue), "assurance配列が必要です");
  const assurance = assuranceValue.map((item) => {
    assertObject(item);
    assert4(typeof item.path === "string" && typeof item.reason === "string" && item.reason.trim().length > 0, "assuranceにはpathと指定理由が必要です");
    assertRepoRelativePath(item.path);
    return { path: item.path, reason: item.reason };
  });
  assert4(Array.isArray(dependenciesValue), "dependencies配列が必要です");
  const dependencies = dependenciesValue.map((item) => {
    assertObject(item);
    assertStringArray(item.inputs, "dependenciesのinputs");
    assertStringArray(item.tests, "dependenciesのtests");
    assert4(item.inputs.length > 0 && item.tests.length > 0, "依存対応は空にできません");
    item.inputs.forEach(assertRepoRelativePath);
    item.tests.forEach(assertRepoRelativePath);
    return { inputs: item.inputs, tests: item.tests };
  });
  testGlobs.forEach(assertRepoRelativePath);
  globalChanges.forEach(assertRepoRelativePath);
  ignoredChanges.forEach(assertRepoRelativePath);
  return {
    runner: value.runner,
    base: value.base,
    collect,
    testGlobs,
    assurance,
    prepare,
    bunArgs,
    bunWorkers,
    testArgs,
    allowSkipped,
    mutation,
    commitHook,
    globalChanges,
    ignoredChanges,
    dependencies
  };
}
function matches(path, glob) {
  let pattern = "^";
  for (let i = 0;i < glob.length; i++) {
    const char = glob[i] ?? "";
    if (glob.slice(i, i + 3) === "**/") {
      pattern += "(?:.*/)?";
      i += 2;
    } else if (glob.slice(i, i + 2) === "**") {
      pattern += ".*";
      i++;
    } else if (char === "*") {
      pattern += "[^/]*";
    } else if (char === "?") {
      pattern += "[^/]";
    } else {
      pattern += char.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }
  }
  return new RegExp(`${pattern}$`).test(path);
}
var mutantsRecordFile = "mutator.accepted.json";
var fullRunGlobs = [
  "package.json",
  ...lockfileNames,
  "tsconfig.json",
  ".feedback-loop.json",
  `${installedDirectory}/**`
];
function isTestFile(path, config) {
  return config.testGlobs.some((glob) => matches(path, glob));
}
function requiresFullRun(path, config) {
  return [...fullRunGlobs, ...config.globalChanges].some((glob) => matches(path, glob));
}
function ignoresChange(path, config) {
  return config.ignoredChanges.some((glob) => matches(path, glob));
}
function isAssurance(path, config) {
  return config.assurance.some((entry) => entry.path === path);
}
function mappedTests(path, config) {
  return config.dependencies.filter((entry) => entry.inputs.some((glob) => matches(path, glob))).flatMap((entry) => entry.tests);
}
function isFile(path) {
  try {
    return statSync(path).isFile();
  } catch (error) {
    if (["ENOENT", "ENOTDIR", "ENAMETOOLONG"].some((code) => hasErrorCode(error, code))) {
      return false;
    }
    throw error;
  }
}
function repoPath(root, path) {
  const absolute = resolve3(root, path);
  const canonical = existsSync3(absolute) ? realpathSync(absolute) : absolute;
  const local = relative2(root, canonical);
  return local !== ".." && !local.startsWith(`..${sep2}`) && !isAbsolute2(local) ? local.split(sep2).join("/") : absolute;
}

// src/classification.ts
function filesUnder(root, prefix, excludeHidden) {
  return readdirSync(join4(root, prefix), { withFileTypes: true }).flatMap((entry) => {
    const path = prefix + entry.name;
    if (entry.name === ".git" || entry.name === "node_modules" || excludeHidden && entry.isDirectory() && entry.name.startsWith(".")) {
      return [];
    }
    return entry.isDirectory() ? filesUnder(root, `${path}/`, excludeHidden) : entry.isFile() ? [path] : [];
  });
}
function entryExists(path) {
  try {
    return lstatSync(path, { throwIfNoEntry: false }) !== undefined;
  } catch {
    return false;
  }
}
function mismatchDiagnostic(root, config, collected, globbed) {
  const inCollected = new Set(collected);
  const inGlobbed = new Set(globbed);
  const missing = [];
  const unmatched = [];
  const unlisted = [];
  for (const path of collected.filter((candidate) => !inGlobbed.has(candidate))) {
    if (!entryExists(join4(root, path))) {
      missing.push(path);
    } else if (isTestFile(path, config)) {
      unlisted.push(path);
    } else {
      unmatched.push(path);
    }
  }
  const sides = [
    { label: "収集にあって実在しない", paths: missing },
    {
      label: "収集にあってtestGlobsに当たらない",
      paths: unmatched,
      guidance: "直し方: 上のパスがテストなら、.feedback-loop.jsonのtestGlobsへ、そのパスに当たるglobを足してください。globに当たるテストは、同じファイルのassuranceへ登録しなければqualityになります。" + (config.collect === undefined ? "テストでなければ、拡張子の前が.test・_test・.spec・_specにならない名前へ変えてください" : "テストでなければ、収集用コマンドの出力から外してください")
    },
    {
      label: "収集にあってtestGlobsに当たるが、探索で見つからない（シンボリックリンク、ディレクトリ、node_modules・.gitの下、表記の違いなど）",
      paths: unlisted
    },
    {
      label: "testGlobsに当たって収集にない",
      paths: globbed.filter((path) => !inCollected.has(path))
    }
  ];
  return [
    "通常収集とtestGlobsの集合が一致しません",
    ...sides.filter(({ paths }) => paths.length > 0).flatMap(({ label, paths, guidance }) => {
      const line = `${label}: ${JSON.stringify(paths.sort())}`;
      return guidance === undefined ? [line] : [line, guidance];
    })
  ].join(`
`);
}
var shownOutput = 200;
function outputEnds(stdout) {
  const head = `標準出力の先頭: ${JSON.stringify(stdout.slice(0, shownOutput))}`;
  return stdout.length > shownOutput ? `${head}。標準出力の末尾: ${JSON.stringify(stdout.slice(-shownOutput))}` : head;
}
function parseCollected(stdout) {
  let collected;
  try {
    collected = JSON.parse(stdout);
  } catch (error) {
    const reason = errorMessage(error).replaceAll(/\p{Cc}+/gu, " ").slice(0, shownOutput);
    assert5.fail(`収集用コマンドの標準出力をJSONとして読めません。標準出力にはJSONの文字列配列だけを出し、診断は標準エラーへ出してください。理由: ${reason}。${outputEnds(stdout)}`);
  }
  try {
    assertStringArray(collected, "収集用コマンドの標準出力");
  } catch {
    assert5.fail(`収集用コマンドの標準出力はJSONですが、空でない文字列だけの配列ではありません。${outputEnds(stdout)}`);
  }
  return collected;
}
function builtinTests(files) {
  return files.filter((path) => /(?:\.test|_test|\.spec|_spec)\.(?:js|jsx|ts|tsx|mjs|cjs|mts|cts)$/.test(path)).sort();
}
async function collectedTests(root, command, run) {
  const { stdout } = await run(command, { cwd: root, stdout: "capture" });
  const collected = parseCollected(stdout);
  collected.forEach(assertRepoRelativePath);
  assert5(new Set(collected).size === collected.length, "収集結果が重複しています");
  return collected;
}
async function classification(root, config, run) {
  const collection = config.collect === undefined ? { kind: "builtin" } : { kind: "command", command: config.collect };
  const prefixes = config.testGlobs.map((glob) => {
    const fixed = glob.split(/[*?]/, 1)[0] ?? "";
    return fixed.slice(0, fixed.lastIndexOf("/") + 1);
  });
  const roots = [...new Set(prefixes)].filter((prefix, _, all) => !all.some((parent) => parent !== prefix && prefix.startsWith(parent)));
  const files = roots.filter((prefix) => !prefix.split("/").some((part) => part === ".git" || part === "node_modules" || collection.kind === "builtin" && part.startsWith("."))).filter((prefix) => {
    const found = statSync2(join4(root, prefix), { throwIfNoEntry: false })?.isDirectory() ?? false;
    assert5(found || collection.kind === "command", `testGlobsの探索場所がありません: ${prefix}`);
    return found;
  }).flatMap((prefix) => filesUnder(root, prefix, collection.kind === "builtin"));
  const expected = files.filter((path) => isTestFile(path, config)).sort();
  const actual = collection.kind === "builtin" ? builtinTests(files) : await collectedTests(root, collection.command, run);
  if (JSON.stringify([...actual].sort()) !== JSON.stringify(expected)) {
    assert5.fail(mismatchDiagnostic(root, config, actual, expected));
  }
  const assurance = new Set(config.assurance.map((item) => item.path));
  assert5(assurance.size === config.assurance.length, "assurance指定が重複しています");
  assert5([...assurance].every((path) => expected.includes(path)), "assuranceに存在しないテストか集合外の指定があります");
  assert5(config.dependencies.every((item) => item.tests.every((path) => expected.includes(path))), "依存対応に集合外のテストがあります");
  return {
    all: expected,
    quality: expected.filter((path) => !assurance.has(path)),
    assurance: [...assurance]
  };
}

// src/bun.ts
import assert7 from "node:assert/strict";
import { existsSync as existsSync6 } from "node:fs";
import { mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import { join as join7 } from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";
import { stripVTControlCharacters } from "node:util";

// src/selection.ts
import { existsSync as existsSync4 } from "node:fs";
import { join as join5 } from "node:path";
function exemption(path, config, declared, reachesAssurance) {
  const mapped = mappedTests(path, config).length > 0;
  if (!mapped && isAssurance(path, config)) {
    return "assurance";
  }
  if (declared.has(path)) {
    return path === mutantsRecordFile ? "mutantsRecord" : "ignored";
  }
  return !mapped && reachesAssurance.has(path) ? "assuranceReach" : undefined;
}
function onlyMutantsRecord({ changed, outside }, declared, runner) {
  const outsideMayReachTests = runner === "vitest" && outside.length > 0;
  return changed.length === 1 && declared.has(mutantsRecordFile) && !outsideMayReachTests;
}
async function selectQuality({ root, config, quality, changes: affected }, source) {
  const { changed, lockfileChanges } = affected;
  const forcesFullRun = (path) => lockfileChanges.includes(path) || requiresFullRun(path, config);
  const declared = new Set;
  const changes = changed.map((path) => {
    const targets = [...quality.includes(path) ? [path] : [], ...mappedTests(path, config)];
    if (targets.length === 0 && !forcesFullRun(path) && (ignoresChange(path, config) || path === mutantsRecordFile)) {
      declared.add(path);
    }
    return { path, targets: targets.filter((test) => quality.includes(test)) };
  });
  if (onlyMutantsRecord(affected, declared, config.runner)) {
    return {
      kind: "exempt",
      ignored: [],
      mutantsRecord: [mutantsRecordFile],
      assurance: [],
      assuranceReach: []
    };
  }
  const fullRun = changes.filter(({ path }) => forcesFullRun(path) || config.runner === "vitest" && !declared.has(path) && !existsSync4(join5(root, path))).map(({ path }) => path);
  const reachability = await source.reach(changes, fullRun.length > 0);
  const selected = new Set(reachability?.always);
  const unreached = [];
  const exempt = { ignored: [], mutantsRecord: [], assurance: [], assuranceReach: [] };
  const reachesAssurance = reachability?.reachesAssurance ?? new Set;
  for (const { path, targets } of changes) {
    const reached = [...targets, ...reachability?.reached.get(path) ?? []];
    if (reached.length === 0 && reachability !== undefined && !fullRun.includes(path)) {
      const reason = exemption(path, config, declared, reachesAssurance);
      if (reason === undefined) {
        unreached.push(path);
      } else {
        exempt[reason].push(path);
      }
    }
    reached.forEach((file) => selected.add(file));
  }
  const reasons = [
    ...fullRun,
    ...unreached,
    ...source.fullRunReason === undefined ? [] : [source.fullRunReason]
  ];
  if (reasons.length > 0) {
    return { kind: "all", reasons, files: quality, assuranceReach: exempt.assuranceReach };
  }
  const files = quality.filter((file) => selected.has(file));
  if (files.length > 0) {
    return { kind: "some", files, assuranceReach: exempt.assuranceReach };
  }
  return Object.values(exempt).some((paths) => paths.length > 0) ? { kind: "exempt", ...exempt } : { kind: "none" };
}

// src/records.ts
import { spawnSync as spawnSync2 } from "node:child_process";
import { existsSync as existsSync5, mkdirSync, readFileSync as readFileSync2, renameSync, rmSync, writeFileSync } from "node:fs";
import { dirname as dirname2, join as join6, resolve as resolve4 } from "node:path";
import { fileURLToPath } from "node:url";
var recordsDirectoryName = ".feedback-loop-records";
function recordsPath(root) {
  return join6(root, recordsDirectoryName, "records.json");
}
function recordsDirectory(root) {
  const directory = join6(root, recordsDirectoryName);
  mkdirSync(directory, { recursive: true });
  writeFileSync(join6(directory, ".gitignore"), `*
`);
  return directory;
}
function readDependencyRecords(path) {
  let text;
  try {
    text = readFileSync2(path, "utf8");
  } catch (error) {
    return hasErrorCode(error, "ENOENT") ? { kind: "missing" } : { kind: "unreadable", error };
  }
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { kind: "invalid" };
  }
  if (!isRecord(parsed) || parsed.version !== 2 || !isRecord(parsed.tests)) {
    return { kind: "invalid" };
  }
  const entries = new Map;
  for (const [file, value] of Object.entries(parsed.tests)) {
    if (!isRecord(value) || typeof value.basis !== "string" || !isRecord(value.files)) {
      return { kind: "invalid" };
    }
    const files = {};
    for (const [module, hash] of Object.entries(value.files)) {
      if (typeof hash !== "string") {
        return { kind: "invalid" };
      }
      files[module] = hash;
    }
    entries.set(file, { basis: value.basis, files });
  }
  return { kind: "valid", entries };
}
function openRecords(root, changed, testFiles, ancestorLockfiles) {
  const path = recordsPath(root);
  const loaded = readDependencyRecords(path);
  const digests = new Map;
  const hash = (file) => digest(root, file, digests);
  const basis = sourceBasis(root, hash, ancestorLockfiles);
  const records = loaded.kind === "valid" ? validatedRecords(loaded.entries, changed, testFiles, hash, basis) : { kind: "unusable", reason: unusableReason(path, loaded) };
  return {
    records,
    save: ({ ran, failed }) => {
      if (loaded.kind === "unreadable") {
        throw loaded.error;
      }
      const entries = loaded.kind === "valid" ? loaded.entries : new Map;
      for (const [file, modules] of ran) {
        entries.set(file, {
          basis,
          files: Object.fromEntries([...modules].sort().map((module) => [module, hash(module)]))
        });
      }
      for (const file of failed) {
        entries.delete(file);
      }
      writeRecords(root, entries);
    }
  };
}
var noRecords = "依存記録がありません";
function unusableReason(path, loaded) {
  switch (loaded.kind) {
    case "missing":
      return noRecords;
    case "unreadable":
      return `${path} を読めないため、記録なしとして扱います: ${errorMessage(loaded.error)}`;
    case "invalid":
      return `${path} の形が不正なため、記録なしとして扱います`;
    default:
      return loaded;
  }
}
function digest(root, path, digests) {
  const cached = digests.get(path);
  if (cached !== undefined) {
    return cached;
  }
  const absolute = resolve4(root, path);
  const hash = existsSync5(absolute) ? sha256(readFileSync2(absolute)) : "missing";
  digests.set(path, hash);
  return hash;
}
function sourceBasis(root, hash, ancestorLockfiles) {
  const head = spawnSync2("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" });
  if (head.status !== 0) {
    throw new Error(`記録の基点を取得できません: ${head.stderr}`);
  }
  return JSON.stringify([
    head.stdout.trim(),
    process.version,
    process.versions.bun,
    ...[
      fileURLToPath(import.meta.url),
      join6(dirname2(fileURLToPath(import.meta.url)), "record-modules.ts")
    ].map(hash),
    ...[".feedback-loop.json", "bunfig.toml", "package.json", ...lockfileNames].map(hash),
    ...ancestorLockfiles.map(hash)
  ]);
}
function validatedRecords(entries, changed, testFiles, hash, basis) {
  try {
    const accounted = new Set(changed);
    const current = new Set(testFiles);
    const relevant = [...entries].filter(([file]) => current.has(file));
    const valid = new Map(relevant.filter(([, entry]) => entry.basis === basis && Object.entries(entry.files).every(([module, recorded]) => accounted.has(module) || recorded === hash(module))).map(([file, entry]) => [file, new Set(Object.keys(entry.files))]));
    if (valid.size !== relevant.length) {
      return { kind: "unusable", reason: "依存記録が古いため採用しません" };
    }
    return valid.size > 0 ? { kind: "usable", records: valid } : { kind: "unusable", reason: noRecords };
  } catch (error) {
    return { kind: "unusable", reason: `依存記録の入力を確認できません: ${String(error)}` };
  }
}
function writeAtomically(path, content) {
  const temp = `${path}.${process.pid}.tmp`;
  try {
    writeFileSync(temp, content);
    renameSync(temp, path);
  } finally {
    rmSync(temp, { force: true });
  }
}
function writeRecords(root, entries) {
  writeAtomically(join6(recordsDirectory(root), "records.json"), `${JSON.stringify({ version: 2, tests: Object.fromEntries(entries) }, null, 2)}
`);
}

// src/bun-report.ts
import assert6 from "node:assert/strict";
function elements(node, name) {
  return node.children.filter((child) => typeof child !== "string" && ("name" in child) && child.name === name);
}
function testcases(node) {
  return [...elements(node, "testcase"), ...elements(node, "testsuite").flatMap(testcases)];
}
function junitCount(node, name, fallback) {
  const value = node.attributes[name] ?? fallback;
  assert6(value !== undefined && /^\d+$/.test(value), `JUnitの${name}が不正です`);
  const result = Number(value);
  assert6(Number.isSafeInteger(result), `JUnitの${name}が不正です`);
  return result;
}
function counts(node, allowSkipped) {
  const tests = junitCount(node, "tests");
  const skipped = junitCount(node, "skipped");
  assert6(tests > 0 && skipped <= tests, "JUnitの完了件数が不正または0件です");
  assert6(allowSkipped || skipped === 0, "許可されていないskipがあります");
  assert6(junitCount(node, "failures") === 0 && junitCount(node, "errors", "0") === 0, "JUnitに失敗が記録されています");
  return { tests, skipped };
}
function readBunSuites(text, root) {
  const report = Bun.XML.parse(text, { compact: false });
  assert6(report.name === "testsuites", "Bun JUnitのrootがありません");
  const suites = new Map;
  for (const suite of elements(report, "testsuite")) {
    const file = suite.attributes.file;
    assert6(file && file.trim(), "JUnitのテストファイルがありません");
    const owner = repoPath(root, file);
    assert6(!suites.has(owner), `JUnitのファイルが重複しています: ${file}`);
    suites.set(owner, suite);
  }
  return { report, suites };
}
function readBunReport(text, root, candidates, allowSkipped) {
  const { report, suites } = readBunSuites(text, root);
  const total = counts(report, allowSkipped);
  const completed = new Map;
  let tests = 0;
  let skipped = 0;
  for (const [owner, suite] of suites) {
    const file = suite.attributes.file;
    assert6(candidates.has(owner), `JUnitに候補外のファイルがあります: ${file}`);
    const summary = counts(suite, allowSkipped);
    const cases = testcases(suite);
    assert6(cases.length === summary.tests, `JUnitのファイル別件数が一致しません: ${file}`);
    let skippedCases = 0;
    for (const item of cases) {
      assert6(item.attributes.file && repoPath(root, item.attributes.file) === owner, `JUnitのtestcaseのファイルが一致しません: ${file}`);
      assert6(elements(item, "failure").length === 0 && elements(item, "error").length === 0, `JUnitのtestcaseが失敗しています: ${file}`);
      if (elements(item, "skipped").length > 0) {
        skippedCases++;
      }
    }
    assert6(skippedCases === summary.skipped, `JUnitのskip件数が一致しません: ${file}`);
    tests += summary.tests;
    skipped += summary.skipped;
    completed.set(owner, summary.tests - summary.skipped);
  }
  assert6(tests === total.tests && skipped === total.skipped, "JUnitのファイル別件数と全体件数が一致しません");
  return completed;
}

// src/bun.ts
function recordsAfterSuccess(states) {
  const ran = new Map;
  const failed = [];
  for (const [file, state] of states) {
    if (state.status === "passed") {
      ran.set(file, state.modules);
    } else if (state.status !== "excluded") {
      failed.push(file);
    }
  }
  return { ran, failed };
}
function recordsAfterFailure(states) {
  const failed = [...states].filter(([, state]) => state.status !== "excluded").map(([file]) => file);
  return { ran: new Map, failed };
}
function recorderModule(value) {
  assertObject(value);
  assert7(typeof value.recorderEnv === "function" && typeof value.readRecords === "function", "記録器を読み込めません");
}
function hasNoChangedTests(comparison, report, recorded, stderr) {
  return comparison !== undefined && !existsSync6(report) && recorded.size === 0 && /^--changed: (?:\d+ changed files?, but no test files are affected|no changed files, nothing to run)\r?$/m.test(stripVTControlCharacters(stderr));
}
function bunTestArgv(config, files, report) {
  return [
    process.versions.bun ? process.execPath : "bun",
    ...config.bunArgs,
    "test",
    ...files.map((file) => `./${file}`),
    ...config.testArgs,
    `--parallel=${config.bunWorkers}`,
    "--reporter=junit",
    "--reporter-outfile",
    report
  ];
}
async function runBunBatch({ root, config, run }, batch) {
  const candidates = new Set(batch.files);
  const report = join7(batch.dir, "results.xml");
  const recordDir = join7(batch.dir, "records");
  await mkdir(recordDir, { recursive: true });
  const argv = [
    ...bunTestArgv(config, batch.files, report),
    ...batch.comparison === undefined ? [] : [`--changed=${batch.comparison}`]
  ];
  const { stderr } = await run(argv, {
    env: batch.recorder.recorderEnv(process.env, recordDir, batch.recorderFile)
  });
  const recorded = new Map([...await batch.recorder.readRecords(recordDir)].map(([owner, modules]) => [
    repoPath(root, owner),
    new Set([...modules].map((path) => repoPath(root, path)))
  ]));
  const results = hasNoChangedTests(batch.comparison, report, recorded, stderr) ? new Map : readBunReport(await readFile(report, "utf8"), root, candidates, config.allowSkipped);
  assert7(recorded.size === results.size && [...recorded.keys()].every((file) => results.has(file)), "読み込んだテストとJUnitのファイル集合が一致しません");
  assert7(batch.comparison !== undefined || results.size === candidates.size, "指定したテストの結果が欠落しています");
  return new Map([...results].map(([owner, count]) => {
    const modules = recorded.get(owner);
    assert7(modules, `完了したテストの依存記録がありません: ${owner}`);
    return [owner, { count, modules }];
  }));
}
async function runBunTests(ctx) {
  const { root, quality } = ctx;
  const { comparison, changed, ancestorLockfiles } = ctx.changes;
  const { records, save: saveRecords } = openRecords(root, changed, quality, ancestorLockfiles);
  const selected = await selectQuality(ctx, {
    fullRunReason: records.kind === "unusable" ? records.reason : undefined,
    async reach(changes) {
      const inputsByTest = new Map(records.kind === "usable" ? records.records : []);
      for (const { path, targets } of changes) {
        for (const test of targets) {
          inputsByTest.set(test, new Set([...inputsByTest.get(test) ?? [], path]));
        }
      }
      return {
        reached: new Map(changed.map((path) => [
          path,
          quality.filter((file) => inputsByTest.get(file)?.has(path))
        ])),
        always: quality.filter((file) => !inputsByTest.has(file))
      };
    }
  });
  if (selected.kind === "exempt" || selected.kind === "none") {
    return selected;
  }
  if (selected.kind === "all") {
    console.log(`quality全件の理由: ${selected.reasons.join(", ")}`);
  }
  const recorderFile = join7(root, recorderPath);
  const recorder = await import(pathToFileURL(recorderFile).href);
  recorderModule(recorder);
  const dir = await mkdtemp(join7(tmpdir(), "feedback-loop-"));
  const states = new Map;
  let outcome = "failed";
  try {
    const runBatch = async (files, compared, index) => {
      for (const file of files) {
        states.set(file, { status: "running" });
      }
      const results = await runBunBatch(ctx, {
        files,
        comparison: compared ? comparison : undefined,
        dir: join7(dir, String(index)),
        recorderFile,
        recorder
      });
      for (const file of files) {
        const result = results.get(file);
        states.set(file, result === undefined ? { status: "excluded" } : result.count > 0 ? { status: "passed", modules: result.modules } : { status: "skipped" });
      }
    };
    await runBatch(quality, selected.kind === "some", 0);
    if (selected.kind === "some") {
      const remaining = selected.files.filter((file) => states.get(file)?.status === "excluded");
      if (remaining.length > 0) {
        await runBatch(remaining, false, 1);
      }
    }
    const results = [...states.values()].filter((state) => state.status === "passed" || state.status === "skipped");
    console.log(`quality選択: ${results.length}件（Bunの実行結果と補完依存の和集合）`);
    assert7(results.length > 0, "候補0件: 関連テストがありません");
    assert7(results.some((state) => state.status === "passed"), "未実行: 選択したテストがすべてskipされています");
    outcome = "succeeded";
  } finally {
    try {
      saveRecords(outcome === "succeeded" ? recordsAfterSuccess(states) : recordsAfterFailure(states));
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }
  return { kind: "ran" };
}

// src/vitest.ts
import assert8 from "node:assert/strict";
import { dirname as dirname3, join as join8 } from "node:path";
import { readFileSync as readFileSync3 } from "node:fs";
import { mkdtemp as mkdtemp2, readFile as readFile2, rm as rm2 } from "node:fs/promises";
import { tmpdir as tmpdir2 } from "node:os";
import { createRequire } from "node:module";
import { pathToFileURL as pathToFileURL2 } from "node:url";
function vitestAPI(value) {
  assertObject(value);
  assert8(typeof value.parseCLI === "function" && typeof value.createVitest === "function", "導入版Vitestの公開収集APIを利用できません");
}
async function reachByVitest(context, { root, config, quality, changes: { outside } }, inside) {
  const reached = new Map;
  const always = [];
  const reachesAssurance = new Set;
  const experimental = context.config.experimental;
  const records = Boolean(experimental?.recordDependencies);
  const query = async (paths, recorded) => {
    if (experimental !== undefined && records) {
      experimental.recordDependencies = recorded;
    }
    context.config.related = paths.map((path) => join8(root, path));
    const specs = await context.getRelevantTestSpecifications();
    const files = specs.map((spec) => repoPath(root, spec.moduleId));
    const unknown = files.filter((file) => !quality.includes(file) && !isAssurance(file, config));
    assert8(unknown.length === 0, `Vitestの到達先がquality集合と一致しません: ${unknown.join(", ")}`);
    return files;
  };
  const unrecorded = new Set(records ? await query([runtimePath], true) : []);
  always.push(...quality.filter((file) => unrecorded.has(file)));
  const reachOf = async (...paths) => {
    const graph = await query(paths, false);
    const recorded = records ? (await query(paths, true)).filter((file) => !unrecorded.has(file)) : [];
    return {
      targets: quality.filter((file) => graph.includes(file) || recorded.includes(file)),
      assurance: {
        graph: graph.filter((file) => isAssurance(file, config)),
        recorded: recorded.filter((file) => isAssurance(file, config))
      }
    };
  };
  const assuranceOnly = new Map;
  for (const path of inside) {
    const reach = await reachOf(path);
    reached.set(path, reach.targets);
    if (reach.targets.length === 0 && reach.assurance.graph.length + reach.assurance.recorded.length > 0 && !isAssurance(path, config)) {
      assuranceOnly.set(path, reach.assurance);
    }
  }
  if (assuranceOnly.size > 0) {
    const unloadable = new Set(await query([runtimePath], false));
    for (const [path, tests] of assuranceOnly) {
      if (tests.recorded.length > 0 || tests.graph.some((test) => !unloadable.has(test))) {
        reachesAssurance.add(path);
      }
    }
  }
  if (outside.length > 0) {
    always.push(...(await reachOf(...outside)).targets);
  }
  return { reached, always, reachesAssurance };
}
async function selectVitest(ctx, apiPath) {
  const { config, quality } = ctx;
  return selectQuality(ctx, {
    async reach(changes, fullRunKnown) {
      if (fullRunKnown) {
        return;
      }
      const inside = changes.map(({ path }) => path).filter((path) => !quality.includes(path));
      const pending = [...inside, ...ctx.changes.outside];
      if (pending.length === 0) {
        return { reached: new Map, always: [], reachesAssurance: new Set };
      }
      const api = await import(pathToFileURL2(apiPath).href);
      vitestAPI(api);
      const parsed = api.parseCLI(["vitest", "related", ...pending, ...config.testArgs, "--run"]);
      const { exclude: parsedExclude, ...options } = parsed.options;
      const context = await api.createVitest("test", {
        ...options,
        ...parsedExclude === undefined ? {} : { cliExclude: [parsedExclude].flat() },
        watch: false
      });
      try {
        return await reachByVitest(context, ctx, inside);
      } finally {
        await context.close();
      }
    }
  });
}
function excludePattern(root, path) {
  const escapedRoot = root.replace(/(?<!\\)([()[\]{}*?|]|^!|[!+@](?=\())/g, "\\$&");
  return `${escapedRoot}/${path.replace(/[\\()[\]{}!*+?@|]/g, "\\$&")}`;
}
function vitestCli(root) {
  const packagePath = createRequire(join8(root, "package.json")).resolve("vitest/package.json");
  const installed = JSON.parse(readFileSync3(packagePath, "utf8"));
  assertObject(installed);
  assertObject(installed.bin);
  assert8(typeof installed.bin.vitest === "string", "Vitestの公開CLIがありません");
  return join8(dirname3(packagePath), installed.bin.vitest);
}
async function runVitestTests(ctx) {
  const { root, config, quality, run } = ctx;
  const require2 = createRequire(join8(root, "package.json"));
  const cli = vitestCli(root);
  const exclude = config.assurance.flatMap((entry) => [
    "--exclude",
    excludePattern(root, entry.path)
  ]);
  const env = { ...process.env };
  const selected = await selectVitest(ctx, require2.resolve("vitest/node"));
  if (selected.kind !== "none" && selected.assuranceReach.length > 0) {
    console.log(`assuranceのテストにしか届かない変更は、このコマンドでは確かめません。全体checkとCIで実行します: ${selected.assuranceReach.join(", ")}`);
  }
  if (selected.kind === "exempt" || selected.kind === "none") {
    return selected;
  }
  const selection = selected.kind === "all" ? ["run", ...quality] : ["related", ...selected.files, "--run"];
  if (selected.kind === "all") {
    console.log(`quality全件の理由: 設定変更、削除、または依存先不明: ${selected.reasons.join(", ")}`);
  }
  const dir = await mkdtemp2(join8(tmpdir2(), "feedback-vitest-"));
  try {
    const report = join8(dir, "results.json");
    await run([
      process.execPath,
      cli,
      ...selection,
      ...config.testArgs,
      ...exclude,
      "--reporter=default",
      "--reporter=json",
      `--outputFile=${report}`
    ], { env });
    const result = JSON.parse(await readFile2(report, "utf8"));
    assertObject(result);
    assert8(result.success === true && typeof result.numTotalTests === "number" && result.numTotalTests > 0, "Vitestが完了していません。候補0件または結果欠落");
    assert8(Array.isArray(result.testResults), "Vitestのファイル結果がありません");
    assert8(typeof result.numPassedTests === "number" && result.numPassedTests > 0, "未実行: Vitestで成功したテストがありません");
    if (!config.allowSkipped) {
      assert8(result.numPassedTests === result.numTotalTests, "未実行: Vitestにskipまたはtodoがあります");
    }
    const executed = result.testResults.map((item) => {
      assertObject(item);
      assert8(typeof item.name === "string", "Vitest結果のファイル名が不正です");
      return repoPath(root, item.name);
    });
    assert8(executed.length > 0 && executed.every((file) => quality.includes(file)), "Vitestの実行結果がquality集合と一致しません");
    const completed = new Set(executed);
    assert8(selected.files.every((file) => completed.has(file)), "Vitestの選択したテストの結果が欠落しています");
    console.log(`quality選択: ${completed.size}件（Vitestの実行結果）`);
  } finally {
    await rm2(dir, { recursive: true, force: true });
  }
  return { kind: "ran" };
}

// src/command.ts
import assert9 from "node:assert/strict";
import { spawn, spawnSync as spawnSync3 } from "node:child_process";
class ReportedFailure extends Error {
}
var reportedExitCode = 79;
var cancellationSignals = [
  "SIGINT",
  "SIGTERM",
  "SIGHUP"
];
var killAfterMs = 1000;
var graceMs = 1000;
function commandRunner(runtime, retryCommand) {
  return async (argv, options = {}) => {
    assert9(argv[0], "実行コマンドがありません");
    const {
      cwd = process.cwd(),
      env = process.env,
      stdout = "inherit",
      allowFailure = false,
      display = argv
    } = options;
    const log = stdout === "inherit" ? console.log : console.error;
    const operation = stdout === "capture" ? "収集" : "実行";
    log(`${operation}: ${display.join(" ")}; 再実行: ${retryCommand}`);
    const startupEnv = { ...env };
    delete startupEnv.BUN_OPTIONS;
    delete startupEnv.NODE_OPTIONS;
    return superviseCommand({
      command: process.execPath,
      args: [...process.versions.bun ? ["--no-env-file"] : [], runtime, "execute-child"],
      options: {
        stdio: ["inherit", stdout === "capture" ? "pipe" : stdout, "pipe", "ipc"],
        cwd,
        env: startupEnv,
        detached: true,
        serialization: "json"
      },
      message: {
        argv,
        env,
        allowFailure,
        relayStdout: stdout === "inherit" && !process.stdout.isTTY
      },
      monitorParent: false,
      childReports: true
    });
  };
}
async function runMonitor() {
  assert9(process.connected && typeof process.send === "function", "内部の検査監視には親とのIPC接続が必要です");
  const input = await new Promise((done, fail) => {
    const disconnected = () => {
      process.off("message", received);
      fail(new Error("検査の開始前に親との接続が切れました"));
    };
    const received = (value) => {
      process.off("disconnect", disconnected);
      done(value);
    };
    process.once("disconnect", disconnected);
    process.once("message", received);
  });
  assertObject(input);
  const { argv, env, allowFailure = false, relayStdout } = input;
  assert9(typeof allowFailure === "boolean");
  assert9(typeof relayStdout === "boolean");
  assert9(Array.isArray(argv) && argv.length > 0 && argv.every((arg) => typeof arg === "string"));
  const environment = stringRecord(env);
  process.stderr.on("error", () => {
    process.exitCode = 1;
    if (process.connected) {
      process.disconnect?.();
    }
  });
  const [command, ...args] = argv;
  assert9(command, "実行コマンドがありません");
  await superviseCommand({
    command,
    args,
    options: {
      stdio: ["inherit", relayStdout ? "pipe" : "inherit", "pipe"],
      cwd: process.cwd(),
      env: environment,
      detached: true,
      serialization: "json"
    },
    killAfterMs,
    monitorParent: true,
    childReports: false,
    relayStdout,
    allowFailure
  });
}
function nextState(state, event, killAfter) {
  if (event.type === "started") {
    return { state: { phase: "running" }, effects: [] };
  }
  if (event.type === "close") {
    return closeState(state);
  }
  return cancelState(state, event, killAfter);
}
function closeState(state) {
  return state.phase === "cancelling" ? {
    state: { phase: "finished", cancelled: true, signal: state.signal },
    effects: [{ type: "clearKill" }]
  } : { state: { phase: "finished", cancelled: false, signal: undefined }, effects: [] };
}
function cancelState(state, event, killAfter) {
  if (state.phase === "cancelling") {
    return { state, effects: [{ type: "signal", signal: event.signal }] };
  }
  if (state.phase !== "running") {
    return { state, effects: [] };
  }
  const effects = [{ type: "signal", signal: event.signal }];
  if (killAfter !== undefined) {
    effects.push({ type: "armKill", afterMs: killAfter });
  }
  return { state: { phase: "cancelling", signal: event.signal }, effects };
}
function commandResult(result, failure, state, output, allowFailure, childReports) {
  if ("error" in result) {
    throw result.error;
  }
  if (failure !== undefined) {
    assert9.fail(`子プロセスの終了を確認できません: ${String(failure.error)}`);
  }
  const outcome = judgeResult(state, result, { allowFailure, childReports });
  if (outcome.kind === "reported") {
    throw new ReportedFailure("監視プロセスが診断を表示しました");
  }
  if (outcome.kind === "failed") {
    assert9.fail(outcome.message);
  }
  if (result.signal !== null) {
    console.error(`コマンドが${result.signal}で終わりました`);
  }
  return output;
}
function judgeResult(state, exit, settings) {
  const userCancelled = state.phase === "finished" && state.cancelled;
  const failed = settings.allowFailure ? isCancellationSignal(exit.signal) : exit.code !== 0;
  if (userCancelled || failed) {
    return failedOutcome(exit, settings.childReports, userCancelled ? state.signal : undefined);
  }
  return { kind: "success" };
}
function isCancellationSignal(signal) {
  return cancellationSignals.some((cancellation) => cancellation === signal);
}
function failedOutcome(exit, childReports, cancelledBy) {
  if (childReports && exit.code === reportedExitCode) {
    return { kind: "reported" };
  }
  return {
    kind: "failed",
    message: `検査失敗または取消: ${cancelledBy ?? exit.signal ?? exit.code}`
  };
}
function signalProcessGroup(pgid, signal, kill = (pid, sent) => process.kill(pid, sent), readProcessList = listProcesses) {
  try {
    kill(-pgid, signal);
  } catch (error) {
    if (hasErrorCode(error, "ESRCH")) {
      return;
    }
    if (!hasErrorCode(error, "EPERM")) {
      return { error };
    }
    return deniedGroupFailure(pgid, error, readProcessList);
  }
  return;
}
function deniedGroupFailure(pgid, error, readProcessList) {
  try {
    return countLiveMembers(readProcessList(), pgid) === 0 ? undefined : { error };
  } catch (listError) {
    if (hasErrorCode(listError, "EPERM")) {
      console.error(`プロセスグループ${pgid}の終了を確かめられません。psの起動が拒否されました: ${errorMessage(listError)}`);
      return;
    }
    return {
      error: new Error(`${errorMessage(error)}。プロセスの一覧を読めません: ${errorMessage(listError)}`, { cause: error })
    };
  }
}
function listProcesses() {
  const result = spawnSync3("ps", ["-A", "-o", "pid=,pgid=,stat="], { encoding: "utf8" });
  if (result.error) {
    throw result.error;
  }
  assert9(result.status === 0, `psが${result.signal ?? result.status}で終わりました: ${result.stderr.trim()}`);
  return result.stdout;
}
function countLiveMembers(processList, pgid) {
  return processList.split(`
`).filter((line) => {
    const [, group, stat] = line.trim().split(/\s+/);
    return Number(group) === pgid && stat !== undefined && !stat.startsWith("Z");
  }).length;
}
function relay(output) {
  process.stdout.on("error", () => output.destroy());
  output.pipe(process.stdout, { end: false });
}
var relayDrainLimitBytes = 1024 * 1024;
function drainRelay(output) {
  output.unpipe(process.stdout);
  let drainedBytes = 0;
  output.on("data", (chunk) => {
    drainedBytes += chunk.length;
    if (drainedBytes > relayDrainLimitBytes) {
      console.error(`出力のpipe: 終了したプロセスの標準出力のpipeへ、別のプロセスが${relayDrainLimitBytes}バイトを超えて書き続けるため、閉じるのを待たずに終えます`);
      output.destroy();
      return;
    }
    if (!process.stdout.destroyed) {
      process.stdout.write(chunk);
    }
  });
  output.resume();
}
async function superviseCommand(command) {
  assert9(!command.monitorParent || process.connected, "検査の開始前に親との接続が切れました");
  let state = { phase: "starting" };
  let failure;
  const stop = (child, signal) => {
    if (child.pid === undefined) {
      return;
    }
    const sent = signal === "SIGHUP" && command.monitorParent ? "SIGTERM" : signal;
    const signalFailure = signalProcessGroup(child.pid, sent);
    failure ??= signalFailure;
  };
  let active;
  let killTimer;
  const perform = (effect) => {
    switch (effect.type) {
      case "clearKill":
        clearTimeout(killTimer);
        return;
      case "signal":
        if (active !== undefined) {
          stop(active, effect.signal);
        }
        return;
      case "armKill": {
        const target = active;
        if (target !== undefined) {
          killTimer = setTimeout(() => stop(target, "SIGKILL"), effect.afterMs);
          killTimer.unref();
        }
      }
    }
  };
  const transition = (event) => {
    const next = nextState(state, event, command.killAfterMs);
    state = next.state;
    for (const effect of next.effects) {
      perform(effect);
    }
  };
  let pipeWait;
  let stdout = "";
  let stdoutBytes = 0;
  let stderr = "";
  const cancel = (signal) => transition({ type: "cancel", signal });
  const terminate = () => cancel("SIGTERM");
  const collect = (chunk) => {
    stdoutBytes += Buffer.byteLength(chunk);
    if (stdoutBytes > 64 * 1024 * 1024) {
      failure ??= { error: new Error("テスト収集の出力が64MiBを超えました") };
      transition({ type: "cancel", signal: "SIGTERM" });
    } else {
      stdout += chunk;
    }
  };
  const sent = (error) => {
    if (error) {
      failure ??= { error };
      transition({ type: "cancel", signal: "SIGKILL" });
    }
  };
  for (const signal of cancellationSignals) {
    process.on(signal, cancel);
  }
  if (command.monitorParent) {
    process.on("disconnect", terminate);
  }
  try {
    const result = await new Promise((done) => {
      const child = spawn(command.command, command.args, command.options);
      const relayed = command.relayStdout === true ? child.stdout : null;
      child.once("error", (error) => done({ error }));
      child.once("close", (code, signal) => {
        transition({ type: "close" });
        done({ code, signal });
      });
      child.once("exit", () => {
        stop(child, "SIGKILL");
        if (relayed !== null) {
          drainRelay(relayed);
        }
        pipeWait = setTimeout(() => {
          for (const [name, pipe] of [
            ["標準出力", child.stdout],
            ["標準エラー", child.stderr]
          ]) {
            if (pipe !== null && !pipe.readableEnded && !pipe.destroyed) {
              console.error(`出力のpipe: 終了したプロセスの${name}のpipeを、別のプロセスが${graceMs}ミリ秒たっても開いたままのため、閉じるのを待たずに終えます`);
            }
            pipe?.destroy();
          }
        }, graceMs);
      });
      assert9(child.stderr);
      child.stderr.setEncoding("utf8");
      child.stderr.on("data", (chunk) => {
        if (!process.stderr.destroyed) {
          process.stderr.write(chunk);
        }
        stderr += chunk.slice(0, Math.max(0, 4096 - stderr.length));
      });
      if (relayed !== null) {
        relay(relayed);
      } else {
        child.stdout?.setEncoding("utf8");
        child.stdout?.on("data", collect);
      }
      active = child;
      transition({ type: "started" });
      if (command.message !== undefined) {
        child.send(command.message, sent);
      }
    });
    return commandResult(result, failure, state, { stdout, stderr }, command.allowFailure ?? false, command.childReports);
  } finally {
    for (const signal of cancellationSignals) {
      process.off(signal, cancel);
    }
    process.off("disconnect", terminate);
    clearTimeout(pipeWait);
    clearTimeout(killTimer);
    if (command.monitorParent && process.connected) {
      process.disconnect?.();
    }
  }
}

// src/mutation.ts
function disallowedChange(config, { status, path }) {
  if (path.startsWith("../")) {
    return `${path}（package.jsonのディレクトリの外の変更）`;
  }
  if (path.startsWith(".github/")) {
    return `${path}（.github/の下の変更）`;
  }
  if (status === "A") {
    return;
  }
  if (status === "D") {
    return `${path}（比較元にあるファイルの削除）`;
  }
  const editable = status === "M" && (path === mutantsRecordFile || isTestFile(path, config));
  return editable ? undefined : `${path}（テストのファイルと${mutantsRecordFile}の外の変更）`;
}
async function changesOutsideImprovement(root, config) {
  const changes = await statusChangesFrom(root, comparisonBase(root, config));
  return changes.flatMap((change) => {
    const reason = disallowedChange(config, change);
    return reason === undefined ? [] : [reason];
  });
}

// src/mutator.ts
import assert11 from "node:assert/strict";
import {
  existsSync as existsSync8,
  readdirSync as readdirSync2,
  mkdirSync as mkdirSync2,
  readFileSync as readFileSync4,
  realpathSync as realpathSync2,
  rmSync as rmSync2,
  writeFileSync as writeFileSync3
} from "node:fs";
import { createRequire as createRequire2 } from "node:module";
import { dirname as dirname4, join as join10 } from "node:path";
import { pathToFileURL as pathToFileURL3 } from "node:url";

// src/mutator-vitest.ts
import assert10 from "node:assert/strict";
import { existsSync as existsSync7, writeFileSync as writeFileSync2 } from "node:fs";
import { join as join9, resolve as resolve5 } from "node:path";
var projectsMessage = "test.projects を持つ Vitest の設定では、mutation を使えません";
var includeSourceMessage = "test.includeSource を持つ Vitest の設定では、mutation を使えません";
var configFlags = ["--config", "-c"];
var configNames = ["vitest.config", "vite.config"];
var configExtensions = ["ts", "mts", "cts", "js", "mjs", "cjs"];
function configFromTestArgs(testArgs) {
  let value;
  for (const [index, arg] of testArgs.entries()) {
    const flag = configFlags.find((name) => arg === name || arg.startsWith(`${name}=`));
    if (flag === undefined) {
      continue;
    }
    value = arg === flag ? testArgs[index + 1] : arg.slice(flag.length + 1);
    assert10(value !== undefined && value !== "" && !value.startsWith("-"), `testArgs の ${flag} に、Vitest の設定ファイルのパスがありません`);
  }
  return value;
}
function foundVitestConfig(root) {
  return configNames.flatMap((name) => configExtensions.map((extension) => join9(root, `${name}.${extension}`))).find((path) => existsSync7(path));
}
function generatedConfig(repoConfig, include) {
  const load = repoConfig === undefined ? `const loaded = {};
` : `import loaded from ${JSON.stringify(repoConfig)};
`;
  return `${load}export default async (env) => {
  const resolved = (await (typeof loaded === 'function' ? loaded(env) : loaded)) ?? {};
  if (resolved.test?.projects !== undefined) {
    throw new Error(${JSON.stringify(projectsMessage)});
  }
  if ((resolved.test?.includeSource ?? []).length > 0) {
    throw new Error(${JSON.stringify(includeSourceMessage)});
  }
  return { ...resolved, test: { ...resolved.test, include: ${JSON.stringify(include)} } };
};
`;
}
function vitestRunnerArgs(root, config) {
  const given = configFromTestArgs(config.testArgs);
  return (tests, directory) => {
    const file = join9(directory, "vitest.config.mjs");
    writeFileSync2(file, generatedConfig(given === undefined ? foundVitestConfig(root) : resolve5(root, given), tests.map((path) => excludePattern(root, path))));
    return ["--runner", "vitest", "--config", file];
  };
}

// src/mutator.ts
var bunDefaultTimeoutMs = 5000;
var timeoutFactor = 3;
var testFilePattern = /(?:\.test|_test|\.spec|_spec)\.(?:ts|tsx|mts|cts|js|jsx|mjs|cjs)$/;
var preloadOriginalVariable = "FEEDBACK_LOOP_MUTATION_BUN_OPTIONS";
var mutatorTestVariables = new Set([
  "MUTATOR_ACTIVE",
  "MUTATOR_BUN_MANIFEST",
  "MUTATOR_BUN_OUT",
  "MUTATOR_HIT_LIMIT",
  "MUTATOR_WATCH_PARENT"
]);
var wrappingGuide = "references/contract.mdの「ファイルの配置と接続」のとおり、環境変数はcheck:affectedとmutationのscriptを包んで渡してください";
function moduleFile(root, path) {
  const local = repoPath(root, path);
  assertRepoRelativePath(local);
  assert11(isFile(join10(root, local)), `対象のモジュールがrepoの中のファイルではありません: ${path}`);
  return local;
}
function escapeGlob(path) {
  return path.replace(/[*?[\]{}()]/g, "[$&]");
}
function testTimeoutMs(testArgs) {
  let value;
  for (const [index, arg] of testArgs.entries()) {
    if (arg === "--timeout") {
      value = testArgs[index + 1];
    } else if (arg.startsWith("--timeout=")) {
      value = arg.slice("--timeout=".length);
    }
  }
  if (value === undefined) {
    return bunDefaultTimeoutMs;
  }
  const parsed = Number(value);
  assert11(Number.isSafeInteger(parsed) && parsed > 0, `testArgsの--timeoutを正の整数として読めません: ${value}`);
  return parsed;
}
function testBunArgs(bunArgs) {
  const offending = bunArgs.find((arg) => !arg.startsWith("-") || /\s/.test(arg));
  assert11(offending === undefined, `bunArgsの「${offending}」は、mutationでは渡せません。壊し方を実行せずに止めます。bunArgsの各要素は-で始め、空白を含めず、値を取る引数は--env-file=.env.testのように=でつないでください。スクリプトなら、${wrappingGuide}`);
  return bunArgs;
}
function assertInstallOnlyBunfig(root) {
  const path = join10(root, "bunfig.toml");
  if (!existsSync8(path)) {
    return;
  }
  let table = "";
  for (const raw of readFileSync4(path, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    const header = /^\[\[?\s*([^\]]+?)\s*\]\]?\s*(?:#.*)?$/.exec(line);
    if (header) {
      table = header[1] ?? "";
    } else if (line !== "" && !line.startsWith("#")) {
      assert11(table === "install" || table.startsWith("install.") || table === "" && line.startsWith("install."), "bunfig.tomlが[install]のほかの設定を持つため、壊し方を実行せずに止めます。mutationは導入先のbunfig.tomlを引き継がず、[install]だけのbunfig.tomlで動きます");
    }
  }
}
function resolveMutator(root) {
  for (let directory = root;; directory = dirname4(directory)) {
    const manifest = join10(directory, "node_modules", "@mizchi", "mutator", "package.json");
    if (existsSync8(manifest)) {
      return join10(dirname4(realpathSync2(manifest)), "dist", "index.js");
    }
    if (dirname4(directory) === directory) {
      return assert11.fail(`@mizchi/mutatorを読み込めません。導入先のdevDependenciesに固定版で入れてください: ${root}から親のディレクトリのnode_modulesにありません`);
    }
  }
}
function bunTestFiles(root, directory = "") {
  return readdirSync2(join10(root, directory), { withFileTypes: true }).flatMap((entry) => {
    const path = directory === "" ? entry.name : `${directory}/${entry.name}`;
    if (entry.isDirectory()) {
      return entry.name === "node_modules" || entry.name.startsWith(".") ? [] : bunTestFiles(root, path);
    }
    return testFilePattern.test(entry.name) ? [path] : [];
  });
}
function mutatorFiles(root) {
  const directory = join10(recordsDirectory(root), "mutator");
  mkdirSync2(directory, { recursive: true });
  const config = join10(directory, "mutator.config.json");
  writeFileSync3(config, `{}
`);
  const report = join10(directory, "report");
  rmSync2(report, { recursive: true, force: true });
  mkdirSync2(join10(root, ".mutator"), { recursive: true });
  writeFileSync3(join10(root, ".mutator", ".gitignore"), `*
`);
  return { directory, config, report };
}
function bunRunnerArgs(root, config, tests, directory) {
  const testSet = new Set(tests);
  const ignored = bunTestFiles(root).filter((file) => !testSet.has(file)).toSorted();
  const bunfig = join10(directory, "bunfig.toml");
  writeFileSync3(bunfig, `[test]
pathIgnorePatterns = [${ignored.map((file) => JSON.stringify(escapeGlob(file))).join(", ")}]
`);
  const workers = String(config.bunWorkers);
  return [
    "--runner",
    "bun",
    "--bun-config",
    bunfig,
    "--no-typecheck",
    "--concurrency",
    workers,
    "--max-workers",
    workers
  ];
}
function inheritedEnvironment() {
  return Object.fromEntries(Object.entries(process.env).filter(([name]) => !mutatorTestVariables.has(name)));
}
function bunTestEnvironment(config) {
  const user = process.env.BUN_OPTIONS;
  const options = [
    ...user === undefined || user.trim() === "" ? [] : [user],
    `--preload=./${mutationPreloadPath}`,
    `--timeout=${testTimeoutMs(config.testArgs) * timeoutFactor}`,
    ...testBunArgs(config.bunArgs)
  ];
  return {
    ...inheritedEnvironment(),
    BUN_OPTIONS: options.join(" "),
    [preloadOriginalVariable]: JSON.stringify(user ?? null)
  };
}
function offset(lineStarts, { line, column }) {
  const start = lineStarts[line - 1];
  assert11(start !== undefined, `mutatorの報告の行がソースにありません: ${line}`);
  return start + column - 1;
}
function lineStartsOf(source) {
  const starts = [0];
  for (let index = source.indexOf(`
`);index !== -1; index = source.indexOf(`
`, index + 1)) {
    starts.push(index + 1);
  }
  return starts;
}
function readMteMutants(reportDirectory, path) {
  const file = join10(reportDirectory, "mutation.json");
  assert11(existsSync8(file), "mutatorが報告を書かずに終わりました。標準エラーのmutatorの診断を確かめてください（壊す前のテストの失敗など）");
  const report = JSON.parse(readFileSync4(file, "utf8"));
  assertObject(report);
  assertObject(report.files);
  const entry = report.files[path];
  if (entry === undefined) {
    return { source: "", mutants: [] };
  }
  assertObject(entry);
  assert11(typeof entry.source === "string" && Array.isArray(entry.mutants));
  return { source: entry.source, mutants: entry.mutants.map(mteMutant) };
}
function readJudged(prepared) {
  const { source, mutants } = readMteMutants(prepared.report, prepared.path);
  const starts = lineStartsOf(source);
  return mutants.map((mutant) => judge(prepared.path, source, starts, mutant));
}
function mteMutant(value) {
  assertObject(value);
  assert11(typeof value.id === "string" && typeof value.mutatorName === "string" && typeof value.replacement === "string" && typeof value.status === "string" && isRecord(value.location), "mutatorの報告の壊し方の形が想定と違います");
  const { start, end } = value.location;
  assert11(isRecord(start) && isRecord(end));
  assert11(typeof start.line === "number" && typeof start.column === "number" && typeof end.line === "number" && typeof end.column === "number");
  return {
    id: value.id,
    mutatorName: value.mutatorName,
    replacement: value.replacement,
    status: value.status,
    location: {
      start: { line: start.line, column: start.column },
      end: { line: end.line, column: end.column }
    },
    ...typeof value.statusReason === "string" ? { statusReason: value.statusReason } : {}
  };
}
function outcomeOf({ status, statusReason }) {
  switch (status) {
    case "Killed":
    case "RuntimeError":
      return { verdict: "killed" };
    case "Survived":
      return { verdict: "survived" };
    case "NoCoverage":
      return { verdict: "uncovered" };
    case "Timeout":
      return { verdict: "timedOut" };
    case "Ignored":
      return "ignored";
    case "CompileError":
      return "uncompilable";
    default:
      return {
        verdict: "error",
        reason: `mutatorが判定を返しませんでした（${status}${statusReason === undefined ? "" : `: ${statusReason}`}）`
      };
  }
}
function judge(path, source, starts, mutant) {
  const range = {
    start: offset(starts, mutant.location.start),
    end: offset(starts, mutant.location.end)
  };
  return {
    item: {
      key: mutant.id,
      path,
      line: mutant.location.start.line,
      rule: mutant.mutatorName,
      original: source.slice(range.start, range.end),
      replacement: mutant.replacement
    },
    range,
    outcome: outcomeOf(mutant)
  };
}
function isCallable(value) {
  return typeof value === "function";
}
async function loadBunChecker(mutatorEntry) {
  const typecheckEntry = realpathSync2(createRequire2(mutatorEntry).resolve("@mizchi/mutator-typecheck"));
  const module = await import(pathToFileURL3(join10(dirname4(typecheckEntry), "bun.js")).href);
  assert11(isRecord(module) && isCallable(module.createBunChecker), "@mizchi/mutator-typecheckのcreateBunCheckerを読み込めません。mutatorの版を確かめてください");
  return module.createBunChecker;
}
function method(target, name) {
  const value = target[name];
  assert11(isCallable(value), `createBunCheckerの戻り値に${name}がありません`);
  return (...args) => value.apply(target, args);
}
function stringMap(value) {
  assert11(value instanceof Map && [...value].every(([key, error]) => typeof key === "string" && typeof error === "string"), "createBunCheckerの検査の結果の形が想定と違います");
  return new Map(value);
}
async function typeErrors(root, mutatorEntry, candidates) {
  const tsconfig = join10(root, "tsconfig.json");
  if (candidates.length === 0 || !existsSync8(tsconfig)) {
    return new Map;
  }
  console.error(`型検査: ${candidates.length}件`);
  const createBunChecker = await loadBunChecker(mutatorEntry);
  const checker = createBunChecker({ root, tsconfig }, "bun check");
  assertObject(checker);
  const close = method(checker, "close");
  try {
    return stringMap(method(checker, "check")(candidates.map(({ item, range }) => ({
      key: item.key,
      file: join10(root, item.path),
      range,
      replacement: item.replacement
    }))));
  } finally {
    close();
  }
}
function bunSetup(root, config) {
  const env = bunTestEnvironment(config);
  assertInstallOnlyBunfig(root);
  const mutatorEntry = resolveMutator(root);
  assert11(isFile(join10(root, mutationPreloadPath)), `${mutationPreloadPath}がありません。setup-feedback-loopのapply --updateで置いてください`);
  return {
    command: join10(dirname4(mutatorEntry), "cli.js"),
    env,
    args: (tests, directory) => bunRunnerArgs(root, config, tests, directory),
    typeErrors: async (candidates) => typeErrors(root, mutatorEntry, candidates)
  };
}
function vitestSetup(root, config) {
  const mutatorEntry = resolveMutator(root);
  return {
    command: join10(dirname4(mutatorEntry), "cli.js"),
    env: inheritedEnvironment(),
    args: vitestRunnerArgs(root, config),
    typeErrors: async () => new Map
  };
}
async function prepare(root, config, run, request) {
  const path = moduleFile(root, request.module);
  const setup = config.runner === "bun" ? bunSetup(root, config) : vitestSetup(root, config);
  const classes = await classification(root, config, run);
  assert11(classes.quality.length > 0, "候補0件: qualityがありません");
  if (config.prepare.length > 0) {
    await run(config.prepare, { stdout: "ignore" });
  }
  const files = mutatorFiles(root);
  const runtime = config.runner === "bun" && !process.versions.bun ? "bun" : process.execPath;
  const argv = [
    runtime,
    setup.command,
    ...setup.args(request.withAssurance ? [...classes.quality, ...classes.assurance] : classes.quality, files.directory),
    "--include",
    escapeGlob(path),
    "--config-file",
    files.config,
    "--no-arid",
    "--reporter",
    "json",
    "--report-dir",
    files.report,
    ...request.key === undefined ? [] : ["--only", request.key]
  ];
  return { path, argv, env: setup.env, report: files.report, typeErrors: setup.typeErrors };
}
async function runMutator(root, run, prepared) {
  await run(prepared.argv, {
    cwd: root,
    env: prepared.env,
    stdout: "ignore",
    allowFailure: true
  });
  return readJudged(prepared);
}
function unreadableRecords(detail) {
  return `${mutantsRecordFile}を読めません。{"<鍵>": {"reason": "<理由>"}}の形で書いてください（${detail}）`;
}
function recordedReasons(root) {
  const file = join10(root, mutantsRecordFile);
  const reasons = new Map;
  if (!existsSync8(file)) {
    return reasons;
  }
  let records;
  try {
    records = JSON.parse(readFileSync4(file, "utf8"));
  } catch {
    return assert11.fail(unreadableRecords("JSONとして読めません"));
  }
  assert11(isRecord(records), unreadableRecords("全体が鍵を名前に持つオブジェクトではありません"));
  for (const [key, entry] of Object.entries(records)) {
    assert11(isRecord(entry) && typeof entry.reason === "string", unreadableRecords(key));
    reasons.set(key, entry.reason);
  }
  return reasons;
}
function isUndetected(outcome) {
  return typeof outcome !== "string" && (outcome.verdict === "survived" || outcome.verdict === "uncovered");
}
async function mutation(root, config, run, request) {
  const prepared = await prepare(root, config, run, { ...request, key: undefined });
  const judged = await runMutator(root, run, prepared);
  if (judged.length === 0) {
    console.error(`mutatorは${prepared.path}から壊し方を作りませんでした。mutatorが対象にしないファイルか、壊せるコードが無いファイルです`);
  }
  const errors = await prepared.typeErrors(judged.filter(({ outcome }) => isUndetected(outcome)));
  const report = { survived: [], uncovered: [], timedOut: [], errors: [] };
  for (const { item, outcome } of judged) {
    if (outcome === "ignored" || outcome === "uncompilable" || errors.has(item.key)) {
      continue;
    }
    if (outcome.verdict === "error") {
      report.errors.push({ ...item, reason: outcome.reason });
    } else if (outcome.verdict !== "killed") {
      report[outcome.verdict].push(item);
    }
  }
  return report;
}
async function mutationByKey(root, config, run, request) {
  const prepared = await prepare(root, config, run, request);
  const reason = recordedReasons(root).get(request.key);
  assert11(reason === undefined, `この鍵は${mutantsRecordFile}に記録されています${reason ? `（${reason}）` : ""}。記録にある鍵は、壊し方を実行せずに止めます。記録から外すと、結果を標準出力に書きます: ${request.key}`);
  const judged = await runMutator(root, run, prepared);
  const found = judged.find(({ item }) => item.key === request.key);
  assert11(found !== undefined, `鍵に当たる壊し方が今の${prepared.path}から作られません: ${request.key}`);
  const { item, outcome } = found;
  assert11(outcome !== "ignored", `この鍵の壊し方は、mutatorが実行の対象から外しました: ${item.key}`);
  if (outcome === "uncompilable") {
    return { ...item, verdict: "error", reason: "型検査に通りません" };
  }
  if (!isUndetected(outcome)) {
    return { ...item, ...outcome };
  }
  const typeError = (await prepared.typeErrors([found])).get(item.key);
  return typeError === undefined ? { ...item, ...outcome } : { ...item, verdict: "error", reason: typeError };
}

// src/runtime.ts
function packageScripts(root) {
  try {
    const pkg = JSON.parse(readFileSync5(join11(root, "package.json"), "utf8"));
    return isRecord(pkg) && isRecord(pkg.scripts) ? pkg.scripts : {};
  } catch {
    return {};
  }
}
function isConnected(operation) {
  return operation === "affected" || operation === "classification";
}
function callsOperation(script, operation) {
  return typeof script === "string" && script.split(runtimePath).slice(1).some((rest) => new RegExp(`^["']?\\s+${operation}(\\s|$)`).test(rest));
}
function retryScript(root, operation) {
  const connected = `check:${operation}`;
  const scripts = packageScripts(root);
  if (typeof scripts[connected] === "string") {
    return connected;
  }
  const candidates = [
    process.env.npm_lifecycle_event ?? "",
    `test:${operation}`,
    ...Object.keys(scripts)
  ];
  return candidates.find((name) => callsOperation(scripts[name], operation)) ?? connected;
}
var argumentSeparator = { bun: "", npm: " --", pnpm: "" };
function retryCommand(root, operation, options) {
  if (isConnected(operation)) {
    const suffix = options.length === 0 ? "" : `${argumentSeparator["bun"]} ${options.map(shellQuote).join(" ")}`;
    return `${"bun"} run ${retryScript(root, operation)}${suffix}`;
  }
  if (operation === "mutation") {
    return [basename(process.execPath), ...process.argv.slice(1)].map(shellQuote).join(" ");
  }
  const name = process.env.npm_lifecycle_event ?? "";
  return callsOperation(packageScripts(root)[name], operation) ? `${"bun"} run ${name}` : [basename(process.execPath), ...process.argv.slice(1)].map(shellQuote).join(" ");
}
function showBase(base, always = false) {
  if (base.runtime !== undefined || always) {
    console.log(`比較元: ${base.ref}（${base.runtime ?? base.subject}）`);
  }
}
function baseOverride(args) {
  const index = args.findLastIndex((arg) => arg === "--base" || arg.startsWith("--base="));
  if (index === -1) {
    assert12(!(argumentSeparator["bun"] !== "" && process.env.npm_config_base === "true" && args.length > 0), `npmが--baseを自分の設定として読み、参照だけを渡しました（${args.join(" ")}）。check:affectedを呼ぶscriptを「npm run <script> -- --base <参照>」の形で直接呼んでください`);
    return;
  }
  const option = args[index] ?? "";
  const base = option === "--base" ? args[index + 1] : option.slice("--base=".length);
  assert12(base, `--baseには参照を指定してください: ${args.join(" ")}`);
  return base;
}
function jsonRequested(args) {
  const options = args.filter((arg) => arg !== "--");
  assert12(options.every((option) => option === "--json"), `classificationの指定は--jsonだけです: ${args.join(" ")}`);
  return options.length > 0;
}
function changedOptions(options) {
  let values;
  try {
    values = parseArgs({
      args: options,
      options: { ext: { type: "string", multiple: true }, base: { type: "string" } }
    }).values;
  } catch {
    const valueless = options.some((option, index) => option === "--base" && (options[index + 1] ?? "-").startsWith("-"));
    assert12(!valueless, `--baseには参照を指定してください: ${options.join(" ")}`);
    assert12.fail(`changedの指定は--ext <拡張子>と--base <参照>だけです: ${options.join(" ")}`);
  }
  assert12(values.base !== "", `--baseには参照を指定してください: ${options.join(" ")}`);
  return { extensions: extensionsFrom(values.ext), base: values.base };
}
function extensionsFrom(values) {
  if (values === undefined) {
    return;
  }
  const extensions = values.flatMap((value) => value.split(",")).map((extension) => extension.startsWith(".") ? extension : `.${extension}`);
  assert12(extensions.every((extension) => /^\.[\w.-]+$/.test(extension)), `--extには拡張子をカンマ区切りで指定してください: ${values.join(" ")}`);
  return extensions;
}
var shownFiles = 20;
var batchBytes = 1e5;
function batches(files) {
  const result = [];
  let size = 0;
  for (const file of files) {
    const length = Buffer.byteLength(file) + 1;
    const current = result.at(-1);
    if (current === undefined || size + length > batchBytes) {
      result.push([file]);
      size = length;
    } else {
      current.push(file);
      size += length;
    }
  }
  return result;
}
function changedRequest(args) {
  const separator = args.indexOf("--");
  assert12(separator !== -1 && separator < args.length - 1, "changedは「changed [--ext <拡張子>] [--base <参照>] -- <コマンド>」の形で呼びます");
  return { ...changedOptions(args.slice(0, separator)), command: args.slice(separator + 1) };
}
async function runOnChanged(root, config, run, { extensions, command }, specified) {
  const comparison = comparisonBase(root, config, specified);
  const files = (await existingChanges(root, comparison)).filter((path) => (extensions === undefined || extensions.some((extension) => path.endsWith(extension))) && isFile(join11(root, path))).sort().map((path) => path.startsWith("-") ? `./${path}` : path);
  showBase(comparison, files.length === 0);
  if (files.length === 0) {
    console.log(`変更したファイルがありません。コマンドを実行しません: ${command.join(" ")}`);
    return;
  }
  for (const batch of batches(files)) {
    const shown = batch.slice(0, shownFiles);
    const rest = batch.length - shown.length;
    await run([...command, ...batch], {
      display: [...command, ...shown, ...rest > 0 ? [`…ほか${rest}件`] : []]
    });
  }
}
async function affected(root, config, run, specified) {
  const base = comparisonBase(root, config, specified);
  const [collected, compared] = await Promise.allSettled([
    classification(root, config, run),
    affectedChanges(root, base, "bun")
  ]);
  if (collected.status === "rejected") {
    throw collected.reason;
  }
  if (compared.status === "rejected") {
    throw compared.reason;
  }
  const classes = collected.value;
  const { changed, outside } = compared.value;
  showBase(base);
  console.log(`quality候補: ${classes.quality.length}件（全体checkではありません）`);
  assert12(changed.length > 0 || config.runner === "vitest" && outside.length > 0, "変更なし: テストを実行しません");
  assert12(classes.quality.length > 0, "候補0件: qualityがありません");
  if (config.prepare.length > 0) {
    await run(config.prepare);
  }
  const assurance = changed.filter((path) => isAssurance(path, config));
  if (assurance.length > 0) {
    console.log(`assuranceのテストファイルは、このコマンドの実行対象に選びません。全体checkとCIで実行します: ${assurance.join(", ")}`);
  }
  const ctx = { root, config, quality: classes.quality, changes: compared.value, run };
  const outcome = await (config.runner === "bun" ? runBunTests : runVitestTests)(ctx);
  assert12(outcome.kind !== "none", "変更なし: テストを実行しません");
  if (outcome.kind === "ran") {
    console.log("選択したqualityが成功しました。全体checkの成功ではありません");
    return;
  }
  const subjects = [
    ...outcome.ignored.length > 0 ? ["ignoredChangesに当たる変更"] : [],
    ...outcome.mutantsRecord.length > 0 ? ["壊し方の記録ファイルの変更"] : [],
    ...outcome.assurance.length > 0 ? ["assuranceのテストファイルの変更"] : [],
    ...outcome.assuranceReach.length > 0 ? ["assuranceのテストにしか届かない変更"] : []
  ];
  console.log(`変更なし: ${subjects.join("と")}だけのため、テストを実行していません`);
}
function mutationRequest(args) {
  const usage = `mutationは「mutation <モジュール> [--with-assurance]」か「mutation <モジュール> --key <鍵> [--with-assurance]」か「mutation --check-changes」の形で呼びます: ${args.join(" ")}`;
  const given = args.filter((arg) => arg !== "--");
  if (given.includes("--check-changes")) {
    assert12(given.length === 1, usage);
    return "check-changes";
  }
  const [module, ...options] = given;
  const rest = options.filter((option) => option !== "--with-assurance");
  const withAssurance = rest.length < options.length;
  assert12(module !== undefined && !module.startsWith("-") && options.length - rest.length <= 1, usage);
  const [flag, key, ...extra] = rest;
  if (flag === undefined) {
    return { module, key: undefined, withAssurance };
  }
  assert12(flag === "--key" && key !== undefined && key !== "" && extra.length === 0, usage);
  return { module, key, withAssurance };
}
function reportList(report) {
  console.log(JSON.stringify(report, null, 2));
  assert12(report.errors.length === 0, `mutatorが判定を返さなかった壊し方が${report.errors.length}件あります。errorsのreasonを確かめてください`);
  if (report.survived.length + report.uncovered.length === 0) {
    console.error(`テストをすり抜けた壊し方は0件です（時間切れ${report.timedOut.length}件）`);
  }
}
function reportKey(report) {
  console.log(JSON.stringify(report, null, 2));
  assert12(report.verdict !== "survived" && report.verdict !== "uncovered", `テストは、この壊し方を拾いません（${report.verdict}）: ${report.key}`);
  if (report.verdict === "error") {
    assert12.fail(`壊し方を判定できませんでした: ${report.reason}`);
  }
}
function reportOutside(outside) {
  assert12(outside.length === 0, `改善の処理が変えてよいファイルの外の変更があります: ${outside.join(", ")}`);
  console.error("改善の処理が変えてよいファイルの外の変更はありません");
}
function runnerFor(root, operation, options, specified) {
  const assignment = specified?.from === "environment" ? `${baseVariable}=${shellQuote(specified.ref)} ` : "";
  return commandRunner(fileURLToPath2(import.meta.url), assignment + retryCommand(root, operation, options));
}
var operations = {
  async classification(root, args) {
    const json = jsonRequested(args);
    const run = runnerFor(root, "classification", json ? ["--json"] : []);
    const classes = await classification(root, readConfig(root), run);
    console.log(json ? JSON.stringify(classes, null, 2) : `分類: all ${classes.all.length}件、quality ${classes.quality.length}件、assurance ${classes.assurance.length}件（パスの一覧: ${retryCommand(root, "classification", ["--json"])}）`);
  },
  async affected(root, args) {
    const specified = runtimeBase(baseOverride(args));
    const options = specified?.from === "option" ? ["--base", specified.ref] : [];
    const run = runnerFor(root, "affected", options, specified);
    await affected(root, readConfig(root), run, specified);
  },
  async changed(root, args) {
    const request = changedRequest(args);
    const specified = runtimeBase(request.base);
    const run = runnerFor(root, "changed", [], specified);
    await runOnChanged(root, readConfig(root), run, request, specified);
  },
  async mutation(root, args) {
    const request = mutationRequest(args);
    if (request === "check-changes") {
      reportOutside(await changesOutsideImprovement(root, readConfig(root)));
      return;
    }
    const run = runnerFor(root, "mutation", []);
    const { module, key, withAssurance } = request;
    if (key === undefined) {
      reportList(await mutation(root, readConfig(root), run, { module, withAssurance }));
    } else {
      reportKey(await mutationByKey(root, readConfig(root), run, { module, key, withAssurance }));
    }
  }
};
function isOperation(name) {
  return name !== undefined && Object.hasOwn(operations, name);
}
function failWhenOutputCloses() {
  for (const output of [process.stdout, process.stderr]) {
    output.on("error", () => {
      process.exitCode = 1;
    });
  }
}
try {
  const [operation, ...args] = process.argv.slice(2);
  if (operation === "execute-child") {
    await runMonitor();
  } else {
    failWhenOutputCloses();
    assert12(isOperation(operation), "操作はclassification・affected・changed・mutationのいずれかです");
    await operations[operation](process.cwd(), args);
  }
} catch (error) {
  if (!(error instanceof ReportedFailure)) {
    console.error(`feedback-loop未完了: ${errorMessage(error)}`);
  }
  process.exitCode = process.argv[2] === "execute-child" ? reportedExitCode : 1;
}
