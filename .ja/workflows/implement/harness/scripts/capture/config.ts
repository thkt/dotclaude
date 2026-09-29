// ~/.agents/scripts/capture/config.ts の複製。正本は向こうなので、先にそちらを編集する。
import assert from "node:assert/strict";
import { dirname, resolve } from "node:path";
import { createRequire } from "node:module";
import { isRecord, isArray, outside } from "../shared/values.ts";

function pathSetting(value: unknown, fallback: string, base: string) {
  assert(value === undefined || typeof value === "string", "Invalid capture path");
  return resolve(base, value ?? fallback);
}

function snapshotTemplate(value: unknown, configDir: string, testDir: string, snapshotDir: string) {
  if (value === undefined) {
    return undefined;
  }
  assert(typeof value === "string", "Invalid snapshot template");
  return resolve(
    configDir,
    value
      .replaceAll("{configDir}", configDir)
      .replaceAll("{testDir}", testDir)
      .replaceAll("{snapshotDir}", snapshotDir),
  );
}

function expectConfig(base: unknown, project: unknown, paths: [string, string, string]) {
  assert(base === undefined || isRecord(base), "Invalid expect config");
  assert(project === undefined || isRecord(project), "Invalid project expect config");
  return Object.fromEntries(
    Object.entries(project ?? base ?? {}).map(([name, options]) => [
      name,
      isRecord(options)
        ? {
            ...options,
            ...(options.pathTemplate === undefined
              ? {}
              : { pathTemplate: snapshotTemplate(options.pathTemplate, ...paths) }),
            ...(name === "toHaveScreenshot" && options.stylePath !== undefined
              ? { stylePath: stylePaths(options.stylePath, paths[0]) }
              : {}),
          }
        : options,
    ]),
  );
}

function stylePaths(value: unknown, configDir: string) {
  const paths = Array.isArray(value) ? value : [value];
  return paths.map((path: unknown) => {
    assert(typeof path === "string", "Invalid screenshot style path");
    return resolve(configDir, path);
  });
}

function projectConfig(
  project: Record<string, unknown>,
  base: Record<string, unknown>,
  configDir: string,
  spec: string,
  output: string,
  dependency: boolean,
) {
  const testDir = pathSetting(project.testDir ?? base.testDir, ".", configDir);
  const snapshotDir = pathSetting(project.snapshotDir ?? base.snapshotDir, testDir, configDir);
  return {
    ...project,
    testDir: dependency || !outside(testDir, spec) ? testDir : dirname(spec),
    ...(dependency
      ? {
          testMatch: project.testMatch ?? base.testMatch,
          testIgnore: project.testIgnore ?? base.testIgnore,
        }
      : {
          testMatch: new RegExp(`^${spec.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`),
          testIgnore: [],
        }),
    outputDir: `${output}.artifacts`,
    snapshotDir,
    snapshotPathTemplate: snapshotTemplate(
      project.snapshotPathTemplate ?? base.snapshotPathTemplate,
      configDir,
      testDir,
      snapshotDir,
    ),
    expect: expectConfig(base.expect, project.expect, [configDir, testDir, snapshotDir]),
    retries: 0,
    repeatEach: 1,
  };
}

function servers(value: unknown, configDir: string): unknown {
  if (value === undefined) {
    return undefined;
  }
  if (Array.isArray(value)) {
    return value.map((server: unknown) => servers(server, configDir));
  }
  assert(isRecord(value), "Invalid webServer");
  return { ...value, cwd: pathSetting(value.cwd, ".", configDir) };
}

function hooks(value: unknown, configFile: string): unknown {
  if (value === undefined) {
    return undefined;
  }
  if (Array.isArray(value)) {
    return value.map((hook: unknown) => hooks(hook, configFile));
  }
  assert(typeof value === "string", "Invalid global hook");
  const require = createRequire(configFile);
  // モジュール解決だけでは、元の設定ファイルと同じ場所にある拡張子つきのフック名を拾えない。
  try {
    return require.resolve(resolve(dirname(configFile), value));
  } catch {
    return require.resolve(value);
  }
}

export function captureConfig(base: unknown, configFile: string, spec: string, output: string) {
  assert(isRecord(base), "Invalid Playwright config");
  const configDir = dirname(configFile);
  assert(base.projects === undefined || Array.isArray(base.projects), "Invalid projects");
  const projects = (base.projects ?? []).map((project: unknown) => {
    assert(isRecord(project), "Invalid project");
    return project;
  });
  const dependencies = new Set(
    projects.flatMap((project) => {
      assert(project.dependencies === undefined || isArray(project.dependencies));
      return [...(project.dependencies ?? []), project.teardown].filter(
        (name): name is string => typeof name === "string",
      );
    }),
  );
  return {
    ...projectConfig(base, base, configDir, spec, output, false),
    ...(base.projects === undefined
      ? {}
      : {
          testMatch: base.testMatch,
          testIgnore: base.testIgnore,
          projects: projects.map((project) =>
            projectConfig(
              project,
              base,
              configDir,
              spec,
              output,
              typeof project.name === "string" && dependencies.has(project.name),
            ),
          ),
        }),
    webServer: servers(base.webServer, configDir),
    globalSetup: hooks(base.globalSetup, configFile),
    globalTeardown: hooks(base.globalTeardown, configFile),
    ...(base.tsconfig === undefined
      ? {}
      : { tsconfig: pathSetting(base.tsconfig, ".", configDir) }),
    forbidOnly: true,
    workers: 1,
    updateSnapshots: "none",
    updateSourceMethod: "patch",
    reporter: [["json", { outputFile: `${output}.report.json` }]],
  };
}
