export const meta = {
  name: "implement",
  description:
    "Implements an agreed Issue in an isolated worktree with one implementation pass, runs a capture, check, independent review, and repair loop until the review is accepted, then commits once, pushes, opens a draft PR, and waits for CI on the same head, following the same flow as Codex's orchestrator.ts. The check and the capture pass on their exit codes, media is installed only after its format is validated, and the script decides acceptance by validating one update per finding ID, so a self-reported pass or a dropped prior finding cannot get through. Before the first write the script re-confirms the Issue, the accepted tree, the actor, and the push target, and it reads back the result of every write. It never retries a write and never switches the PR to ready. The repair loop has no round cap; it stops on changed requirements, a changed target, an invalid reply, or a pending human decision. With publishing turned off it ends at verified_local.",
  whenToUse:
    "Implementing, headlessly, an Issue agreed through /scoping up to a draft PR, in the same flow as Codex's implement. It also revises a PR it published, from a revision request a human adopted: pass the PR URL and the request, and it rewrites the body instead of opening a new PR. A review of an existing diff without implementation goes to polish or audit. Pass the Issue number and the target repository's absolute path. The target repository's root needs a .dotagents.json carrying repository, remote, baseBranch, setup, check, ciChecks, and capture, as the Codex target contract defines them, and {harness} in capture expands to the Codex harness at ~/.agents. The check or the capture may open a local server socket, so a session with the sandbox on sets sandbox.network.allowLocalBinding to true before launching. Publishing up to a draft PR is the default. With publishing turned off, the run ends by leaving the verified branch and worktree to a human. The switch to ready, the published-body check, and human review stay with the /implement skill and the human.",
  phases: [
    { title: "Target" },
    { title: "Prepare" },
    { title: "Implement" },
    { title: "Verify" },
    { title: "Ship" },
    { title: "CI" },
  ],
};

// The flow's canonical source is orchestrator.ts, correction.ts, pr-body.ts, and ci.ts under
// ~/.agents/scripts/implement/, and ~/.agents/scripts/shared/target.ts. The LLM implements and
// reviews; the script computes acceptance, matches IDs, confirms that the requirements and the
// target have not changed, decides whether a capture is needed, reads back each publication
// result, and classifies CI.

// The harness may deliver object args as a JSON-encoded string.
let argsValue = args;
if (typeof argsValue === "string" && argsValue.trim().startsWith("{")) {
  try {
    const decoded = JSON.parse(argsValue);
    if (decoded && typeof decoded === "object") argsValue = decoded;
  } catch {
    // a malformed encoding leaves args as the string it arrived as
  }
}
const input = typeof argsValue === "object" && argsValue ? argsValue : {};
const issueRef = String(typeof argsValue === "string" ? argsValue : input.issue || "").trim();
// Accept only a bare number, #number, or an Issue URL. Freeform text that merely contains digits
// is not read as an Issue number.
const issueNumber =
  (issueRef.match(/^#?(\d+)$/) || issueRef.match(/\/issues\/(\d+)(?:[/?#]|$)/) || [])[1] || "";
const repo = typeof input.repo === "string" ? input.repo.trim() : "";
// Codex's --no-publish. Only an explicit false turns publishing off.
const publishing = input.publish !== false;

const obj = (required, properties) => ({
  type: "object",
  additionalProperties: false,
  required,
  properties,
});
const closed = (properties) => obj(Object.keys(properties), properties);
const str = { type: "string" };
// A string that must not be empty. blankFields, not the schema, rejects the empty string.
const text = { type: "string" };
const int = { type: "integer" };
const bool = { type: "boolean" };
const choice = (values) => ({ type: "string", enum: values });
const list = (items) => ({ type: "array", items });

// Strings derived from the Issue or the config reach the shell as one argv element each, never
// as shell syntax.
const shq = (value) => `'${String(value).replaceAll("'", `'"'"'`)}'`;
const argvLine = (argv) => argv.map(shq).join(" ");
const bundled = (rel) =>
  `"$(P="$HOME/.claude/${rel}"; [ -e "$P" ] || P="$(find "$HOME/.claude/plugins" -path "*/${rel}" -not -path "*/.ja/*" 2>/dev/null | sort -V | tail -1)"; printf %s "$P")"`;
const anchor = (p) =>
  `Run every git, gh, and file command from the repository at ${repo} (begin each shell command with \`cd ${repo} && \`).\n\n${p}`;
const parseJsonText = (value) => {
  try {
    return JSON.parse(String(value));
  } catch {
    return null;
  }
};

// ---- Run recording: the start row and the terminal row are joined by run_id ----
const counts = { check_runs: 0, review_rounds: 0, repairs: 0, captures: 0, ci_rounds: 0 };
let runId = "";
let recordedBranch = "";
// The commit, PR URL, PR-wide base, and body digest publication has learned. Stopped rows carry them too, so a human
// can reconcile the actual state from the row. A later revision takes the published head and the PR-wide base from
// the commit and base_sha of a published_draft row.
const published = { commit: "", url: "", base_sha: "", body_digest: "" };
const RECORD_SCHEMA = closed({ path: str, run_id: str });
const recordRun = async (reason) => {
  const payload = {
    run_id: runId,
    issue: issueNumber,
    repo,
    branch: recordedBranch,
    publish: publishing,
    // The URL of the PR a revision revises. Read straight from the input so a stop before validation still carries it.
    revision:
      input.revision && typeof input.revision.pr === "string" ? input.revision.pr.trim() : "",
    ...published,
    reason,
    ...counts,
  };
  const written = await agent(
    anchor(
      `Record one implement run; do not judge, summarize, or edit any value. The steps are, (1) write this exact JSON to a temp file; ` +
        `(2) run \`node ${bundled("workflows/implement/record.ts")} < <tempfile>\`; ` +
        `(3) return the script's stdout path and run_id verbatim.\nThe input JSON is as follows.\n${JSON.stringify(payload)}`,
    ),
    {
      label: `record:${reason}`,
      agentType: "general-purpose",
      schema: RECORD_SCHEMA,
      model: "haiku",
    },
  );
  const id = String((written && written.run_id) || "").trim();
  // Recording never stops a run. A row that could not be written goes to the log and the run goes on.
  if (!id) {
    log(
      `The "${reason}" row was not written (the recorder returned no run_id), so this run is missing from implement-runs.jsonl.`,
    );
    return;
  }
  runId = id;
};
// Every stop passes through here, so a run that has both the Issue and the repo always gets a terminal row.
// Canonical source: remaining in orchestrator.ts. A stop also returns the work that remains; shipStop narrows it for publication-stage stops.
const REMAINING_AFTER_PR = ["ci", "published_body_check", "mark_ready", "human_review"];
const stop = async (reason, why, fields = {}) => {
  if (repo && issueNumber) await recordRun(reason);
  return {
    stopped: reason,
    why,
    ...counts,
    run_id: runId,
    remaining: ["local_verification", "publication", ...REMAINING_AFTER_PR],
    ...fields,
  };
};

if (!issueNumber) {
  return await stop("no-issue", "Pass the Issue number or the Issue URL.");
}
if (!repo) {
  return await stop("no-repo", "Pass the target repository as an absolute path.");
}
// References pinned to the start commit (research reports, wiki pages, decision records). Canonical
// source: assertReportReferences in input.ts and research-handoff.ts. References need a start commit,
// and each must be Markdown under docs/research, docs/wiki, or docs/decisions.
const startCommit = typeof input.startCommit === "string" ? input.startCommit.trim() : "";
const reports = input.reports === undefined ? [] : input.reports;
const COMMIT_ID = /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/;
const isReportPath = (p) =>
  typeof p === "string" &&
  /^docs\/(?:research|wiki|decisions)\/.+\.md$/.test(p) &&
  !p.split("/").includes("..");
const referenceProblem = () => {
  if (!Array.isArray(reports)) return "Pass references as an array of {path, blob}";
  if (startCommit && !COMMIT_ID.test(startCommit))
    return "Pass the start commit as a full commit ID";
  if (reports.length && !startCommit) return "References need a start commit";
  const bad = reports.find((r) => !r || !isReportPath(r.path) || !COMMIT_ID.test(String(r.blob)));
  if (bad)
    return `A reference must be Markdown under docs/research, docs/wiki, or docs/decisions with its reviewed blob ID: ${JSON.stringify(bad)}`;
  const paths = reports.map((r) => r.path);
  return new Set(paths).size === paths.length ? "" : "Duplicate reference path";
};
const referenceIssue = referenceProblem();
if (referenceIssue) {
  return await stop("invalid-reports", referenceIssue);
}
// Revising an existing PR. Canonical source: revision.ts and README § 既存PRの修正. The adopted findings,
// expected result, and permission scope arrive as one text (request), and only a PR this workflow
// published is a target. Args cannot change mid-run, so Codex's hash checks of a request file are not needed.
const revising = input.revision !== undefined;
const revisionUrl = revising && input.revision ? String(input.revision.pr || "").trim() : "";
const revisionRequest =
  revising && input.revision ? String(input.revision.request || "").trim() : "";
const revisionPr = /^https:\/\/github\.com\/([\w.-]+\/[\w.-]+)\/pull\/([1-9]\d*)$/.exec(
  revisionUrl,
);
const revisionProblem = () => {
  if (!revising) return "";
  if (!revisionPr) return "Pass the PR to revise as https://github.com/OWNER/REPO/pull/N";
  if (!revisionRequest)
    return "Write the adopted findings, expected result, and permission scope in request";
  return publishing
    ? ""
    : "A revision goes through the body update and CI, so publishing cannot be turned off";
};
const revisionIssue = revisionProblem();
if (revisionIssue) {
  return await stop("invalid-revision", revisionIssue);
}
await recordRun("started");

// ---- Target: check the Issue, the effective user, the repo, uncommitted changes, and .dotagents.json ----
phase("Target");
const BRANCH_NAME_SHAPE = /^[\w][\w./-]*$/;
const isArgv = (v) =>
  Array.isArray(v) && v.length > 0 && v.every((a) => typeof a === "string") && v[0].trim() !== "";
const isNameList = (v) =>
  Array.isArray(v) &&
  v.every((n) => typeof n === "string" && n.trim() !== "") &&
  new Set(v).size === v.length;
// destination is limited to a path relative to the worktree. install-media.ts checks the same condition at run time.
const isRepoRelative = (p) =>
  typeof p === "string" && p.trim() !== "" && !p.startsWith("/") && !p.split("/").includes("..");
const isCapture = (v) =>
  v === null ||
  (Boolean(v) &&
    isArgv(v.command) &&
    isRepoRelative(v.destination) &&
    typeof v.required === "boolean");
// Canonical source: assertTarget in ~/.agents/scripts/shared/target.ts. setup and check also take a
// shell string, which is wrapped in /bin/sh -c to become argv.
const CONFIG_KEYS = ["repository", "remote", "baseBranch", "setup", "check", "ciChecks", "capture"];
const isShell = (v) => typeof v === "string" && v.trim() !== "";
const CONFIG_RULES = [
  [
    (c) => Object.keys(c).every((key) => CONFIG_KEYS.includes(key)),
    `only these fields are allowed: ${CONFIG_KEYS.join(", ")}`,
  ],
  [
    (c) => typeof c.repository === "string" && /^[\w.-]+\/[\w.-]+$/.test(c.repository),
    "repository must be owner/name",
  ],
  [
    (c) => typeof c.remote === "string" && /^[\w.-]+$/.test(c.remote),
    "remote must be a remote name",
  ],
  [
    (c) => typeof c.baseBranch === "string" && BRANCH_NAME_SHAPE.test(c.baseBranch),
    "baseBranch must be a branch name",
  ],
  [
    (c) => isShell(c.setup) || (Array.isArray(c.setup) && c.setup.every(isArgv)),
    "setup must be a shell string or an array of argv arrays ([] when none)",
  ],
  [
    (c) => isShell(c.check) || isArgv(c.check),
    "check must be a shell string or a non-empty argv array",
  ],
  [(c) => isNameList(c.ciChecks), "ciChecks must be an array of unique non-empty check names"],
  [
    (c) => "capture" in c && isCapture(c.capture),
    "capture must be null or {command, destination, required} (null when no media is needed)",
  ],
];
const configErrors = (c) =>
  !c || typeof c !== "object" || Array.isArray(c)
    ? [".dotagents.json is not a JSON object"]
    : CONFIG_RULES.filter(([ok]) => !ok(c)).map(([, message]) => message);

// The Issue's identity is compared by the sha256 of gh's output, not by a transcribed body, so a
// one-character slip in transcription is not read as a change in requirements.
// Canonical source: the Issue fetch in orchestrator.ts. The digest covers state and updatedAt too,
// so an Issue closed mid-run reads as changed.
const issueDigestCommand = (repoFlag = "") =>
  `gh issue view ${issueNumber}${repoFlag} --json title,body,state,updatedAt | shasum -a 256 | cut -d ' ' -f 1`;
const DIGEST_SHAPE = /^[0-9a-f]{64}$/;
const TARGET_SCHEMA = closed({
  issue_exit: int,
  issue_json: str,
  issue_digest: str,
  user: str,
  repo_json: str,
  porcelain: str,
  config_found: bool,
  config_text: str,
  remotes: str,
  gh_host: str,
  head_sha: str,
  report_listing: str,
  revision_pr: str,
  revision_body_sha: str,
  revision_row: str,
});
// The fields checked on the PR under revision, and its body's sha256. The body is never transcribed by an agent; gh's output goes through shasum.
const prApiPath = revisionPr ? `repos/${revisionPr[1]}/pulls/${revisionPr[2]}` : "";
const PR_FIELDS_JQ =
  "{state, draft, html_url, user: .user.login, head_sha: .head.sha, head_ref: .head.ref, head_repo: .head.repo.full_name, base_ref: .base.ref, base_repo: .base.repo.full_name}";
const prFieldsCommand = argvLine(["gh", "api", prApiPath, "--jq", PR_FIELDS_JQ]);
const prBodyShaCommand = `${argvLine(["gh", "api", prApiPath, "--jq", ".body"])} | shasum -a 256 | cut -d ' ' -f 1`;
const revisionSteps = revising
  ? `\n11. \`${prFieldsCommand}\`: put its stdout in revision_pr.\n` +
    `12. \`${prBodyShaCommand}\`: put the printed 64-digit hex in revision_body_sha.\n` +
    `13. \`${argvLine(["jq", "-c", "--arg", "url", revisionUrl, 'select(.reason == "published_draft" and .url == $url)'])} "$HOME/.claude/history/implement-runs.jsonl" | tail -1\`: put its stdout in revision_row (an empty string when none).`
  : `\n11. This is not a revision. Set revision_pr, revision_body_sha, and revision_row to "".`;
// Canonical source: orchestrator.ts. The worktree is cut from the checkout's local HEAD and the config is
// read from that commit, so the validated config and the version that runs cannot differ.
const target = await agent(
  anchor(
    `Run these commands and return each output verbatim. Do not summarize, reformat, or judge any of them.\n` +
      `1. \`gh issue view ${issueNumber} --json number,title,body,state,url\`: put its exit code in issue_exit and its stdout in issue_json.\n` +
      `2. \`gh api user --jq .login\`: put its stdout in user (an empty string when it fails).\n` +
      `3. \`gh repo view --json nameWithOwner,defaultBranchRef,viewerPermission\`: put its stdout in repo_json (an empty string when it fails).\n` +
      `4. \`git status --porcelain --untracked-files=all\`: put its stdout in porcelain.\n` +
      `5. \`git show HEAD:.dotagents.json\`: put whether it exited 0 in config_found and its stdout verbatim in config_text (an empty string when it fails).\n` +
      `6. \`${issueDigestCommand()}\`: put the printed 64-digit hex in issue_digest (an empty string when it fails).\n` +
      `7. \`git remote -v\`: put its stdout in remotes.\n` +
      `8. \`printenv GH_HOST\`: put its stdout in gh_host (an empty string when unset).\n` +
      `9. \`git rev-parse HEAD\`: put the printed sha in head_sha.\n` +
      (reports.length && !revising
        ? `10. \`${argvLine(["git", "ls-tree", "HEAD", "--", ...reports.map((r) => r.path)])}\`: put its stdout in report_listing.`
        : `10. References are not checked here. Set report_listing to "".`) +
      revisionSteps,
  ),
  {
    label: "target",
    phase: "Target",
    agentType: "general-purpose",
    schema: TARGET_SCHEMA,
    model: "haiku",
  },
);
if (!target) {
  return await stop("target-unavailable", "The agent checking the target returned no result.");
}
const issue = target.issue_exit === 0 ? parseJsonText(target.issue_json) : null;
const issueDigest = String(target.issue_digest || "").trim();
if (
  !issue ||
  !String(issue.title || "").trim() ||
  !String(issue.body || "").trim() ||
  !DIGEST_SHAPE.test(issueDigest)
) {
  return await stop(
    "issue-unreadable",
    `Could not read the title and body of Issue #${issueNumber}. Check the Issue and the repo.`,
  );
}
if (issue.state !== "OPEN") {
  return await stop(
    "issue-not-open",
    `Issue #${issueNumber} is ${issue.state}. Relaunch with an agreed, OPEN Issue.`,
  );
}
const actor = String(target.user || "").trim();
if (!actor) {
  return await stop(
    "no-actor",
    "gh api user returned no login. Fix the user's gh authentication and relaunch. The run does not switch to another actor.",
  );
}
const repoInfo = parseJsonText(target.repo_json);
if (!repoInfo || !repoInfo.nameWithOwner) {
  return await stop("repo-unreadable", "gh repo view could not read the target repo.");
}
// The work happens in an isolated worktree, so only the start input (.dotagents.json) must be committed.
// Unrelated work in the original checkout (such as a /scoping Issue draft) is preserved and does not stop the run.
// Canonical source: the start-input check in orchestrator.ts ("Required start inputs have uncommitted changes").
const START_INPUTS = [".dotagents.json", ...reports.map((r) => r.path)];
const uncommittedInputs = String(target.porcelain || "")
  .split("\n")
  .filter((line) => START_INPUTS.includes(line.slice(3).trim()));
if (uncommittedInputs.length) {
  return await stop(
    "uncommitted-start-inputs",
    "A start input has uncommitted changes. Commit the agreed .dotagents.json, then relaunch. This workflow neither stashes nor carries them over.",
    { porcelain: uncommittedInputs.join("\n") },
  );
}
if (!target.config_found) {
  return await stop(
    "no-config",
    "The target repository's root has no .dotagents.json. Commit the agreed setup, check, ciChecks, and capture, then relaunch.",
  );
}
const settings = parseJsonText(target.config_text);
const configProblems = configErrors(settings);
if (configProblems.length) {
  return await stop("invalid-config", configProblems.join("; "));
}
const shellArgv = (command) => ["/bin/sh", "-c", command];
const config = {
  ...settings,
  setup: typeof settings.setup === "string" ? [shellArgv(settings.setup)] : settings.setup,
  check: typeof settings.check === "string" ? shellArgv(settings.check) : settings.check,
};
const capture = config.capture;
const { repository, remote, baseBranch } = config;
// Canonical source: readTarget in target.ts. GH_HOST, the remote's fetch and push URLs, and the repo gh resolved all point at repository.
const ghHost = String(target.gh_host || "").trim();
if (ghHost && ghHost !== "github.com") {
  return await stop("gh-host", `GH_HOST points at ${ghHost}. Only github.com targets are handled.`);
}
const REMOTE_URL =
  /^(?:https:\/\/github\.com\/|git@github\.com:|ssh:\/\/git@github\.com\/)([\w.-]+\/[\w.-]+?)(?:\.git)?$/;
const remoteUrls = String(target.remotes || "")
  .split("\n")
  .map((line) => /^(\S+)\s+(\S+)\s+\((fetch|push)\)$/.exec(line.trim()))
  .filter((m) => m && m[1] === remote);
const remoteMatches =
  ["fetch", "push"].every((way) => remoteUrls.some((m) => m[3] === way)) &&
  remoteUrls.every((m) => (REMOTE_URL.exec(m[2]) || [])[1] === repository);
if (!remoteMatches) {
  return await stop(
    "remote-mismatch",
    `The fetch and push URLs of remote ${remote} do not point at ${repository}. Fix .dotagents.json or the remote, then relaunch.`,
  );
}
// Canonical source: issueNumber in target.ts. An Issue URL from another repo is not reused here by its number alone.
const issueUrlRepo = (/github\.com\/([\w.-]+\/[\w.-]+)\/issues\//.exec(issueRef) || [])[1];
if (issueUrlRepo && issueUrlRepo !== repository) {
  return await stop(
    "issue-repo-mismatch",
    `The Issue URL's repo, ${issueUrlRepo}, differs from repository ${repository} in .dotagents.json. Relaunch with an Issue of the target repo.`,
  );
}
if (repoInfo.nameWithOwner !== repository) {
  return await stop(
    "repository-mismatch",
    `The repo gh resolved, ${repoInfo.nameWithOwner}, differs from repository ${repository} in .dotagents.json.`,
  );
}
// Publication's preconditions are checked at Target, before any write. Codex also requires ciChecks and push permission to publish.
if (publishing && !config.ciChecks.length) {
  return await stop(
    "no-ci-checks",
    "Publishing needs the names of the CI checks to wait for in ciChecks. Add them, or relaunch with publishing turned off.",
  );
}
if (publishing && !["ADMIN", "MAINTAIN", "WRITE"].includes(repoInfo.viewerPermission)) {
  return await stop(
    "no-permission",
    `The permission on the target repo is ${repoInfo.viewerPermission || "unknown"}, which cannot push. The run does not switch to another actor.`,
  );
}
// Canonical source: previousRun in revision.ts. Only a PR this workflow published from this checkout, with its row
// kept, is revised. The published head and the PR-wide base come from that row, not GitHub's current state, so commits
// stacked after publication are detected.
if (revising && revisionPr[1] !== repository) {
  return await stop(
    "invalid-revision",
    `The PR's repo, ${revisionPr[1]}, differs from repository ${repository} in .dotagents.json.`,
  );
}
const revisionRow = revising ? parseJsonText(target.revision_row) : null;
const rowUsable = (row) =>
  Boolean(row) &&
  row.url === revisionUrl &&
  String(row.issue) === issueNumber &&
  row.repo === repo &&
  COMMIT_ID.test(String(row.commit)) &&
  COMMIT_ID.test(String(row.base_sha)) &&
  typeof row.branch === "string" &&
  row.branch !== "";
if (revising && !rowUsable(revisionRow)) {
  return await stop(
    "revision-no-record",
    `There is no record of publishing ${revisionUrl} from this checkout for Issue #${issueNumber} (a published_draft row in implement-runs.jsonl). Only PRs this workflow published are revised.`,
  );
}
// Canonical source: checkRevision in revision.ts. OPEN, author, head, base, and head repo are as published.
const prHeld = (fields) =>
  Boolean(fields) &&
  fields.state === "open" &&
  fields.html_url === revisionUrl &&
  fields.user === actor &&
  fields.head_sha === revisionRow.commit &&
  fields.head_ref === revisionRow.branch &&
  fields.head_repo === repository &&
  fields.base_ref === baseBranch &&
  fields.base_repo === repository;
const startBodySha = String(target.revision_body_sha || "").trim();
if (revising && (!prHeld(parseJsonText(target.revision_pr)) || !DIGEST_SHAPE.test(startBodySha))) {
  return await stop(
    "revision-target-changed",
    `${revisionUrl} changed since it was published (OPEN, author, head, or base). Reconcile the changes stacked after publication, then relaunch with a new revision request.`,
  );
}

// ---- Prepare: cut an isolated worktree and branch from the base, then run setup ----
phase("Prepare");
// The branch name is skills/checkout/references/branch-naming.md's <type>/<scope>-<description>.
// The type comes from the Issue title's prefix, and the description is built deterministically
// from the title's alphanumeric words.
const TYPE_BY_PREFIX = { bug: "fix", feature: "feat", docs: "docs", chore: "chore" };
const titlePrefix = (/^\[(\w+)\]/.exec(issue.title) || [])[1] || "";
const branchType = TYPE_BY_PREFIX[titlePrefix.toLowerCase()] || "feat";
const titleWords = issue.title
  .replace(/^\[\w+\]\s*/, "")
  .toLowerCase()
  .split(/[^a-z0-9]+/)
  .filter(Boolean)
  .slice(0, 4);
// A title with fewer than two alphanumeric words (a Japanese title, for example) cannot reach 2-4 words.
// Only then does an agent propose an English description once, and the script checks its shape. A reply
// outside the shape falls back to the title's own words.
const isDescription = (value) => {
  const words = String(value).split("-");
  return words.length >= 2 && words.length <= 4 && words.every((w) => /^[a-z0-9]+$/.test(w));
};
const named =
  revising || titleWords.length >= 2
    ? null
    : await agent(
        `Decide the description part of a branch name from the Issue title and put it in description. Do not run any command. ` +
          `Join 2-4 lowercase English words with hyphens, naming the target and the result (for example, highlight-search-match). Avoid vague words such as update.\n` +
          `Title: ${JSON.stringify(issue.title)}`,
        {
          label: "name",
          phase: "Prepare",
          agentType: "general-purpose",
          schema: closed({ description: str }),
          model: "haiku",
        },
      );
const description =
  named && isDescription(named.description) ? named.description : titleWords.join("-") || "issue";
// A revision keeps the published branch.
const branch = revising ? revisionRow.branch : `${branchType}/${issueNumber}-${description}`;
const worktree = `${repo}/.claude/worktrees/implement-${issueNumber}`;
const where = { branch, worktree };

const headSha = String(target.head_sha || "").trim();
if (!revising && !/^[0-9a-f]{40}$/.test(headSha)) {
  return await stop("target-unavailable", "Could not read the checkout's HEAD.", where);
}
// Canonical source: research-handoff.ts. The start commit equals the checkout's HEAD for a fresh run, and the PR-wide base for a revision.
const expectedStart = revising ? revisionRow.base_sha : headSha;
if (startCommit && startCommit !== expectedStart) {
  return await stop(
    "start-commit-mismatch",
    `Start commit ${startCommit} differs from the ${revising ? "PR-wide base" : "checkout's HEAD"} ${expectedStart}. Reconcile the reviewed references with the version that runs.`,
    where,
  );
}
// Each reference is a regular file at the start commit with the reviewed blob. Returns the paths that do not match.
// The form of a path in git ls-tree output. A path with non-ASCII bytes, quotes, backslashes, or control characters
// is quoted with its UTF-8 bytes escaped in octal (core.quotePath's default). A non-interactive session denies
// `git -c` at the permission check, so the listing keeps the default and is compared in this form.
const gitQuoted = (path) => {
  let quoted = false;
  const escape = (ch) => {
    const simple = { '"': '\\"', "\\": "\\\\", "\t": "\\t", "\n": "\\n" }[ch];
    if (simple) return simple;
    if (ch.charCodeAt(0) < 0x80) return ch;
    return encodeURIComponent(ch)
      .split("%")
      .slice(1)
      .map((hex) => `\\${Number.parseInt(hex, 16).toString(8)}`)
      .join("");
  };
  const body = [...path]
    .map((ch) => {
      const out = escape(ch);
      if (out !== ch) quoted = true;
      return out;
    })
    .join("");
  return quoted ? `"${body}"` : path;
};
const unmatchedReports = (listing) => {
  const pinned = new Map(
    String(listing || "")
      .split("\n")
      .map((line) => /^(\d{6}) blob ([0-9a-f]+)\s+(.+)$/.exec(line.trim()))
      .filter((m) => m && /^100(644|755)$/.test(m[1]))
      .map((m) => [m[3], m[2]]),
  );
  return reports.filter((r) => pinned.get(gitQuoted(r.path)) !== r.blob).map((r) => r.path);
};
const reportStop = (listing) => {
  const unmatched = unmatchedReports(listing);
  return unmatched.length
    ? stop(
        "report-mismatch",
        `References differ from their start-commit version (uncommitted, not a regular file, or changed since review): ${unmatched.join(", ")}`,
        where,
      )
    : null;
};
const earlyReportStop = revising ? null : reportStop(target.report_listing);
if (earlyReportStop) return await earlyReportStop;
const PREPARE_SCHEMA = closed({
  existing: bool,
  created: bool,
  base_sha: str,
  config_blob: str,
  checkout_head: str,
  setup_exits: list(int),
  setup_tail: str,
});
const REPREPARE_SCHEMA = closed({
  existing: bool,
  created: bool,
  wt_status: str,
  wt_branch: str,
  head: str,
  config_blob: str,
  base_config_blob: str,
  report_listing: str,
  setup_exits: list(int),
  setup_tail: str,
});
const setupStep = config.setup.length
  ? `4. Run these setup commands in order, stopping at the first non-zero exit. Set the Bash tool's timeout parameter to 600000. Put the exit codes of the commands run in setup_exits, and the last 40 lines of output of the last command run in setup_tail.\n` +
    config.setup
      .map((argv, i) => `   ${i + 1}. \`cd ${shq(worktree)} && ${argvLine(argv)}\``)
      .join("\n")
  : `4. There are no setup commands. Set setup_exits to [] and setup_tail to "".`;
const freshPrompt =
  `Prepare an isolated worktree for Issue #${issueNumber}. Return each value verbatim.\n` +
  `1. If \`git show-ref --verify --quiet ${shq(`refs/heads/${branch}`)}\` exits 0 or ${worktree} exists, set existing: true and created: false, and finish without changing anything.\n` +
  `2. Run \`git worktree add -b ${shq(branch)} ${shq(worktree)} ${shq(headSha)}\`, and put whether it exited 0 in created.\n` +
  `3. Put the output of \`git -C ${shq(worktree)} rev-parse HEAD\` in base_sha, and the output of \`git -C ${shq(worktree)} rev-parse HEAD:.dotagents.json\` in config_blob.\n` +
  setupStep +
  `\n5. Last, run \`git rev-parse HEAD\` and put its output in checkout_head.`;
// Canonical source: README § 既存PRの修正. The earlier checkout (worktree) is reused at the published head with no tracked
// or untracked changes. No stash, reset, rebase, or porting of working changes.
const revisionBase = revising ? revisionRow.base_sha : "";
const revisionPrompt =
  `Prepare the earlier worktree to revise ${revisionUrl}. Return each value verbatim. Do not delete, reset, or stash anything.\n` +
  `1. If ${worktree} exists, set existing: true and created: false. Otherwise set existing: false, run \`git worktree add ${shq(worktree)} ${shq(branch)}\`, and put whether it exited 0 in created.\n` +
  `2. Put the stdout of \`git -C ${shq(worktree)} status --porcelain --untracked-files=all\` in wt_status, the output of \`git -C ${shq(worktree)} rev-parse --abbrev-ref HEAD\` in wt_branch, and the output of \`git -C ${shq(worktree)} rev-parse HEAD\` in head.\n` +
  `3. Put the output of \`git -C ${shq(worktree)} rev-parse HEAD:.dotagents.json\` in config_blob, and the output of \`git -C ${shq(worktree)} rev-parse ${shq(`${revisionBase}:.dotagents.json`)}\` in base_config_blob.` +
  (reports.length
    ? ` Put the stdout of \`${argvLine(["git", "-C", worktree, "ls-tree", revisionBase, "--", ...reports.map((r) => r.path)])}\` in report_listing.\n`
    : ` Set report_listing to "".\n`) +
  setupStep;
const prepared = await agent(anchor(revising ? revisionPrompt : freshPrompt), {
  label: revising ? "reprepare" : "prepare",
  phase: "Prepare",
  agentType: "general-purpose",
  schema: revising ? REPREPARE_SCHEMA : PREPARE_SCHEMA,
  model: "haiku",
});
if (!prepared) {
  return await stop(
    "prepare-unavailable",
    "The agent preparing the worktree returned no result.",
    where,
  );
}
if (!revising && prepared.existing) {
  return await stop(
    "branch-exists",
    "A branch or worktree of the same name already exists. Reconcile the earlier run. This workflow neither reuses nor deletes it.",
    where,
  );
}
const worktreeReady = revising
  ? prepared.existing || prepared.created
  : prepared.created && /^[0-9a-f]{40}$/.test(prepared.base_sha);
if (!worktreeReady) {
  return await stop("worktree-failed", "Could not create the worktree and branch.", where);
}
recordedBranch = branch;
// Canonical source: "Start HEAD changed during preparation" in orchestrator.ts.
if (
  !revising &&
  (prepared.base_sha !== headSha || String(prepared.checkout_head).trim() !== headSha)
) {
  return await stop(
    "start-head-changed",
    "The checkout's HEAD moved during preparation, so the validated config and the version that runs no longer match. Check HEAD, then relaunch.",
    where,
  );
}
const reusedHeld =
  !String(prepared.wt_status || "").trim() &&
  String(prepared.wt_branch || "").trim() === branch &&
  String(prepared.head || "").trim() === (revising ? revisionRow.commit : "");
if (revising && !reusedHeld) {
  return await stop(
    "revision-worktree-mismatch",
    `The earlier worktree ${worktree} is not clean at the published head ${revisionRow.commit} on ${branch}. Reconcile the worktree, then relaunch. This workflow does not move changes.`,
    where,
  );
}
if (revising && String(prepared.config_blob).trim() !== String(prepared.base_config_blob).trim()) {
  return await stop(
    "config-changed",
    ".dotagents.json changed within the PR from its base. Check the target's setup, check, and capture contract, then relaunch.",
    where,
  );
}
const lateReportStop = revising ? reportStop(prepared.report_listing) : null;
if (lateReportStop) return await lateReportStop;
// The PR-wide base (the review diff's and the capture's baseline). For a revision it is the earlier start commit, and the published head becomes the new commit's parent.
const baseSha = revising ? revisionRow.base_sha : prepared.base_sha;
published.base_sha = baseSha;
const setupExits = prepared.setup_exits || [];
if (setupExits.length !== config.setup.length || setupExits.some((code) => code !== 0)) {
  return await stop(
    "setup-failed",
    `Setup did not complete (exit codes ${JSON.stringify(setupExits)}).`,
    {
      ...where,
      setup_tail: prepared.setup_tail,
    },
  );
}

// ---- Implement: implement the whole agreed Issue in one implementation pass ----
phase("Implement");
const requirements = `Title: ${issue.title}\n\n${issue.body}`;
const inTree = (p) =>
  `Work only inside the worktree at ${worktree}. Begin each shell command with \`cd ${worktree} && \` and edit files under that path only.\n\n${p}`;
// Canonical source: repairInstructions in ~/.agents/scripts/implement/repair.ts. The capture lines depend on whether capture is set.
const CAPTURE_RULES = capture
  ? [
      `Prepare the configured capture command and required media for this Issue. Reference final media at ${capture.destination}/.`,
      "The host runs capture separately from normal tests. Its command receives the absolute output directory as the final argument. Save only PNG/JPEG/WebP/MP4/WebM files directly under that directory (CAPTURE_OUTPUT for browser definitions). Close video contexts and save video there. Do not write media or reports into the checkout during capture.",
    ]
  : [
      "This target declares no capture. If the agreed Issue needs media, return needs_human to configure required capture before execution.",
    ];
const REPAIR_RULES = [
  "Before creating or updating tests, apply the target test policy when present and these common test criteria. Ask what realistic bug deleting each relevant test would miss. Compare its additional assurance with runtime, flakiness and maintenance cost; actively remove or consolidate tests that do not justify that cost. Do not retain tests merely for reassurance, test counts or coverage metrics. Explain any lost detection conditions and the remaining verification.",
  "In findings, explain the concrete bugs prevented by verification affected by this change, what it adds beyond existing verification, and why tests were added, retained, consolidated or removed. State lost detection conditions, remaining verification and unverified limits. Reuse sufficient existing tests; do not create a per-test ledger.",
  "Apply the target documentation policy when present to documentation-only changes and accompanying updates; keep current operating instructions accurate and historical results in evidence. Compare document facts, quantities, conditions, scope, authority, unverified claims and references with original sources.",
  "Do not commit, push or publish. Leave configured full verification to the host after your changes; do not launch browsers or servers in your sandbox.",
  ...CAPTURE_RULES,
  "Return repaired when implementation and test/capture definitions are ready; pending host execution alone is not needs_human. If requirements, scope, permissions or execution limits must change, return needs_human without changing them and stop work that depends on the answer.",
  "Return JSON with status repaired or needs_human, and findings explaining your changes or the necessary human decision. For needs_human, findings must not be empty or whitespace-only: explain the question, the choice the human must make and its impact. If an instruction file caused the stop, link the file actually read, quote the relevant instruction and distinguish its explicit requirement from your interpretation.",
].join("\n");
const REPLY_SCHEMA = closed({ status: choice(["repaired", "needs_human"]), findings: str });
// Checks an implementation or repair reply. Canonical source: parseRepairReply in repair.ts.
const replyProblem = (reply) => {
  if (!reply || typeof reply.findings !== "string") return "invalid-repair";
  if (reply.status === "repaired") return "";
  if (reply.status === "needs_human")
    return reply.findings.trim() ? "human-decision-required" : "invalid-repair";
  return "invalid-repair";
};
const actorRun = (role, prompt, label) =>
  agent(inTree(prompt), {
    label,
    phase: role === "implement" ? "Implement" : "Verify",
    agentType: "general-purpose",
    schema: REPLY_SCHEMA,
    model: "opus",
    effort: "high",
  });

// Canonical source: researchContext in research-handoff.ts. Implementation, repair, and independent review receive the same start commit and reference list.
const referenceContext = [
  `Implementation references: ${JSON.stringify({ startCommit: baseSha, reports })}`,
  "Requirements and agreement records are authoritative; references supply evidence, not additional authorization. Read the selected references and the relevant sources linked from the Issue, not every repository document. A reference blob identifies the handoff version in startCommit; compare it with current files and explain any changed evidence before relying on it.",
  "Trace each decision-relevant rule or finding to its source, version, applicability and agreement status. Distinguish observed facts, agreed rules and hypotheses. Do not apply evidence from another scope or promote an unagreed proposal to a requirement.",
  "If missing, stale or contradictory references affect a decision, identify the source, the affected decision and what must be investigated or agreed again. Resolve factual gaps through investigation; return requirement, scope or authorization changes to the human. Do not silently replace a reviewed reference with a newer ID.",
].join("\n");
// Canonical source: the documentation update in skills/implement/SKILL.md. Effects on wiki pages and decision records are checked through DOCUMENTS.md once the diff is ready.
const DOCUMENTS_RULE = `Once the diff is ready, run \`cat ${bundled("rules/conventions/DOCUMENTS.md")}\` and follow its Read and retain section: check the explanations the next task will need and the effect on existing wiki pages and decision records. Include required updates in this change and in the independent review. Do not create a page on every run.`;
// Canonical source: revisionContext in revision.ts. The revision request is canonical alongside the agreed Issue, and the whole PR meets both.
const revisionContext = revising
  ? [
      `This run revises the published PR ${revisionUrl}. The published head is ${revisionRow.commit}, and the PR-wide base is ${baseSha}.`,
      `The revision request a human adopted (canonical alongside the agreed Issue, with its scope, expected result, and permission):\n${revisionRequest}`,
      `Read the current PR body with \`gh pr view ${revisionUrl} --json body --jq .body\`. Check which of its explanations, unverified items, and attachment links are still needed.`,
    ].join("\n")
  : "";
const implemented = await actorRun(
  "implement",
  [
    revising
      ? "Revise the published PR within the adopted request, so the whole PR meets both the agreed Issue and the request. Follow applicable repository instructions; consult the target README and development policy sections relevant to this change."
      : "Implement the complete agreed Issue using existing code and verification assets. Follow applicable repository instructions; consult the target README and development policy sections relevant to this change.",
    revisionContext,
    referenceContext,
    DOCUMENTS_RULE,
    "Complete the agreed implementation, needed tests and documentation, and targeted checks needed to prepare it for host verification without pausing for approval of routine choices within scope; reuse sufficient existing verification. Do not change the Issue or weaken acceptance criteria.",
    "Documentation-only Issues use the same flow; add tests or code only when the agreed requirements need them. Include changed documents in the existing independent review.",
    REPAIR_RULES,
    `Target setup/check/capture contract (do not weaken or replace): ${JSON.stringify({ setup: config.setup, check: config.check, capture })}`,
    "Do not edit control scripts or credentials outside this worktree.",
    `Requirements:\n${requirements}`,
    `Issue: ${issue.url}`,
  ].join("\n"),
  "implement",
);
const implementProblem = replyProblem(implemented);
if (implementProblem) {
  return await stop(
    implementProblem,
    (implemented && implemented.findings) || "The implementation agent returned no valid reply.",
    where,
  );
}

// ---- Verify: loop capture -> check -> independent review -> repair until accepted (no round cap, dotagents #155) ----
phase("Verify");
const TREE_SHAPE = /^[0-9a-f]{40}$/;
const stageTree = `git -C ${shq(worktree)} add -A && git -C ${shq(worktree)} write-tree`;
const SNAPSHOT_SCHEMA = closed({ issue_digest: str, tree: str, config_blob: str });
// The worktree's .dotagents.json at the start. Canonical source: unchangedTarget in orchestrator.ts, which catches an agent editing the config.
const baseConfigBlob = String(prepared.config_blob || "").trim();
// Observes the requirements (the Issue's digest), the deliverable (the worktree's tree id), and the config (the staged .dotagents.json blob) at once.
const snapshot = async (label, stage = "Verify") => {
  const snap = await agent(
    anchor(
      `Run these commands and return each output verbatim. Do not summarize or judge.\n` +
        `1. \`${issueDigestCommand(` --repo ${shq(repository)}`)}\`: put the printed 64-digit hex in issue_digest (an empty string when it fails).\n` +
        `2. \`${stageTree}\`: put the printed tree id in tree (an empty string when it fails).\n` +
        `3. \`git -C ${shq(worktree)} rev-parse :.dotagents.json\`: put the printed blob id in config_blob (an empty string when it fails).`,
    ),
    {
      label,
      phase: stage,
      agentType: "general-purpose",
      schema: SNAPSHOT_SCHEMA,
      model: "haiku",
    },
  );
  return snap && { ...snap, configHeld: String(snap.config_blob).trim() === baseConfigBlob };
};
const requirementsHeld = (snap) => Boolean(snap) && snap.issue_digest === issueDigest;
const history = [];
// Turns a host check or capture failure into evidence for the repair agent, with the previous review attached as history when one exists.
const hostFailure = (message) =>
  [
    message,
    history.length
      ? `Previous independent review (historical; verify current artifacts):\n${reviewSummary(history)}`
      : "",
  ].join("\n");

// ---- Capture: canonical source is verifyHost and captureDecision in correction.ts ----
// {harness} expands to the Codex harness at ~/.agents. The adapter's path inside it comes from the target's capture command alone, since the harness moves it between versions.
const captureArg = (arg) => arg.split("{harness}").map(shq).join('"$H"');
const captureLine = (argv) => argv.map(captureArg).join(" ");
// Definition files in the checkout that the capture command's arguments point at directly. A change to one forces a recapture, whatever its extension.
const captureDefinitions = capture
  ? capture.command
      .filter((arg) => !arg.includes("{harness}"))
      .map((arg) =>
        arg.startsWith("-") && arg.includes("=") ? arg.slice(arg.indexOf("=") + 1) : arg,
      )
      .filter((arg) => arg && !arg.startsWith("-"))
      .map((arg) => arg.replace(/^\.\//, ""))
  : [];
const destinationDir = capture ? capture.destination.replace(/\/+$/, "") : "";
const recordPrefix = destinationDir.includes("/")
  ? `${destinationDir.slice(0, destinationDir.lastIndexOf("/"))}/`
  : "";
// Saved records in the destination's parent directory (excluding the destination), treated as a place that capture does not read from.
const isRecordFile = (path) =>
  /\.(json|txt|log|stdout|stderr|diff)$/.test(path) &&
  path.startsWith(recordPrefix) &&
  !path.startsWith(`${destinationDir}/`);
const DIFF_LINE = /^:(\d{6}) (\d{6}) [0-9a-f]+ [0-9a-f]+ [A-Z]\d*\t(.+)$/;
const PLAIN_MODE = /^(000000|100644)$/;
// Whether the changes are only regular files that capture does not read (Markdown, plus saved records after the first capture).
// A symlink, an executable-bit or capture-definition change, or a line that cannot be classified forces a recapture.
const onlyNonRendering = (raw, allowRecords) => {
  const lines = String(raw).split("\n").filter(Boolean);
  return (
    lines.length > 0 &&
    lines.every((line) => {
      const m = DIFF_LINE.exec(line);
      if (!m || !PLAIN_MODE.test(m[1]) || !PLAIN_MODE.test(m[2])) return false;
      if (captureDefinitions.includes(m[3])) return false;
      return m[3].endsWith(".md") || (allowRecords && isRecordFile(m[3]));
    })
  );
};
const DIFF_SCHEMA = closed({ exit_code: int, raw: str });
const treeDiff = (from, to, label) =>
  agent(
    anchor(
      `Run this command and return its output verbatim. Do not summarize or judge.\n` +
        `\`git -C ${shq(worktree)} diff-tree -r --no-renames ${shq(from)} ${shq(to)}\`: put its exit code in exit_code and its stdout in raw.`,
    ),
    { label, phase: "Verify", agentType: "general-purpose", schema: DIFF_SCHEMA, model: "haiku" },
  );
let lastCaptureTree = "";
let lastCapture = null;
// Decides whether to capture: reuse on the same tree; with required: false, a documentation-only change needs no capture or reuses one; anything else captures.
const captureDecision = async (tree) => {
  if (lastCaptureTree === tree) return "reused";
  if (capture.required) return "execute";
  const from = lastCaptureTree || `${baseSha}^{tree}`;
  const diff = await treeDiff(from, tree, `capture-diff:${counts.check_runs + 1}`);
  if (!diff || diff.exit_code !== 0 || !onlyNonRendering(diff.raw, Boolean(lastCaptureTree)))
    return "execute";
  return lastCaptureTree ? "reused" : "not_required";
};
const CAPTURE_SCHEMA = closed({
  started: bool,
  timed_out: bool,
  exit_code: int,
  log_tail: str,
  tree: str,
});
const runCapture = (output, label) =>
  agent(
    `Run the capture once and return the result verbatim. Do not fix anything.\n` +
      `1. Run \`test -d "$HOME/.agents/scripts" && mkdir ${shq(output)}\`. If it exits non-zero, set started: false, timed_out: false, and exit_code: -1, put its output in log_tail, and go to step 3.\n` +
      `2. Run \`cd ${shq(worktree)} && H="$HOME/.agents" && ${captureLine([...capture.command, output])}\` with the Bash tool's timeout parameter set to 600000, and set started: true. On a timeout set timed_out: true and exit_code: -1; otherwise set timed_out: false and put its exit code in exit_code. Put the last 80 lines of its combined output in log_tail.\n` +
      `3. Run \`${stageTree}\` and put the tree id in tree (an empty string when it fails).`,
    {
      label,
      phase: "Verify",
      agentType: "general-purpose",
      schema: CAPTURE_SCHEMA,
      model: "haiku",
    },
  );
const INSTALL_SCHEMA = closed({ stdout: str, tree: str });
const installMedia = (output, label) =>
  agent(
    anchor(
      `Install the captured media and return the result verbatim. Do not summarize or judge.\n` +
        `1. \`node ${bundled("workflows/implement/install-media.ts")} ${shq(output)} ${shq(worktree)} ${shq(capture.destination)}\`: put its stdout verbatim in stdout.\n` +
        `2. \`${stageTree}\`: put the printed tree id in tree (an empty string when it fails).`,
    ),
    {
      label,
      phase: "Verify",
      agentType: "general-purpose",
      schema: INSTALL_SCHEMA,
      model: "haiku",
    },
  );
// Decides a stop from a capture run. Exit code 78 is the value the Codex capture adapter uses for "cannot start".
const shotStop = (shot, tree) => {
  if (!shot)
    return {
      stop: "capture-unavailable",
      why: "The agent running the capture returned no result.",
    };
  if (shot.timed_out)
    return { stop: "capture-timeout", why: `The capture timed out.\n${shot.log_tail}` };
  if (!shot.started || shot.exit_code === 78)
    return { stop: "capture-unavailable", why: `The capture could not start.\n${shot.log_tail}` };
  if (shot.tree !== tree)
    return {
      stop: "source-changed",
      why: "The worktree changed during the capture. The capture does not write into the checkout.",
    };
  return null;
};
const captureStep = async (tree) => {
  if (!capture) return {};
  if (!TREE_SHAPE.test(String(tree)))
    return { stop: "check-unavailable", why: "Could not get the tree id." };
  const decision = await captureDecision(tree);
  if (decision !== "execute") {
    lastCapture = { ...lastCapture, decision };
    return {};
  }
  lastCaptureTree = "";
  counts.captures += 1;
  const output = `${worktree}-capture-${counts.captures}`;
  const shot = await runCapture(output, `capture:${counts.captures}`);
  const stopped = shotStop(shot, tree);
  if (stopped) return stopped;
  if (shot.exit_code !== 0)
    return {
      evidence: hostFailure(
        `The host capture failed with exit code ${shot.exit_code}. The end of its output:\n${shot.log_tail}`,
      ),
    };
  const installed = await installMedia(output, `install:${counts.captures}`);
  const result = installed ? parseJsonText(installed.stdout) : null;
  if (!result || !result.ok) {
    const reason = (result && result.reason) || "Could not get the media install result.";
    return {
      stop: reason === "ignored" ? "capture-media-ignored" : "invalid-capture",
      why: reason,
    };
  }
  if (!TREE_SHAPE.test(String(installed.tree)))
    return { stop: "check-unavailable", why: "Could not get the tree id after installing media." };
  lastCaptureTree = installed.tree;
  lastCapture = { decision, files: result.files, output };
  return {};
};

const CHECK_SCHEMA = closed({ exit_code: int, log_tail: str, tree: str });
const runCheck = (label) =>
  agent(
    `Run the target check once and return the result verbatim. Do not fix anything.\n` +
      `1. Run \`cd ${shq(worktree)} && ${argvLine(config.check)}\` with the Bash tool's timeout parameter set to 600000 (macOS ships no timeout binary). Put its exit code in exit_code (-1 when it could not start or timed out), and the last 80 lines of its combined output in log_tail.\n` +
      `2. Then run \`${stageTree}\` and put the tree id in tree (an empty string when it fails).`,
    { label, phase: "Verify", agentType: "general-purpose", schema: CHECK_SCHEMA, model: "haiku" },
  );

// Canonical source: reviewSchema in ~/.agents/scripts/implement/review.ts. The host assigns the ID, the first target, and the disposition.
const REVIEW_SCHEMA = closed({
  findings: text,
  targetId: text,
  assessments: closed({ code: text, requirements: text, tests: text, documentation: text }),
  updates: list(
    closed({ id: text, disposition: choice(["open", "fixed", "not_applicable"]), reason: text }),
  ),
  newItems: list(
    closed({
      kind: choice(["defect", "concern"]),
      area: choice(["code", "requirements", "tests", "documentation"]),
      required: bool,
      location: closed({
        path: { type: ["string", "null"] },
        line: { type: ["integer", "null"] },
      }),
      condition: text,
      impact: text,
      evidence: text,
      action: text,
      reason: text,
    }),
  ),
  documents: list(
    closed({ path: text, role: choice(["current", "historical", "proposal"]), reason: text }),
  ),
  handoff: list(text),
});
// Canonical source: reviewInstructions in review.ts. The lines about knowledge nodes and the PR
// publication split are not carried over, since this workflow handles neither.
const REVIEW_RULES = [
  "Independently review the current deliverables on every initial review and re-evaluation. Read the current diff AND affected callers and callees, shared types, state transitions, error handling and relevant tests. Adjudicate previous items while also checking the current related paths for recurring or new concrete problems; fixing previous items alone is not grounds for acceptance. Do not audit unrelated code or demand out-of-scope features or stylistic preferences.",
  "Assess four separate dimensions: code correctness (input boundaries, state updates, async behavior and failure side effects) and concrete redundancy; agreed Issue requirements and scope; realistic test detection; required documentation and evidence consistency with the implementation version.",
  "Report code defects even when the Issue does not explicitly enumerate the behavior. Distinguish demonstrated defects from unverified concerns. Neither no findings nor passing check guarantees absence of defects.",
  "For change-related redundancy, expand affected helper calls to the reads and checks they perform. For each repeated observation, identify the intervening operation or distinct guarantee requiring another fresh result. Similar appearance, brevity, line counts and preference alone are not findings. Zero findings is valid.",
  "Mark demonstrated redundancy required when its target, conditions and waste are established and a local repair within the agreed scope can preserve necessary guarantees; return it through the repair loop for resolution before publication. Do not use a size or severity quota. Unclear benefit, preference alone or out-of-scope redesign is not a required redundancy fix.",
  "Read the target test policy. Ask what realistic bug deleting each relevant test would miss, weigh assurance against runtime, flakiness and maintenance, and detect copied expectations or negative tests passing for the wrong reason. Justified deletion or consolidation is not a defect merely because counts decrease.",
  "Apply the target documentation policy, including documentation-only changes. Compare changed documents with the Issue, original sources, code and check results, including facts, quantities, conditions, scope, authority, unverified claims and references. Distinguish current policy, historical evidence and unadopted proposals. When media was captured, confirm that what it captured corresponds to the current code.",
  "A decision-blocking gap or contradiction is a required open finding with the affected decision and return path in action. Human decisions cannot be resolved by the reviewer.",
  "Compare implementation premises with the Issue and the references (Implementation references) at their handoff versions. In the requirements and documentation assessments, explain relevant applicability, agreement and changed evidence. Trace contradictory observations through their sources to the affected premise and Issue decision. A decision-blocking gap or contradiction is a required open finding, not an accepted handoff task.",
  "Do not edit files or run the full check. The host check result is in the host context. Use current artifacts and necessary targeted verification to adjudicate findings; do not trust repair self-reports.",
  "Read repairsSinceReview in the host context in order: the additional repairs completed since the previous independent review (or since execution began for the initial review), including repairs followed by failed checks. Follow each entry's evidence, changes and reasons for leaving artifacts unchanged. Treat repair explanations as claims to investigate, never as automatic fixed or accepted judgments; independently reassess every previous item against current evidence. An empty repairsSinceReview is valid for an initial review.",
  "The PR body publishes assessments, current item reasons (also condition/impact/action for open items), document reasons and handoff. Assign each explanation one home: code explains the concrete change and why; requirements maps it to agreed behavior; tests states actual verification and limits; documentation explains source applicability, versions, agreement and changed premises. Do not repeat the same change, conclusion or caveat across assessments. For fixed or not_applicable findings, reason is the complete public response: identify the relevant problem and conditions, and the current resolution or non-applicability and its basis.",
  "Return the review JSON schema. Echo targetId from the host context. Give substantive reasons in all four assessments, including applicability. findings is the overall summary. Return updates and newItems, not status or items; the host computes status from required open findings.",
  "Each newItems entry needs kind, area, required, location, condition, impact, evidence, action, and reason. Omit id, introducedIn and disposition. Use null path/line when no real code location exists. Never invent locations or reproduction runs.",
  "Return exactly one updates entry for EVERY previous item ID, including already resolved items, with only id, disposition (open, fixed, not_applicable) and reason. On the first review updates is empty. Explain concrete evidence for fixes or non-applicability, not merely an implementer claim. Reopen when needed. Keep unresolved required items open.",
  "List principal repository documents actually consulted in documents, with their repository-relative path, role current/historical/proposal and reference reason. A path must be a regular file in the reviewed tree; the host checks it.",
  "The host alone adds routine publication/upload/CI tasks, the assigned AI's comparison of the public body and its rendered-media checks, and human review/approval/merge to the PR body according to execution conditions. Do not repeat them in handoff or other public-facing fields. Their pending status before publication is not an implementation defect. Limit handoff to Issue-specific unverified conditions, required follow-up and named owners; return [] when none remain.",
].join("\n");

const blankText = (value) => typeof value !== "string" || !value.trim();
const badLocation = (loc) =>
  !loc ||
  (loc.line !== null && (blankText(loc.path) || !Number.isInteger(loc.line) || loc.line < 1));
// Empty strings and the line-number range are checked here rather than in the schema, so acceptance
// does not rest on minLength and minimum, which no existing workflow has passed to agent().
const blankFields = (value) => {
  const problems = [];
  if (blankText(value.findings)) problems.push("findings");
  for (const key of ["code", "requirements", "tests", "documentation"]) {
    if (blankText(value.assessments && value.assessments[key])) problems.push(`assessments.${key}`);
  }
  for (const u of value.updates) if (blankText(u.reason)) problems.push(`updates[${u.id}].reason`);
  for (const [n, f] of value.newItems.entries()) {
    const missing = ["condition", "impact", "evidence", "action", "reason"].filter((k) =>
      blankText(f[k]),
    );
    if (missing.length) problems.push(`newItems[${n}].${missing.join("/")}`);
    if (badLocation(f.location)) problems.push(`newItems[${n}].location`);
  }
  return problems;
};
const idProblem = (prior, value) => {
  const ids = new Set(prior.map((item) => item.id));
  const updateIds = value.updates.map((u) => u.id);
  if (new Set(updateIds).size !== updateIds.length) return "Duplicate finding update ID";
  const unknown = updateIds.filter((id) => !ids.has(id));
  if (unknown.length) return `Unknown finding update ID: ${unknown.join(", ")}`;
  const omitted = prior.filter((item) => !updateIds.includes(item.id)).map((item) => item.id);
  if (omitted.length) return `Prior finding omitted: ${omitted.join(", ")}`;
  const paths = value.documents.map((d) => d.path);
  return new Set(paths).size === paths.length ? "" : "Duplicate document reference";
};
// Canonical source: parseReview in review.ts. status is computed from whether any required item is
// open, not taken from the reviewer's own report.
const mergeReview = (value, targetId, attempt, previous) => {
  if (
    !value ||
    !Array.isArray(value.updates) ||
    !Array.isArray(value.newItems) ||
    !Array.isArray(value.documents)
  ) {
    return { error: "The review reply is missing or lacks a required array" };
  }
  if (value.targetId !== targetId)
    return { error: `Review target mismatch: expected ${targetId}, got ${value.targetId}` };
  const prior = previous ? previous.items : [];
  const problem = idProblem(prior, value) || blankFields(value).join(", ");
  if (problem) return { error: problem };
  const updates = new Map(value.updates.map((u) => [u.id, u]));
  const items = [
    ...prior.map((item) => ({
      ...item,
      disposition: updates.get(item.id).disposition,
      reason: updates.get(item.id).reason,
    })),
    ...value.newItems.map((f, n) => ({
      ...f,
      id: `R${attempt}-${n + 1}`,
      introducedIn: targetId,
      disposition: "open",
    })),
  ];
  const open = items.some((item) => item.required && item.disposition === "open");
  const { findings, assessments, documents, handoff } = value;
  return {
    review: {
      status: open ? "needs_changes" : "accepted",
      findings,
      targetId,
      assessments,
      items,
      documents,
      handoff,
    },
  };
};
// Canonical source: reviewSummary in review.ts.
const reviewSummary = (entries) => {
  const current = entries.at(-1);
  if (!current) return "";
  const place = (item) =>
    `${item.location.path || "No file location"}${item.location.line === null ? "" : `:${item.location.line}`}`;
  return [
    current.findings,
    `Review target: ${current.targetId}`,
    ...Object.entries(current.assessments).map(([key, value]) => `${key}: ${value}`),
    ...current.documents.map((doc) => `Source: ${doc.path} (${doc.role}): ${doc.reason}`),
    ...current.items.map(
      (item) =>
        `${item.id} (${item.area}/${item.kind}, ${item.disposition}, required=${item.required}, target=${item.introducedIn}): ${place(item)}: ${item.condition}; impact: ${item.impact}; evidence: ${item.evidence}; action: ${item.action}; judgment: ${item.reason}`,
    ),
    ...current.handoff.map((action) => `Handoff: ${action}`),
    "Structured validation and passing checks do not guarantee absence of defects.",
  ].join("\n\n");
};

// The explanations of repairs completed since the previous independent review, including repairs
// followed by a failed check; a completed review empties it. Canonical source: repairsSinceReview in
// correction.ts. Reasons for leaving artifacts unchanged, and rebuttals, become material the next review checks itself.
let repairsSinceReview = [];
const CONFIG_CHANGED = {
  stop: "config-changed",
  why: "The worktree's .dotagents.json changed from its start version. An agent in the run does not change the target's setup, check, or capture contract.",
};
const DOCUMENTS_SCHEMA = closed({ exit_code: int, listing: str });
const TREE_ENTRY = /^(\d{6}) (\w+) [0-9a-f]+\s+(.+)$/;
// Canonical source: the document reference check in correction.ts. A document a review names must be a
// regular file in the reviewed tree; the PR body links to it, so a missing document is never published.
const missingDocuments = async (review, tree, attempt) => {
  const paths = review.documents.map((doc) => doc.path);
  if (!paths.length) return [];
  const listed = await agent(
    anchor(
      `Run this command and return its output verbatim. Do not summarize or judge.\n` +
        `1. \`${argvLine(["git", "-C", worktree, "ls-tree", tree, "--", ...paths])}\`: put its exit code in exit_code and its stdout in listing.`,
    ),
    {
      label: `documents:${attempt}`,
      phase: "Verify",
      agentType: "general-purpose",
      schema: DOCUMENTS_SCHEMA,
      model: "haiku",
    },
  );
  if (!listed || listed.exit_code !== 0) return paths;
  const files = new Set(
    String(listed.listing)
      .split("\n")
      .map((line) => TREE_ENTRY.exec(line.trim()))
      .filter((m) => m && /^100(644|755)$/.test(m[1]))
      .map((m) => m[3]),
  );
  return paths.filter((path) => !files.has(gitQuoted(path)));
};
const reviewRound = async (checked) => {
  counts.review_rounds += 1;
  const attempt = counts.review_rounds;
  const previous = history.at(-1) || null;
  const hostContext = {
    targetId: checked.tree,
    attempt,
    worktree,
    baseCommit: baseSha,
    diff: `git -C ${worktree} diff --cached ${baseSha} (the host has staged every change)`,
    check: { command: config.check, exit_code: checked.exit_code },
    capture: lastCapture,
    previous,
    repairsSinceReview,
    revision: revising ? { pr: revisionUrl, publishedHead: revisionRow.commit } : null,
  };
  const response = await agent(
    inTree(
      [
        REVIEW_RULES,
        // Canonical source: revision.ts:236. The accepted review becomes the new public body, so what the previous body still needs is kept.
        revising
          ? "This run revises an existing PR. Review the whole PR from baseCommit against both the agreed Issue and the revision request. The accepted review assessments and handoff become the new public PR body. Compare the previous body with current artifacts and explicitly retain all still-applicable change explanations, unresolved limitations and public attachment links in those fields. Do not copy obsolete success claims or historical generated sections. Missing necessary context is needs_changes."
          : "",
        `Host context: ${JSON.stringify(hostContext)}`,
        `Requirements:\n${requirements}`,
        revisionContext,
        referenceContext,
      ].join("\n"),
    ),
    {
      label: `review:${attempt}`,
      phase: "Verify",
      agentType: "general-purpose",
      schema: REVIEW_SCHEMA,
      model: "opus",
      effort: "high",
    },
  );
  const after = await snapshot(`source:${attempt}`);
  if (!requirementsHeld(after))
    return {
      stop: "requirements-changed",
      why: "The Issue (its title, body, state, or updatedAt, which a comment also moves) changed during the review. A human agrees on the changed requirements before a new run.",
    };
  if (!after.configHeld) return CONFIG_CHANGED;
  if (after.tree !== checked.tree)
    return {
      stop: "source-changed",
      why: "The worktree changed during the review. The reviewer does not edit files.",
    };
  const merged = mergeReview(response, checked.tree, attempt, previous);
  if (merged.error) return { stop: "invalid-review", why: merged.error };
  const missing = await missingDocuments(merged.review, checked.tree, attempt);
  if (missing.length)
    return {
      stop: "invalid-review",
      why: `The review names documents missing from the reviewed tree: ${missing.join(", ")}`,
    };
  // The completed review has read the repair explanations so far. A failed check has not.
  repairsSinceReview = [];
  return { review: merged.review };
};
// Runs the check and, when it passes, the review. Returns exactly one of a stop, repair evidence, or acceptance.
const checkAndReview = async () => {
  counts.check_runs += 1;
  const checked = await runCheck(`check:${counts.check_runs}`);
  if (!checked || !Number.isInteger(checked.exit_code) || !TREE_SHAPE.test(checked.tree)) {
    return {
      stop: "check-unavailable",
      why: "Could not get the check result or the tree id. Check the execution environment.",
    };
  }
  if (checked.exit_code !== 0) {
    return {
      evidence: hostFailure(
        `The host check \`${argvLine(config.check)}\` failed with exit code ${checked.exit_code}. The end of its output:\n${checked.log_tail}`,
      ),
    };
  }
  const round = await reviewRound(checked);
  if (round.stop) return round;
  history.push(round.review);
  if (round.review.status === "accepted")
    return { accepted: { review: round.review, tree: checked.tree } };
  return { evidence: reviewSummary(history) };
};
const repairPrompt = (evidence) =>
  [
    "Repair only within these agreed requirements. Read the current files and fix the root cause.",
    "When findings recur, compare the existing review records and prior repair results with the current artifacts, reassess the cause and repair approach, and continue required corrections within the agreed scope. Do not make out-of-scope improvements or preferences completion conditions.",
    "Return document content defects to repair and renew affected checks and independent review.",
    "Preserve agreed acceptance criteria and verification of required behavior; never hide realistic regressions to make checks pass.",
    "Run only targeted checks needed to diagnose or validate your repair.",
    REPAIR_RULES,
    `Requirements:\n${requirements}\nFailure evidence:\n${evidence}`,
    revisionContext,
    referenceContext,
  ].join("\n");

let accepted = null;
while (!accepted) {
  const before = await snapshot(`requirements:${counts.check_runs + 1}`);
  if (!requirementsHeld(before)) {
    return await stop(
      "requirements-changed",
      "The Issue (its title, body, state, or updatedAt, which a comment also moves) changed during the run. A human agrees on the changed requirements before a new run.",
      where,
    );
  }
  if (!before.configHeld) return await stop(CONFIG_CHANGED.stop, CONFIG_CHANGED.why, where);
  const shot = await captureStep(before.tree);
  const step = shot.stop || shot.evidence ? shot : await checkAndReview();
  if (step.stop) {
    return await stop(step.stop, step.why, { ...where, review: history.at(-1) || null });
  }
  if (step.accepted) {
    accepted = step.accepted;
    break;
  }
  // Canonical source: beforeRepair in correction.ts. A check can take minutes, so the Issue is checked again right before the repair.
  const beforeRepair = await snapshot(`before-repair:${counts.repairs + 1}`);
  if (!requirementsHeld(beforeRepair)) {
    return await stop(
      "requirements-changed",
      "The Issue (its title, body, state, or updatedAt, which a comment also moves) had changed right before the repair. A human agrees on the changed requirements before a new run.",
      { ...where, review: history.at(-1) || null },
    );
  }
  counts.repairs += 1;
  const repaired = await actorRun(
    "repair",
    repairPrompt(step.evidence),
    `repair:${counts.repairs}`,
  );
  const repairProblem = replyProblem(repaired);
  if (repairProblem) {
    return await stop(
      repairProblem,
      (repaired && repaired.findings) || "The repair agent returned no valid reply.",
      // Keep the open findings the human has to judge in the stopped result.
      { ...where, review: history.at(-1) || null },
    );
  }
  repairsSinceReview.push({ attempt: counts.repairs, findings: repaired.findings });
}

const verified = {
  issue: issue.url,
  actor,
  ...where,
  base_sha: baseSha,
  tree: accepted.tree,
  review: accepted.review,
  capture: lastCapture,
  summary: reviewSummary(history),
};
if (!publishing) {
  await recordRun("verified_local");
  return {
    status: "verified_local",
    why: "The local capture, check, and independent review accepted the current deliverables. Publishing is turned off.",
    ...verified,
    ...counts,
    run_id: runId,
    // Canonical source: remaining in orchestrator.ts. Publication and the human's judgment stay outside this workflow.
    remaining: [
      "commit",
      "publication",
      "ci",
      "published_body_check",
      "mark_ready",
      "human_review",
    ],
  };
}

// ---- Ship: canonical source is ship in orchestrator.ts and publish.ts. Check before writing, read back after every write ----
phase("Ship");
// A stop after publication starts returns the known commit and URL, so a human can reconcile them with GitHub's actual state.
const shipStop = (reason, why, fields = {}) =>
  stop(reason, why, {
    ...where,
    ...published,
    review: accepted.review,
    // Local verification is done. Before the PR's URL is known, publication remains too.
    remaining: [...(published.url ? [] : ["publication"]), ...REMAINING_AFTER_PR],
    ...fields,
  });
const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// The body is never transcribed by an LLM; it is matched by digest (FNV-1a over UTF-16 code units, plus length).
// An agent rewrites characters over a transcription of a few KB, turning half-width kana into full-width, for example.
// Trailing whitespace carries no meaning and is not compared, since GitHub's storage can shift the final newline.
// The function's source is also embedded in node -e, so it uses no template literal.
const digest = (text) => {
  const t = String(text).trimEnd();
  let h = 0x811c9dc5;
  for (let i = 0; i < t.length; i += 1) {
    h ^= t.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0") + ":" + t.length;
};
const sameBody = (reported, text) => String(reported || "").trim() === digest(text);

const gate = await snapshot("ship", "Ship");
if (!requirementsHeld(gate)) {
  return await shipStop(
    "requirements-changed",
    "The Issue (its title, body, state, or updatedAt, which a comment also moves) changed after acceptance. A human agrees on the changed requirements before a new run.",
  );
}
if (!gate.configHeld) return await shipStop(CONFIG_CHANGED.stop, CONFIG_CHANGED.why);
if (gate.tree !== accepted.tree) {
  return await shipStop(
    "source-changed",
    "The worktree changed after acceptance. Publication needs a fresh check and independent review.",
  );
}

const PULLS_SCHEMA = closed({ actor: str, pulls_exit: int, pulls_json: str });
const owner = repository.split("/")[0];
const pulls = await agent(
  anchor(
    `Run these commands and return each output verbatim. Do not summarize or judge.\n` +
      `1. \`gh api user --jq .login\`: put its stdout in actor (an empty string when it fails).\n` +
      `2. \`gh api ${shq(`repos/${repository}/pulls`)} --method GET -f state=open -f ${shq(`head=${owner}:${branch}`)} --paginate --slurp\`: put its exit code in pulls_exit and its stdout in pulls_json.`,
  ),
  {
    label: "pulls",
    phase: "Ship",
    agentType: "general-purpose",
    schema: PULLS_SCHEMA,
    model: "haiku",
  },
);
if (!pulls || String(pulls.actor || "").trim() !== actor) {
  return await shipStop(
    "actor-changed",
    `The gh user changed from ${actor}. The run does not publish as another actor. Check the gh authentication.`,
  );
}
const pages = pulls.pulls_exit === 0 ? parseJsonText(pulls.pulls_json) : null;
if (!Array.isArray(pages) || !pages.every(Array.isArray)) {
  return await shipStop("pulls-unreadable", "Could not read the open PRs on this branch.");
}
const clash = pages.flat().find(
  (pr) =>
    pr &&
    pr.head &&
    pr.head.ref === branch &&
    pr.head.repo &&
    pr.head.repo.full_name === repository &&
    // In a revision, the PR being revised uses this branch itself.
    !(revising && pr.html_url === revisionUrl),
);
if (clash) {
  return await shipStop(
    "branch-pr-exists",
    `An open PR already uses this branch (${clash.html_url}). Reconcile it before publishing.`,
  );
}

// Canonical source: checkRevision in revision.ts. In a revision, before any write, the PR must be unchanged since the
// start; a ready PR is returned to draft and read back. Ready is never restored.
if (revising) {
  const current = await agent(
    anchor(
      `Run these commands and return each output verbatim. Do not summarize or judge.\n` +
        `1. \`${prFieldsCommand}\`: put its stdout in pr_fields.\n` +
        `2. \`${prBodyShaCommand}\`: put the printed 64-digit hex in body_sha.`,
    ),
    {
      label: "revision-pr",
      phase: "Ship",
      agentType: "general-purpose",
      schema: closed({ pr_fields: str, body_sha: str }),
      model: "haiku",
    },
  );
  const fields = current ? parseJsonText(current.pr_fields) : null;
  if (!current || !prHeld(fields) || String(current.body_sha).trim() !== startBodySha) {
    return await shipStop(
      "revision-target-changed",
      `The head, base, author, or body of ${revisionUrl} changed since this run started. The run does not overwrite someone else's change; a human decides how to incorporate it.`,
    );
  }
  if (fields.draft !== true) {
    const undone = await agent(
      anchor(
        `Return the PR to draft and return the result verbatim. Do not retry on failure. Do not summarize or judge.\n` +
          `1. \`${argvLine(["gh", "pr", "ready", revisionUrl, "--undo", "--repo", repository])}\`: put its exit code in undo_exit.\n` +
          `2. \`${argvLine(["gh", "api", prApiPath, "--jq", ".draft"])}\`: set is_draft to true when it prints true, otherwise false.`,
      ),
      {
        label: "undo-ready",
        phase: "Ship",
        agentType: "general-purpose",
        schema: closed({ undo_exit: int, is_draft: bool }),
        model: "haiku",
      },
    );
    if (!undone || undone.undo_exit !== 0 || undone.is_draft !== true) {
      return await shipStop(
        "publication-unconfirmed",
        `Could not confirm that ${revisionUrl} is back to draft. Check the PR's state on GitHub before any further write. Ready is not restored.`,
      );
    }
  }
}

const COMMIT_SCHEMA = closed({ commit_exit: int, commit: str, parent: str, tree: str, files: str });
const inWorktree = (...argv) => argvLine(["git", "-C", worktree, ...argv]);
const committed = await agent(
  anchor(
    `Commit the accepted worktree once and return each output verbatim. Do not summarize, fix, or judge.\n` +
      `1. \`${inWorktree("add", "-A")} && ${inWorktree("commit", "-m", `${issue.title} (#${issueNumber})`)}\`: put its exit code in commit_exit.\n` +
      `2. \`${inWorktree("rev-parse", "HEAD")}\`: put the printed sha in commit.\n` +
      `3. \`${inWorktree("rev-parse", "HEAD^")}\`: put the printed sha in parent.\n` +
      `4. \`${inWorktree("rev-parse", "HEAD^{tree}")}\`: put the printed tree id in tree.\n` +
      `5. \`${inWorktree("diff-tree", "--no-commit-id", "--name-only", "--diff-filter=AM", "-r", "HEAD")}\`: put its stdout in files.`,
  ),
  {
    label: "commit",
    phase: "Ship",
    agentType: "general-purpose",
    schema: COMMIT_SCHEMA,
    model: "haiku",
  },
);
if (!committed || committed.commit_exit !== 0 || !TREE_SHAPE.test(String(committed.commit))) {
  return await shipStop(
    "commit-failed",
    "Could not create the commit. Check the worktree and the hook output.",
  );
}
published.commit = committed.commit;
// A commit hook that rewrote the content, or a commit that is not the single one on the base, stops as a mismatch with the accepted tree.
// In a revision, the new commit's parent is the published head, not the PR-wide base.
if (
  committed.tree !== accepted.tree ||
  committed.parent !== (revising ? revisionRow.commit : baseSha)
) {
  return await shipStop(
    "commit-mismatch",
    "The commit's tree or parent differs from the accepted tree on the base. This run does not rewrite the branch, so reconcile it before publishing.",
  );
}
const MEDIA_FILE = /\.(png|jpe?g|webp|mp4|webm)$/i;
const media = capture
  ? String(committed.files)
      .split("\n")
      .map((file) => file.trim())
      .filter((file) => file.startsWith(`${destinationDir}/`) && MEDIA_FILE.test(file))
  : [];

// Canonical source: publicText in pr-body.ts. Paths under the known local roots, and explicit filesystem notation outside them, are redacted.
const PATH_SUFFIX = /[A-Za-z0-9_./\\:@%+~=-]*/.source;
const OMITTED = "(internal path omitted)";
const publicText = (value) => {
  let result = String(value);
  for (const root of [worktree, repo]) {
    result = result.replace(
      new RegExp(`(?<![\\w/:])${escapeRegExp(root)}(?![\\w.-])${PATH_SUFFIX}`, "g"),
      OMITTED,
    );
  }
  return result.replace(
    new RegExp(`(?<![\\w/:])(?:file:///|~/|[A-Za-z]:\\\\)${PATH_SUFFIX}`, "g"),
    OMITTED,
  );
};
const docLink = (doc) =>
  `https://github.com/${repository}/blob/${published.commit}/${doc.path.split("/").map(encodeURIComponent).join("/")}`;
const itemLine = (item) =>
  item.disposition === "open"
    ? `- ${item.kind} / open: ${publicText(item.condition)} Impact: ${publicText(item.impact)} Judgment: ${publicText(item.reason)} Required action: ${publicText(item.action)}`
    : `- ${item.kind} / ${item.disposition}: ${publicText(item.reason)}`;
const MEDIA_TASKS = [
  `- Workflow: attach the media of the target commit (${media.join(", ")}).`,
  "- Assigned AI: on the actual PR page after attachment, confirm that the media displays or plays and matches its description and placement (rendered_media_check).",
];
// Canonical source: prBody in pr-body.ts. Only facts fit for publication are selected from the accepted review; the internal summary and history stay out.
const prBody = (review) =>
  [
    `Closes #${issueNumber}`,
    "## Changes and rationale",
    publicText(review.assessments.code),
    "## Requirements coverage",
    publicText(review.assessments.requirements),
    "## Verification and unverified items",
    `Target commit: ${published.commit}`,
    `Workflow: matched against the verified deliverable. The local check (${publicText(JSON.stringify(config.check))}) passed. Independent review: accepted.`,
    publicText(review.assessments.tests),
    ...(review.items.length ? ["## Findings and responses", ...review.items.map(itemLine)] : []),
    "## Documents and sources",
    publicText(review.assessments.documentation),
    ...review.documents.map(
      (doc) => `- [${doc.path}](${docLink(doc)}) (${doc.role}): ${publicText(doc.reason)}`,
    ),
    "## Remaining work and owners",
    "When this body was written, the draft publication, CI, the body and media checks, the switch to ready, and human approval were not complete.",
    `- Workflow: publish this PR as a draft and confirm that CI on the same head (${config.ciChecks.join(", ")}) registers and succeeds.`,
    ...(media.length ? MEDIA_TASKS : []),
    ...review.handoff.map((action) => `- ${publicText(action)}`),
    "- Assigned AI: compare the latest public body with the Issue, the target commit, the accepted review, and the verification results (published_body_check). After confirming the body, the required media, and CI on the same head, recheck, switch to ready, and read it back (mark_ready). Keep the draft while anything is unconfirmed.",
    "- Human: decide any change to requirements or permissions, and decide review, approval, and merge.",
  ].join("\n\n") + "\n";
const body = prBody(accepted.review);
// So a later revision can match the published body's version from the row.
published.body_digest = digest(body);
// The body lives outside the worktree (a sibling, like the capture output), so the committed tree stays clean.
const bodyFile = `${worktree}-pr.md`;
// The agent receives the body as UTF-8 base64. It turned \uXXXX escapes back into their characters
// while copying them and broke the shell quoting, so the payload takes a form the agent cannot read.
// The conversion runs inside the script, with no reliance on the runtime.
const utf8Bytes = (text) => {
  const bytes = [];
  for (const ch of text) {
    const cp = ch.codePointAt(0);
    if (cp < 0x80) bytes.push(cp);
    else if (cp < 0x800) bytes.push(0xc0 | (cp >> 6), 0x80 | (cp & 0x3f));
    else if (cp < 0x10000)
      bytes.push(0xe0 | (cp >> 12), 0x80 | ((cp >> 6) & 0x3f), 0x80 | (cp & 0x3f));
    else
      bytes.push(
        0xf0 | (cp >> 18),
        0x80 | ((cp >> 12) & 0x3f),
        0x80 | ((cp >> 6) & 0x3f),
        0x80 | (cp & 0x3f),
      );
  }
  return bytes;
};
const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
// Wrapped at 76 characters a line. An agent copies a run of short lines more faithfully than one long line.
const base64Lines = (text) => {
  const bytes = utf8Bytes(text);
  let out = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const [a, b, c] = [bytes[i], bytes[i + 1], bytes[i + 2]];
    const n = (a << 16) | ((b ?? 0) << 8) | (c ?? 0);
    out += B64[n >> 18] + B64[(n >> 12) & 63];
    out += b === undefined ? "=" : B64[(n >> 6) & 63];
    out += c === undefined ? "=" : B64[n & 63];
  }
  return out.match(/.{1,76}/g) || [];
};
// The function's source is embedded with its line breaks collapsed, so the agent's command stays on one line.
const DIGEST_SRC = String(digest).replace(/\s*\n\s*/g, " ");
const DIGEST_JS = `const digest = ${DIGEST_SRC}; console.log(digest(require("fs").readFileSync(process.argv[1], "utf8")))`;
const writeBlock = [
  `base64 -d > ${shq(bodyFile)} <<'PR_BODY_B64'`,
  ...base64Lines(body),
  "PR_BODY_B64",
].join("\n");
const written = await agent(
  `Write the PR body to a file and return its digest. Copy the base64 lines unchanged; do not decode, re-wrap, or edit them. Do not summarize or judge.\n` +
    `1. Run the block below as one Bash call, exactly as written, and put its exit code in write_exit.\n` +
    "```sh\n" +
    writeBlock +
    "\n```\n" +
    `2. \`node -e ${shq(DIGEST_JS)} ${shq(bodyFile)}\`: put its stdout in body_digest.`,
  {
    label: "body",
    phase: "Ship",
    agentType: "general-purpose",
    schema: closed({ write_exit: int, body_digest: str }),
    // This role copies a few KB of base64 without dropping a character, so sonnet takes it rather than haiku.
    model: "sonnet",
  },
);
if (!written || written.write_exit !== 0 || !sameBody(written.body_digest, body)) {
  return await shipStop(
    "pr-body-mismatch",
    `The written PR body differs from the generated body (${bodyFile}). Nothing has been published.`,
  );
}

// pushArguments in Codex's target.ts pushes through a command-scoped remote URL and a replaced credential helper.
// Claude Code's auto mode denies that shape as a remote repoint, so the push goes to the configured remote Target verified.
// In its place, right before the push, every effective push URL, after insteadOf and pushInsteadOf, must point at repository.
const probe = await agent(
  anchor(
    `Run these commands and return each output verbatim. Do not summarize or judge.\n` +
      `1. \`${inWorktree("remote", "get-url", "--push", "--all", remote)}\`: put its stdout in push_url.\n` +
      `2. \`${inWorktree("ls-remote", "--get-url", remote)}\`: put its stdout in effective_url.`,
  ),
  {
    label: "push-target",
    phase: "Ship",
    agentType: "general-purpose",
    schema: closed({ push_url: str, effective_url: str }),
    model: "haiku",
  },
);
const pointsAtRepository = (url) => (REMOTE_URL.exec(url.trim()) || [])[1] === repository;
const pushUrls = String((probe && probe.push_url) || "")
  .split("\n")
  .filter((line) => line.trim());
if (
  !probe ||
  !pushUrls.length ||
  !pushUrls.every(pointsAtRepository) ||
  !pointsAtRepository(String(probe.effective_url))
) {
  return await shipStop(
    "push-target-mismatch",
    `The effective push target of remote ${remote} does not point at ${repository}. Check git's insteadOf settings. Nothing has been pushed.`,
  );
}
const pushed = await agent(
  anchor(
    `Push once and return each output verbatim. Do not retry on failure. Do not summarize or judge.\n` +
      `1. \`${inWorktree("push", "--no-follow-tags", remote, `${branch}:refs/heads/${branch}`)}\`: put its exit code in push_exit and the last 20 lines of its output in push_tail.\n` +
      `2. \`${inWorktree("ls-remote", remote, `refs/heads/${branch}`)}\`: put its stdout in remote_sha.`,
  ),
  {
    label: "push",
    phase: "Ship",
    agentType: "general-purpose",
    schema: closed({ push_exit: int, push_tail: str, remote_sha: str }),
    model: "haiku",
  },
);
const remoteSha = String((pushed && pushed.remote_sha) || "")
  .trim()
  .split(/\s/)[0];
if (!pushed || pushed.push_exit !== 0 || remoteSha !== published.commit) {
  return await shipStop(
    "push-unconfirmed",
    `Could not confirm that the remote ${branch} points at commit ${published.commit}. Check the remote branch before any further write. The run does not push again automatically.`,
    { push_tail: (pushed && pushed.push_tail) || "" },
  );
}
const PR_URL_SHAPE = new RegExp(
  `^https://github\\.com/${escapeRegExp(repository)}/pull/[1-9]\\d*$`,
);
// A fresh run opens the draft PR once. A revision opens none; per the revision path in publish.ts, it only rewrites the body.
const openPr = async () => {
  const created = await agent(
    anchor(
      `Open the draft PR once and return its output verbatim. Do not retry on failure. Do not summarize or judge.\n` +
        `1. \`${argvLine(["gh", "pr", "create", "--draft", "--repo", repository, "--base", baseBranch, "--head", branch, "--title", issue.title, "--body-file", bodyFile])}\`: put its exit code in create_exit, the last line of its stdout in url, and the last 20 lines of its output in create_tail.`,
    ),
    {
      label: "create",
      phase: "Ship",
      agentType: "general-purpose",
      schema: closed({ create_exit: int, url: str, create_tail: str }),
      model: "haiku",
    },
  );
  const url = String((created && created.url) || "").trim();
  return created && created.create_exit === 0 && PR_URL_SHAPE.test(url)
    ? { url }
    : {
        stop: "publication-unconfirmed",
        why: "The result of opening the PR is unknown. Check the actual PR on GitHub before any further write. The run does not open it again automatically.",
        fields: { url, create_tail: (created && created.create_tail) || "" },
      };
};
const rewriteBody = async () => {
  const edited = await agent(
    anchor(
      `Rewrite the PR body once and return the output verbatim. Do not retry on failure. Do not summarize or judge.\n` +
        `1. \`${argvLine(["gh", "pr", "edit", revisionUrl, "--repo", repository, "--body-file", bodyFile])}\`: put its exit code in edit_exit and the last 20 lines of its output in edit_tail.`,
    ),
    {
      label: "edit-body",
      phase: "Ship",
      agentType: "general-purpose",
      schema: closed({ edit_exit: int, edit_tail: str }),
      model: "haiku",
    },
  );
  return edited && edited.edit_exit === 0
    ? { url: revisionUrl }
    : {
        stop: "publication-unconfirmed",
        why: "Unknown whether the PR body was rewritten. Check the body on GitHub before any further write. The run does not rewrite it again automatically.",
        fields: { url: revisionUrl, edit_tail: (edited && edited.edit_tail) || "" },
      };
};
const opened = revising ? await rewriteBody() : await openPr();
if (opened.stop) return await shipStop(opened.stop, opened.why, opened.fields);
published.url = opened.url;
// Canonical source: checkPublishedPr in publish.ts and matchPrPublication in pr-identity.ts.
// The agent returns only the fields the checks read, with the body replaced by its digest.
const PROJECT_JS =
  `const digest = ${DIGEST_SRC}; const p = JSON.parse(require("fs").readFileSync(0, "utf8")); ` +
  `const at = (o, k) => (o && typeof o === "object" ? o[k] : undefined); ` +
  `console.log(JSON.stringify({ state: p.state, draft: p.draft, html_url: p.html_url, user: { login: at(p.user, "login") }, ` +
  `head: { sha: at(p.head, "sha"), ref: at(p.head, "ref"), repo: { full_name: at(at(p.head, "repo"), "full_name") } }, ` +
  `base: { ref: at(p.base, "ref"), repo: { full_name: at(at(p.base, "repo"), "full_name") } }, ` +
  `body: typeof p.body === "string" ? digest(p.body) : null }))`;
const readback = await agent(
  anchor(
    `Run this command exactly as written and return its output verbatim. Do not summarize or judge.\n` +
      `1. \`gh api ${shq(`repos/${repository}/pulls/${published.url.split("/").at(-1)}`)} | node -e ${shq(PROJECT_JS)}\`: put its exit code in readback_exit and its stdout in pr_json.`,
  ),
  {
    label: "readback",
    phase: "Ship",
    agentType: "general-purpose",
    schema: closed({ readback_exit: int, pr_json: str }),
    model: "haiku",
  },
);
const pr = readback && readback.readback_exit === 0 ? parseJsonText(readback.pr_json) : null;
const pick = (value, ...keys) =>
  keys.reduce((v, key) => (v && typeof v === "object" ? v[key] : undefined), value);
const PUBLICATION_CHECKS = [
  ["state", (p) => p.state === "open"],
  ["draft", (p) => p.draft === true],
  ["url", (p) => p.html_url === published.url],
  ["author", (p) => pick(p, "user", "login") === actor],
  ["head", (p) => pick(p, "head", "sha") === published.commit && pick(p, "head", "ref") === branch],
  ["head repository", (p) => pick(p, "head", "repo", "full_name") === repository],
  [
    "base",
    (p) =>
      pick(p, "base", "ref") === baseBranch && pick(p, "base", "repo", "full_name") === repository,
  ],
  ["body", (p) => sameBody(p.body, body)],
];
const differing =
  pr && typeof pr === "object"
    ? PUBLICATION_CHECKS.filter(([, ok]) => !ok(pr)).map(([name]) => name)
    : ["readback"];
if (differing.length) {
  return await shipStop(
    "publication-unconfirmed",
    `The published PR does not match what this run opened (${differing.join(", ")}). Reconcile it on GitHub before any further write.`,
  );
}

if (media.length) {
  const attached = await agent(
    anchor(
      `Attach the media once and return the output verbatim. Do not retry on failure. Do not summarize or judge.\n` +
        `1. \`${argvLine(["gh", "pr", "edit", published.url, "--repo", repository, ...media.flatMap((file) => ["--attach", `${worktree}/${file}`])])}\`: put its exit code in attach_exit and the last 20 lines of its output in attach_tail.`,
    ),
    {
      label: "attach",
      phase: "Ship",
      agentType: "general-purpose",
      schema: closed({ attach_exit: int, attach_tail: str }),
      model: "haiku",
    },
  );
  if (!attached || attached.attach_exit !== 0) {
    return await shipStop(
      "attach-failed",
      "Could not confirm the media attachment. Check the PR's attachments before any further write. The run does not attach again automatically.",
      { attach_tail: (attached && attached.attach_tail) || "" },
    );
  }
}
// ---- CI: canonical source is waitForCi in ci.ts. Wait for CI on the same head; the script classifies it ----
phase("CI");
// Codex waits within a 540-second budget. Here one wait fits 540 seconds, inside the Bash tool's
// cap, and a round count bounds the waits in case one returns early before checks register.
const CI_WAIT_ROUNDS = 6;
// --jq replaces the body with whether it still carries the Issue reference, so the body itself is never transcribed.
const CI_FIELDS = "url,headRefOid,baseRefName,state,isDraft,body,statusCheckRollup";
const checkState = (value) => {
  if (!value) return undefined;
  if (value.status === undefined) return value.state;
  return value.status === "COMPLETED" ? value.conclusion : "PENDING";
};
// Canonical source: checkStatus in ci.ts. A required SKIPPED or NEUTRAL check does not count as a success.
const checkStatus = (values) => {
  const checks = values.map((value) => ({
    name: value && (value.name ?? value.context),
    state: checkState(value),
  }));
  if (checks.some((c) => typeof c.name !== "string" || typeof c.state !== "string")) return null;
  const required = config.ciChecks;
  const failed = checks.filter(
    ({ name, state }) =>
      !["SUCCESS", "SKIPPED", "NEUTRAL", "PENDING"].includes(state) ||
      (required.includes(name) && ["SKIPPED", "NEUTRAL"].includes(state)),
  );
  const missing = required.filter((name) => !checks.some((c) => c.name === name));
  const running = checks.filter((c) => c.state === "PENDING");
  const status = failed.length
    ? "failed"
    : missing.length
      ? "missing"
      : running.length
        ? "running"
        : "passed";
  return {
    status,
    checks,
    missing,
    running: running.map((c) => c.name),
    failed: failed.map((c) => c.name),
  };
};
// Canonical source: parseTarget in ci.ts. A PR on another head or base, no longer a draft, or missing the Issue reference cannot confirm this commit's CI.
const ciTargetHeld = (view) =>
  view.headRefOid === published.commit &&
  view.baseRefName === baseBranch &&
  view.state === "OPEN" &&
  view.isDraft === true &&
  view.url === published.url &&
  view.body === true;
const observeCi = (viewed) => {
  if (!viewed || viewed.view_exit !== 0) return { status: "unavailable" };
  const view = parseJsonText(viewed.view_json);
  if (!view || typeof view !== "object") return { status: "invalid_response" };
  if (!ciTargetHeld(view)) return { status: "target_changed", head: view.headRefOid };
  const observed = Array.isArray(view.statusCheckRollup)
    ? checkStatus(view.statusCheckRollup)
    : null;
  return observed || { status: "invalid_response" };
};
const CI_STOPS = {
  failed: [
    "ci-failed",
    "CI failed, or a required check did not conclude SUCCESS. The PR stays a draft. Read the failing check's log and fix the cause.",
  ],
  target_changed: [
    "ci-target-changed",
    "The PR's head, base, OPEN and draft state, or Issue reference changed from what was published. Reconcile it before judging CI.",
  ],
  unavailable: [
    "ci-unavailable",
    "Could not read the PR and CI. Check gh's authentication, permissions, and connectivity. CI is unconfirmed, not a code failure.",
  ],
  invalid_response: [
    "ci-invalid-response",
    "The PR and CI response has an unexpected shape. Inspect the raw response before judging this commit again.",
  ],
};
let ci = null;
while (counts.ci_rounds < CI_WAIT_ROUNDS) {
  counts.ci_rounds += 1;
  const viewed = await agent(
    anchor(
      `Wait for the draft PR's CI once and return the PR's state verbatim. Do not summarize, fix, or judge.\n` +
        `1. Run \`${argvLine(["gh", "pr", "checks", published.url, "--repo", repository, "--watch", "--interval", "10"])}\` with the Bash tool's timeout parameter set to 540000. It runs only to wait, so do not return its exit code or output.\n` +
        `2. \`${argvLine(["gh", "pr", "view", published.url, "--repo", repository, "--json", CI_FIELDS, "--jq", `.body |= test("Closes #${issueNumber}([^0-9]|$)")`])}\`: put its exit code in view_exit and its stdout in view_json.`,
    ),
    {
      label: `ci:${counts.ci_rounds}`,
      phase: "CI",
      agentType: "general-purpose",
      schema: closed({ view_exit: int, view_json: str }),
      model: "haiku",
    },
  );
  ci = observeCi(viewed);
  if (CI_STOPS[ci.status]) {
    const [reason, why] = CI_STOPS[ci.status];
    return await shipStop(reason, why, { ci });
  }
  if (ci.status === "passed") break;
}
if (!ci || ci.status !== "passed") {
  return await shipStop(
    "ci-timed-out",
    `After ${CI_WAIT_ROUNDS} waits, the required checks had not all succeeded. The PR stays a draft. Do not resume this run; check the registered and running checks.`,
    { ci },
  );
}

await recordRun("published_draft");
return {
  status: "published_draft",
  why: "The verified commit was published as a draft PR, and CI on the same head passed.",
  ...verified,
  ...published,
  media,
  ci,
  ...counts,
  run_id: runId,
  // Canonical source: remaining in orchestrator.ts. The switch to ready and the human's judgment stay outside this workflow.
  remaining: [
    ...(media.length ? ["rendered_media_check"] : []),
    "published_body_check",
    "mark_ready",
    "human_review",
  ],
};
