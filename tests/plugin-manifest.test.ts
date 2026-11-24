/// <reference types="node" />
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, "..");

test("marketplace.json parses and every command path it lists exists", () => {
  const manifest = JSON.parse(
    readFileSync(join(REPO_ROOT, ".claude-plugin", "marketplace.json"), "utf8"),
  ) as { plugins: { name: string; commands?: string[] }[] };
  const commands = manifest.plugins.flatMap((plugin) => plugin.commands ?? []);
  assert.ok(commands.length > 0, "the manifest lists at least one command");
  const missing = commands.filter((path) => !existsSync(join(REPO_ROOT, path)));
  assert.deepEqual(missing, [], `command paths with no file: ${missing.join(", ")}`);
});

type Marketplace = {
  metadata?: Record<string, unknown>;
  plugins: Record<string, unknown>[];
};

function versionPins(manifest: Marketplace): string[] {
  const pins = manifest.plugins
    .filter((plugin) => Object.hasOwn(plugin, "version"))
    .map((plugin) => `plugins.${String(plugin.name)}`);
  return manifest.metadata && Object.hasOwn(manifest.metadata, "version")
    ? ["metadata", ...pins]
    : pins;
}

test("marketplace.json pins no version on metadata or a plugin entry, so an installer receives the source commit", () => {
  const pinned = JSON.parse(`{
    "metadata": { "description": "x", "version": "4.1.0" },
    "plugins": [
      { "name": "build", "version": "4.1.0", "commands": [] },
      { "name": "other", "commands": [] }
    ]
  }`) as Marketplace;
  assert.deepEqual(versionPins(pinned), ["metadata", "plugins.build"]);
  const unpinned = JSON.parse(`{
    "metadata": { "description": "x" },
    "plugins": [{ "name": "build", "commands": [] }]
  }`) as Marketplace;
  assert.deepEqual(versionPins(unpinned), []);

  const manifest = JSON.parse(
    readFileSync(join(REPO_ROOT, ".claude-plugin", "marketplace.json"), "utf8"),
  ) as Marketplace;
  assert.ok(manifest.metadata, "the manifest has metadata");
  assert.ok(manifest.plugins.length > 0, "the manifest lists at least one plugin");
  assert.deepEqual(versionPins(manifest), []);
});

function countMatching(dir: string, keep: (name: string) => boolean): number {
  return readdirSync(join(REPO_ROOT, dir), { withFileTypes: true }).filter(
    (entry) => entry.isDirectory() && keep(entry.name),
  ).length;
}

test("the skill and agent counts README.md states match skills/*/SKILL.md and agents/*/*.md outside _lib", () => {
  const skills = countMatching("skills", (name) =>
    existsSync(join(REPO_ROOT, "skills", name, "SKILL.md")),
  );
  const agents = readdirSync(join(REPO_ROOT, "agents"), { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name !== "_lib")
    .flatMap((entry) =>
      readdirSync(join(REPO_ROOT, "agents", entry.name)).filter((name) => name.endsWith(".md")),
    ).length;
  for (const readme of ["README.md", ".ja/README.md"]) {
    const text = readFileSync(join(REPO_ROOT, readme), "utf8");
    const skillCounts = [...text.matchAll(/(\d+) skills/g)].map((m) => Number(m[1]));
    const agentCounts = [...text.matchAll(/(\d+) agents?\b/g)].map((m) => Number(m[1]));
    assert.ok(skillCounts.length > 0, `${readme} states a skill count`);
    assert.ok(agentCounts.length > 0, `${readme} states an agent count`);
    assert.deepEqual(new Set(skillCounts), new Set([skills]), `${readme} skill count`);
    assert.deepEqual(new Set(agentCounts), new Set([agents]), `${readme} agent count`);
  }
});
