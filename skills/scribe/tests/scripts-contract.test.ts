/// <reference types="node" />
// Contract tests that cross the boundary between skills/scribe's two retired-Python ports:
// find_wiki_rule.ts's SCENES/read_scenes/find and triage.ts's merge/read_store/triage wired
// into verify_run.ts's verify. Carried over from skills/scribe/tests/skill_contract_test.py as
// T-233/T-234/T-235 -- that suite's own T-006/T-007/T-011 -- because each depended on an
// in-process import (`from find_wiki_rule import ...`, `from triage import ...`) of a module
// that no longer exists as Python, so the connection they check can now only run in-process in
// TypeScript. Reuses the shared git() shape skills/scribe/tests/verify-run.test.ts's own git()
// helper gives its callers, for the same real temp-repo commit sequence T-235 replays. The
// temp repository itself, and the GIT_ENV identity git() runs commits under, both come from
// workflows/_lib/tests/_git-repo.ts's withTempRepo -- the same disposable-repo helper
// verify-run.test.ts and workflows/assert/tests/worktree.test.ts share.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { find, readScenes, SCENES } from "../scripts/find_wiki_rule.ts";
import { merge, readStore, triage, type Triaged } from "../scripts/triage.ts";
import { verify, type TriageReport } from "../scripts/verify_run.ts";
import { GIT_ENV, gcAutoValue, withTempRepo } from "../../../workflows/_lib/tests/_git-repo.ts";

// skills/scribe/tests -> skills/scribe -> skills -> repo root, the same climb
// skills/scribe/tests/find-wiki-rule.test.ts's own REPO_ROOT constant makes.
const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, "..", "..", "..");
const WIKI = join(REPO_ROOT, "docs", "wiki");

// README and _candidates are not rule pages, so they carry no scenes -- the same exclusion
// skill_contract_test.py's WikiPageFormat.pages() applied.
const NOT_A_RULE = new Set(["README.md", "_candidates.md"]);

function wikiPages(): string[] {
  return readdirSync(WIKI).filter((name) => name.endsWith(".md") && !NOT_A_RULE.has(name));
}

test(
  "T-233 every scene value a docs/wiki page declares belongs to the SCENES constant imported " +
    "from find_wiki_rule.ts",
  () => {
    for (const page of wikiPages()) {
      for (const scene of readScenes(join(WIKI, page))) {
        assert.ok(SCENES.includes(scene), `${page}: ${scene} is not in SCENES`);
      }
    }
  },
);

test("T-234 a --scene issue-close query over docs/wiki returns exactly the five issue-close pages", () => {
  const report = find(WIKI, "issue-close", [], "issue-close");
  assert.deepEqual(
    [...report.scenes].sort(),
    [
      "incident-driven-deferral.md",
      "premise-collapse-not-planned.md",
      "runtime-bug-wontfix.md",
      "umbrella-issue-recut.md",
      "untracked-output-manual-close.md",
    ].sort(),
  );
});

/** Runs a real `git` command against `repo`, throwing on a non-zero exit -- the same shape
 * skills/scribe/tests/verify-run.test.ts's own git() gives its callers. */
function git(repo: string, ...args: string[]): void {
  const result = spawnSync("git", ["-C", repo, ...args], { encoding: "utf8", env: GIT_ENV });
  if (result.status !== 0) {
    throw new Error(`git ${args.join(" ")} failed: ${result.stderr}`);
  }
}

function headRev(repo: string): string {
  return spawnSync("git", ["-C", repo, "rev-parse", "HEAD"], { encoding: "utf8" }).stdout.trim();
}

/** The `_candidates.md` store body carrying `waiting` under 昇格待ち, each with 2 evidence
 * markers so triage promotes it. */
function store(waiting: readonly string[]): string {
  const rows = waiting.map((n) => `- ${n} #1 #2\n`).join("");
  return `# candidates\n\n## 昇格待ち\n\n${rows}\n## 単発\n\n## 棄却\n`;
}

test(
  "T-235 the commits triage.ts returns for a seeded store, committed one by one, make " +
    "verify_run.ts return ok true, and one commit fewer makes it false",
  () => {
    const names = Array.from({ length: 7 }, (_, i) => `item${i}`);
    withTempRepo((repo) => {
      const wiki = join(repo, "docs", "wiki");
      const candidates = join(wiki, "_candidates.md");
      mkdirSync(wiki, { recursive: true });
      writeFileSync(candidates, store(names));
      // The same composition triage.ts's own CLI runs: the store rows carry which section
      // each row waited in, which is what tells a committed row apart from a fresh one.
      const report = triage(merge(readStore(candidates), []));
      const commits = report.commits;
      assert.ok(commits.length > 0, "triage splits 7 qualifying patterns into 2+ commits");

      git(repo, "add", "-A");
      git(repo, "commit", "-q", "-m", "chore: seed candidates");
      writeFileSync(join(wiki, "an-earlier-page.md"), "# earlier\n");
      git(repo, "add", "-A");
      git(repo, "commit", "-q", "-m", "docs(wiki): an-earlier-page を追加/更新");
      const base = headRev(repo);

      let remaining = [...names];
      for (const commitItems of commits) {
        const committed = commitItems.map((item) => item.name);
        for (const n of committed) {
          writeFileSync(join(wiki, `${n}.md`), `# ${n}\n`);
        }
        remaining = remaining.filter((n) => !committed.includes(n));
        writeFileSync(candidates, store(remaining));
        git(repo, "add", "-A");
        git(repo, "commit", "-q", "-m", `docs(wiki): ${committed.join(", ")} を追加/更新`);
      }

      const matched = verify(repo, report as TriageReport, base);
      assert.equal(matched.ok, true);

      // One extra element than the run actually committed, with no name in it, so only the
      // commit count moves.
      const shiftedCommits: Triaged[][] = [...commits, []];
      const shiftedReport: TriageReport = { commits: shiftedCommits, deferred: report.deferred };
      const shifted = verify(repo, shiftedReport, base);
      assert.equal(shifted.ok, false);
    });
  },
);

test(
  "T-419 verify-run, scripts-contract and worktree each create their repositories through the " +
    "helper, asserted by the gc.auto value those repositories report",
  () => {
    withTempRepo((repo) => {
      assert.equal(gcAutoValue(repo), "0");
    });
  },
);
