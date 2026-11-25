/// <reference types="node" />
import { randomUUID } from "node:crypto";
import { join } from "node:path";
import { git, LAUNCH_FILE, treeHash } from "../../../hooks/_lib/gate_record.ts";
import { type ChildOutcome, type ChildRun, GIVE_REPLY, runClaudeOnce } from "./claude-child.ts";
import { agreedIssueOf, ASSESSED, digestOf, DONE_GATE, finishedSessionOf, gateAt, gateStatusOf, holding, implementStateOf, type Launch, listOf, nonEmpty, notDoneOf, notImplemented, notPrepared, objectOf, oneLine, outputOf, parseObject, type Prepared, preparedAt, type Problem, type Result, stopped, viewIssue, type WorktreeCall, writeLaunch } from "./launch-state.ts";
import { capturedParagraph, captureFailedPrompt, continuePrompt, earlierParagraph, INDEPENDENT_JUDGING_SCHEMA, INDEPENDENT_REVIEW_SCHEMA, independentOpening, JUDGE_EARLIER, JUDGING_SCHEMA, notCapturedParagraph, promptFor, PUBLISHED_FIELDS, repairPrompt, replyParagraph, rereadPrompt, resumePrompt, REVIEW_SCHEMA, REVIEW_TOOLS, reviewPrompt, ROLES, selfOpening, STATES } from "./prompts.ts";
import { capture, type CaptureConfig, captureConfigOf, captureDecisionOf, captureStateOf, lastPassedOf } from "./capture.ts";

const CHILD_TIMEOUT_MS = 3_600_000;

const issueChange = (launch: Launch, worktree: string): Problem | null => {
  const agreed = agreedIssueOf(launch, worktree);
  return "found" in agreed ? null : agreed;
};

const alreadyImplemented = (worktree: string): string =>
  `The implementing session of ${worktree} has finished. Call implement with --fresh to discard its records and start a new session.`;

const NO_SESSION = "No conversation found with session ID";

const noSessionOf = (outcome: ChildOutcome): boolean => outcome.code !== 0 && outcome.stderr.includes(NO_SESSION);

const tailOf = (outcome: ChildOutcome): string => oneLine(outcome.stderr.split("\n").slice(-3).join(" "));

const failureOf = (outcome: ChildOutcome): string | null => {
  if (outcome.timedOut) return `claude -p was ended at its ${CHILD_TIMEOUT_MS} ms limit. ${tailOf(outcome)}`;
  if (outcome.code !== 0) return `claude -p exited ${outcome.code}. ${tailOf(outcome)}`;
  return null;
};

const replyOf = (outcome: ChildOutcome): Record<string, unknown> | string =>
  failureOf(outcome) ?? parseObject(outcome.stdout) ?? `claude -p printed no JSON object. ${tailOf(outcome)}`;

const turnResultsOf = (stdout: string): Record<string, unknown>[] =>
  stdout
    .split("\n")
    .map(parseObject)
    .filter((line): line is Record<string, unknown> => line?.type === "result");

const everyTurnReplyOf = (outcome: ChildOutcome): Record<string, unknown> | string => {
  const failure = failureOf(outcome);
  if (failure !== null) return failure;
  const turns = turnResultsOf(outcome.stdout);
  if (turns.length === 0) return `claude -p printed no result event. ${tailOf(outcome)}`;
  const said = turns.map((turn) => turn.result).filter(nonEmpty);
  return { ...turns[turns.length - 1], result: said.map((text) => text.trim()).join("\n\n") };
};

const sessionReplyOf = (outcome: ChildOutcome): (Record<string, unknown> & { session_id: string }) | string => {
  const reply = everyTurnReplyOf(outcome);
  if (typeof reply === "string") return reply;
  if (typeof reply.session_id !== "string") return "the JSON claude -p printed has no session_id string.";
  return reply as Record<string, unknown> & { session_id: string };
};

const shownOf = (reply: Record<string, unknown>) => ({
  result: reply.result,
  cost_usd: reply.total_cost_usd,
  duration_ms: reply.duration_ms,
});

interface ImplementChild {
  outcome: ChildOutcome;
  resumed: boolean;
  issueDigest: unknown;
  base: Record<string, unknown>;
}

const runChild = async (run: ChildRun): Promise<ChildOutcome> => {
  const outcome = await runClaudeOnce({ ...run, onStart: (pid) => holding?.started(pid) });
  holding?.ended();
  return outcome;
};

const implementingRun = ({ worktree, model, effort }: WorktreeCall) =>
  ({ model, effort, schema: undefined, cwd: worktree, timeoutMs: CHILD_TIMEOUT_MS, everyTurn: true });

const resumeImplementing = (call: WorktreeCall, prompt: string, resume: string): Promise<ChildOutcome> =>
  runChild({ ...implementingRun(call), prompt, resume });

export const implement = async (call: WorktreeCall): Promise<Result> => {
  const { worktree, fresh } = call;
  const stop = (reason: string, detail: string, extra: Record<string, unknown> = {}) =>
    stopped("implement", reason, detail, extra);

  const prepared = preparedAt(worktree);
  if (prepared === null) return stop("not-prepared", notPrepared(worktree));
  const { gate, launchPath, stored, launch } = prepared;
  const state = implementStateOf(stored);
  if (state === "finished" && !fresh) return stop("already-implemented", alreadyImplemented(worktree));
  const changed = issueChange(launch, worktree);
  if (changed !== null) return stop(changed.reason, changed.detail);

  const startNew = async (): Promise<ImplementChild> => {
    const sessionId = randomUUID();
    const kept = Object.hasOwn(stored, "publications") ? { publications: stored.publications } : {};
    const implementRecord = { session_id: sessionId, issue_digest: launch.issue_digest, started_at: new Date().toISOString() };
    const base = { ...launch, ...kept, implement: implementRecord };
    writeLaunch(launchPath, base);
    const outcome = await runChild({ ...implementingRun(call), prompt: promptFor(launch.issue, launch.repository, DONE_GATE), sessionId });
    return { outcome, resumed: false, issueDigest: launch.issue_digest, base };
  };
  const resume = async (): Promise<ImplementChild> => {
    const earlier = objectOf(stored.implement) ?? {};
    const prompt = resumePrompt(launch.issue, launch.repository, launch.base, DONE_GATE);
    const outcome = await resumeImplementing(call, prompt, earlier.session_id as string);
    return noSessionOf(outcome) ? startNew() : { outcome, resumed: true, issueDigest: earlier.issue_digest, base: stored };
  };
  const child = state === "unfinished" && !fresh ? await resume() : await startNew();
  const reply = sessionReplyOf(child.outcome);
  if (typeof reply === "string") return stop("child-failed", reply);

  const status = gateStatusOf(worktree);
  const tree = treeHash(gate.root);
  const finished = {
    session_id: reply.session_id,
    tree,
    issue_digest: child.issueDigest,
    reply: typeof reply.result === "string" ? reply.result : "",
    at: new Date().toISOString(),
  };
  writeLaunch(launchPath, { ...child.base, implement: finished });
  const shown = { session_id: reply.session_id, tree, ...shownOf(reply), ...(child.resumed ? { resumed: true } : {}) };
  if (status.status !== 0) return stop("not-done", notDoneOf(status), shown);
  return { action: "implement", ok: true, ...shown };
};

type Side = "self" | "independent";
type Verdict = "accepted" | "rejected";

const SIDES: readonly Side[] = ["self", "independent"];

interface Review {
  verdict: Verdict;
  findings: Record<string, unknown>[];
  previous: Record<string, unknown>[];
  verified: unknown;
  session_id: unknown;
  cost_usd: unknown;
  duration_ms: unknown;
  assessments?: unknown;
  documents?: unknown;
  handoff?: unknown;
}

type Published = Pick<Review, "assessments" | "documents" | "handoff">;

type PublishedCheck = (output: Record<string, unknown>) => Published | null;

const verdictOf = (rejected: boolean): Verdict => (rejected ? "rejected" : "accepted");

const previousOf = (value: unknown, keys: readonly string[]): Record<string, unknown>[] | null => {
  if (!Array.isArray(value)) return null;
  const judged = value.map(objectOf);
  const named = judged.map((judgment) => judgment?.key);
  const shaped = judged.every((judgment) => typeof judgment?.key === "string" && STATES.includes(judgment.state));
  const sameKeys = named.length === keys.length && new Set(named).size === named.length && keys.every((key) => named.includes(key));
  return shaped && sameKeys ? (judged as Record<string, unknown>[]) : null;
};

const assessedOf = (value: unknown): boolean => {
  const assessments = objectOf(value);
  return assessments !== null && ASSESSED.every((name) => nonEmpty(assessments[name]));
};

const regularFileIn = (root: string, tree: string | null, path: string): boolean => {
  if (tree === null) return false;
  const listed = git(["ls-tree", "-z", tree, "--", path], root);
  const entries = (listed ?? "").split("\0").filter((entry) => entry !== "");
  if (entries.length !== 1) return false;
  const [entry] = entries;
  const mode = entry.slice(0, entry.indexOf(" "));
  return (mode === "100644" || mode === "100755") && entry.slice(entry.indexOf("\t") + 1) === path;
};

const documentsOf = (value: unknown, holds: (path: string) => boolean): boolean => {
  if (!Array.isArray(value)) return false;
  const documents = value.map(objectOf);
  const paths = documents.map((document) => document?.path);
  const shaped = documents.every(
    (document) =>
      typeof document?.path === "string" && ROLES.includes(document.role) && nonEmpty(document.reason) && holds(document.path),
  );
  return shaped && new Set(paths).size === paths.length;
};

const handoffOf = (value: unknown): boolean => Array.isArray(value) && value.every(nonEmpty);

export const publishedFieldsOf = (
  { assessments, documents, handoff }: Record<string, unknown>,
  holds: (path: string) => boolean,
): Published | null =>
  assessedOf(assessments) && documentsOf(documents, holds) && handoffOf(handoff) ? { assessments, documents, handoff } : null;

const publishedCheck =
  (root: string, tree: string | null): PublishedCheck =>
  (output) =>
    publishedFieldsOf(output, (path) => regularFileIn(root, tree, path));

const reviewOf = (reply: Record<string, unknown>, keys: readonly string[] | null, published: PublishedCheck | null): Review | null => {
  const output = objectOf(reply.structured_output);
  const findings = output?.findings;
  if (!output || !Array.isArray(findings)) return null;
  const shaped = findings.map(objectOf);
  if (!shaped.every((finding) => typeof finding?.required === "boolean")) return null;
  const previous = keys === null ? [] : previousOf(output.previous, keys);
  if (previous === null) return null;
  const publishedFields = published === null ? {} : published(output);
  if (publishedFields === null) return null;
  return {
    verdict: verdictOf(findings.some((finding) => finding.required === true) || previous.some((judgment) => judgment.state === "open")),
    findings,
    previous,
    verified: output.verified,
    session_id: reply.session_id,
    cost_usd: reply.total_cost_usd,
    duration_ms: reply.duration_ms,
    ...publishedFields,
  };
};

const unshapedOf = (keys: readonly string[] | null, published: PublishedCheck | null): string => {
  const shape =
    keys === null
      ? "its structured_output is not an object whose findings array has a boolean required in every element"
      : "its structured_output is not an object whose findings array has a boolean required in every element and whose previous array judges each earlier key exactly once as fixed, open, or withdrawn";
  return published === null ? shape : `${shape} and whose assessments, documents, and handoff are as the prompt asks`;
};

const runReview = async (run: ChildRun, keys: readonly string[] | null, published: PublishedCheck | null): Promise<Review | string> => {
  const unshaped = unshapedOf(keys, published);
  const first = replyOf(await runChild(run));
  if (typeof first === "string") return first;
  const review = reviewOf(first, keys, published);
  if (review !== null) return review;
  if (!nonEmpty(first.session_id)) return `${unshaped}, and the JSON has no session_id to ask again in.`;
  const again = replyOf(await runChild({ ...run, prompt: GIVE_REPLY, resume: first.session_id, fork: undefined }));
  if (typeof again === "string") return `${unshaped}; asked once more, ${again}`;
  return reviewOf(again, keys, published) ?? `${unshaped}, also after asking once more.`;
};

const recordOf = ({ session_id, verdict, findings, previous, verified, assessments, documents, handoff }: Review) => ({
  session_id,
  verdict,
  findings,
  previous,
  verified,
  assessments,
  documents,
  handoff,
});

const earlierRequired = (records: unknown[]): Record<string, unknown>[] | null => {
  const required = objectOf(records[records.length - 1])?.required;
  return Array.isArray(required) && required.length > 0 ? required.map((entry) => objectOf(entry) ?? {}) : null;
};

const earlierLine = ({ key, side, location, condition, problem, action }: Record<string, unknown>): string =>
  JSON.stringify({ key, side, location, condition, problem, action });

const repairAnswering = (stored: Record<string, unknown>, reviewRound: unknown): Record<string, unknown> | null => {
  const repairs = listOf(stored, "repairs");
  const last = objectOf(repairs[repairs.length - 1]);
  return last !== null && last.review_round === reviewRound ? last : null;
};

const repairReplyTo = (stored: Record<string, unknown>, reviewRound: unknown): string | null => {
  const reply = repairAnswering(stored, reviewRound)?.reply;
  return typeof reply === "string" && reply !== "" ? reply : null;
};

const requiredAfter = (round: number, earlier: Record<string, unknown>[], reviews: Record<Side, Review>) => {
  const carried = earlier.flatMap(({ key, side, location, condition, problem, action }) => {
    const reopened = SIDES.flatMap((judge) =>
      reviews[judge].previous
        .filter((judgment) => judgment.key === key && judgment.state === "open")
        .map((judgment) => ({ side: judge, reason: judgment.reason })),
    );
    return reopened.length > 0 ? [{ key, side, location, condition, problem, action, reopened }] : [];
  });
  const reported = SIDES.flatMap((side) =>
    reviews[side].findings
      .filter((finding) => finding.required === true)
      .map(({ location, condition, problem, action }, index) => ({
        key: `${round}-${side}-${index + 1}`,
        side,
        location,
        condition,
        problem,
        action,
        reopened: [],
      })),
  );
  return [...carried, ...reported];
};

const changeDuringReviews = (tree: string | null, after: string | null, launch: Launch, worktree: string): { reason: string; detail: string } | null =>
  after === tree
    ? issueChange(launch, worktree)
    : { reason: "tree-changed", detail: `The working tree was ${tree} before the reviews and ${after} after them.` };

const capturedReviewOf = (worktree: string, stored: Record<string, unknown>, launch: Launch, tree: string | null): string | null | Problem => {
  const config = captureConfigOf(worktree, launch.base);
  if (config === null || "reason" in config) return null;
  if (tree === null) return { reason: "capture-unavailable", detail: `The working tree of ${worktree} has no tree id.` };
  const passed = lastPassedOf(listOf(stored, "captures"));
  const decision = captureDecisionOf(worktree, launch.base, config, tree, passed);
  if (decision === "reused" && passed !== null) return capturedParagraph(config.destination, passed.files, passed.installed !== tree);
  if (decision === "not_required") return notCapturedParagraph(config.destination, launch.base);
  const detail = `The capture setting of the base commit requires a capture of the working tree ${tree} of ${worktree}. Call capture, then review again.`;
  return { reason: "not-captured", detail };
};

const reviewStartOf = (worktree: string, stored: Record<string, unknown>, launch: Launch, tree: string | null): string[] | Problem => {
  const captured = capturedReviewOf(worktree, stored, launch, tree);
  if (typeof captured === "object" && captured !== null) return captured;
  return issueChange(launch, worktree) ?? (captured === null ? [] : [captured]);
};

export const review = async ({ worktree, model, effort }: WorktreeCall): Promise<Result> => {
  const stop = (reason: string, detail: string, extra: Record<string, unknown> = {}) =>
    stopped("review", reason, detail, extra);

  const prepared = preparedAt(worktree);
  if (prepared === null) return stop("not-prepared", notPrepared(worktree));
  const { gate, launchPath, stored, launch } = prepared;
  const implemented = finishedSessionOf(stored);
  if (implemented === null) return stop("not-implemented", notImplemented(worktree, stored));
  const status = gateStatusOf(worktree);
  if (status.status !== 0) return stop("not-done", notDoneOf(status));
  const tree = treeHash(gate.root);
  const capturedParagraphs = reviewStartOf(worktree, stored, launch, tree);
  if (!Array.isArray(capturedParagraphs)) return stop(capturedParagraphs.reason, capturedParagraphs.detail);

  const earlier = listOf(stored, "reviews");
  const round = earlier.length + 1;
  const judged = earlierRequired(earlier) ?? [];
  const keys = judged.length > 0 ? judged.map((entry) => String(entry.key)) : null;
  const reply = keys === null ? null : repairReplyTo(stored, objectOf(earlier[earlier.length - 1])?.round);
  const judging = keys === null ? [] : [earlierParagraph(judged.map(earlierLine).join("\n"))];
  const closing = keys === null ? [] : [JUDGE_EARLIER];

  const common = { model, effort, cwd: worktree, timeoutMs: CHILD_TIMEOUT_MS, tools: REVIEW_TOOLS };
  const selfSchema = keys === null ? REVIEW_SCHEMA : JUDGING_SCHEMA;
  const independentSchema = keys === null ? INDEPENDENT_REVIEW_SCHEMA : INDEPENDENT_JUDGING_SCHEMA;
  const selfPrompt = reviewPrompt(selfOpening(launch.issue, launch.base), capturedParagraphs, [...judging, ...closing], []);
  const independentJudging = [...judging, ...(reply === null ? [] : [replyParagraph(reply)]), ...closing];
  const independentOpened = independentOpening(launch.issue, launch.repository, launch.base);
  const independentPrompt = reviewPrompt(independentOpened, capturedParagraphs, independentJudging, [PUBLISHED_FIELDS]);
  const [self, independent] = await Promise.all([
    runReview({ ...common, schema: selfSchema, prompt: selfPrompt, resume: implemented, fork: true }, keys, null),
    runReview({ ...common, schema: independentSchema, prompt: independentPrompt }, keys, publishedCheck(gate.root, tree)),
  ]);
  const results: Record<Side, Review | string> = { self, independent };
  const readable = Object.fromEntries(Object.entries(results).filter(([, result]) => typeof result !== "string"));
  const failures = Object.entries(results).filter((entry): entry is [Side, string] => typeof entry[1] === "string");
  if (failures.length > 0) {
    const detail = failures.map(([side, why]) => `The ${side} review gave no readable result: ${why}`).join(" ");
    return stop("review-failed", detail, { reviews: readable });
  }
  const reviews = readable as Record<Side, Review>;
  const changedAfter = changeDuringReviews(tree, treeHash(gate.root), launch, worktree);
  if (changedAfter !== null) return stop(changedAfter.reason, changedAfter.detail, { reviews });

  const required = requiredAfter(round, judged, reviews);
  const verdict = verdictOf(required.length > 0);
  const record = {
    round,
    tree,
    issue_digest: launch.issue_digest,
    at: new Date().toISOString(),
    verdict,
    required,
    self: recordOf(reviews.self),
    independent: recordOf(reviews.independent),
  };
  writeLaunch(launchPath, { ...stored, reviews: [...earlier, record] });
  return { action: "review", ok: true, round, tree, verdict, required, reviews };
};

const repairLine = (entry: unknown): string => {
  const { key, side, location, condition, problem, action, reopened } = objectOf(entry) ?? {};
  return JSON.stringify({ key, side, location, condition, problem, action, reopened });
};

export const repair = async (call: WorktreeCall): Promise<Result> => {
  const { worktree } = call;
  const stop = (reason: string, detail: string, extra: Record<string, unknown> = {}) =>
    stopped("repair", reason, detail, extra);

  const prepared = preparedAt(worktree);
  if (prepared === null) return stop("not-prepared", notPrepared(worktree));
  const { gate, launchPath, stored, launch } = prepared;
  const implemented = finishedSessionOf(stored);
  if (implemented === null) return stop("not-implemented", notImplemented(worktree, stored));
  const reviews = stored.reviews;
  if (!Array.isArray(reviews) || reviews.length === 0) {
    return stop("not-reviewed", `launch.json of ${worktree} has no review record.`);
  }
  const last = objectOf(reviews[reviews.length - 1]) ?? {};
  const required = last.required;
  if (!Array.isArray(required)) {
    return stop("not-reviewed", `The last review record of ${worktree} has no required array.`);
  }
  if (required.length === 0) {
    return stop("nothing-to-repair", `The last review of ${worktree} left no required finding.`);
  }
  const before = treeHash(gate.root);
  if (before !== last.tree) {
    return stop("review-stale", `The last review saw the working tree ${String(last.tree)}, and it is ${before} now.`);
  }
  if (last.issue_digest !== launch.issue_digest) {
    return stop("review-stale", `The last review judged a version of Issue #${launch.issue} other than the agreed one.`);
  }
  const changed = issueChange(launch, worktree);
  if (changed !== null) return stop(changed.reason, changed.detail);

  const prompt = repairPrompt(launch.issue, launch.base, required.map(repairLine).join("\n"), DONE_GATE);
  const reply = sessionReplyOf(await resumeImplementing(call, prompt, implemented));
  if (typeof reply === "string") return stop("child-failed", reply);

  const tree = treeHash(gate.root);
  const earlier = listOf(stored, "repairs");
  const record = {
    round: earlier.length + 1,
    review_round: last.round,
    session_id: reply.session_id,
    tree,
    changed: tree !== before,
  };
  writeLaunch(launchPath, { ...stored, repairs: [...earlier, { ...record, reply: typeof reply.result === "string" ? reply.result : "", at: new Date().toISOString() }] });
  const shown = { ...record, ...shownOf(reply) };
  const status = gateStatusOf(worktree);
  if (status.status !== 0) return stop("not-done", notDoneOf(status), shown);
  return { action: "repair", ok: true, ...shown };
};

export const agree = ({ worktree }: WorktreeCall): Result => {
  const stop = (reason: string, detail: string) => stopped("agree", reason, detail);

  const prepared = preparedAt(worktree);
  if (prepared === null) return stop("not-prepared", notPrepared(worktree));
  const { launchPath, stored, launch } = prepared;
  const found = viewIssue(launch.issue, launch.repository, "title,body,state", worktree);
  if (typeof found === "string") return stop("issue-unreadable", found);
  if (typeof found.body !== "string") {
    return stop("issue-unreadable", `gh returned no body string for Issue #${launch.issue} of ${launch.repository}.`);
  }
  if (found.state !== "OPEN") return stop("issue-not-open", `Issue #${launch.issue} is ${found.state}, not OPEN.`);
  const digest = digestOf(found);
  const changed = digest !== launch.issue_digest;
  if (changed) writeLaunch(launchPath, { ...stored, issue_digest: digest });
  return { action: "agree", ok: true, issue: launch.issue, issue_digest: digest, changed, title: found.title, body: found.body };
};

const readDigestOf = (stored: Record<string, unknown>): unknown => {
  const rereads = listOf(stored, "rereads");
  return rereads.length > 0 ? objectOf(rereads[rereads.length - 1])?.issue_digest : objectOf(stored.implement)?.issue_digest;
};

export const reread = async (call: WorktreeCall): Promise<Result> => {
  const { worktree } = call;
  const stop = (reason: string, detail: string, extra: Record<string, unknown> = {}) =>
    stopped("reread", reason, detail, extra);

  const prepared = preparedAt(worktree);
  if (prepared === null) return stop("not-prepared", notPrepared(worktree));
  const { gate, launchPath, stored, launch } = prepared;
  const implemented = finishedSessionOf(stored);
  if (implemented === null) return stop("not-implemented", notImplemented(worktree, stored));
  if (readDigestOf(stored) === launch.issue_digest) {
    return stop("nothing-to-reread", `The implementing session of ${worktree} has already read the agreed version of Issue #${launch.issue}.`);
  }
  const issueChanged = issueChange(launch, worktree);
  if (issueChanged !== null) return stop(issueChanged.reason, issueChanged.detail);

  const before = treeHash(gate.root);
  const prompt = rereadPrompt(launch.issue, launch.repository, launch.base, DONE_GATE);
  const reply = sessionReplyOf(await resumeImplementing(call, prompt, implemented));
  if (typeof reply === "string") return stop("child-failed", reply);

  const status = gateStatusOf(worktree);
  const tree = treeHash(gate.root);
  const earlier = listOf(stored, "rereads");
  const record = {
    round: earlier.length + 1,
    session_id: reply.session_id,
    tree,
    changed: tree !== before,
    issue_digest: launch.issue_digest,
  };
  const shown = { ...record, ...shownOf(reply) };
  if (status.status !== 0) return stop("not-done", notDoneOf(status), shown);
  writeLaunch(launchPath, { ...stored, rereads: [...earlier, { ...record, reply: typeof reply.result === "string" ? reply.result : "", at: new Date().toISOString() }] });
  return { action: "reread", ok: true, ...shown };
};

interface Unrepaired {
  config: CaptureConfig;
  failed: Record<string, unknown>;
}

const unrepairedCaptureOf = (worktree: string, prepared: Prepared): Unrepaired | null => {
  const state = captureStateOf(worktree, prepared);
  return state === null || state.failed === null ? null : { config: state.config, failed: state.failed };
};

const capturePromptOf = ({ issue, repository, base }: Launch, { config, failed }: Unrepaired): string =>
  captureFailedPrompt({
    issue,
    repository,
    base,
    doneGate: DONE_GATE,
    how: typeof failed.exit_code === "number" ? `with exit code ${failed.exit_code}` : "without an exit code",
    logTail: typeof failed.log_tail === "string" ? failed.log_tail : "",
    command: JSON.stringify(config.command),
  });

export const continueWork = async (call: WorktreeCall): Promise<Result> => {
  const { worktree } = call;
  const stop = (reason: string, detail: string, extra: Record<string, unknown> = {}) =>
    stopped("continue", reason, detail, extra);

  const prepared = preparedAt(worktree);
  if (prepared === null) return stop("not-prepared", notPrepared(worktree));
  const { gate, launchPath, stored, launch } = prepared;
  const implemented = finishedSessionOf(stored);
  if (implemented === null) return stop("not-implemented", notImplemented(worktree, stored));
  const gateBefore = gateStatusOf(worktree);
  const unrepaired = gateBefore.status === 0 ? unrepairedCaptureOf(worktree, prepared) : null;
  if (gateBefore.status === 0 && unrepaired === null) {
    return stop("nothing-to-continue", `done_gate.ts status of ${worktree} is already done, so no work is left to finish.`);
  }
  if (gateBefore.status !== 0 && gateBefore.status !== 1) {
    const exit = gateBefore.status ?? gateBefore.signal;
    return stop("gate-unreadable", `done_gate.ts status exited ${exit}, which resuming the implementing session cannot fix: ${outputOf(gateBefore)}`);
  }
  const issueChanged = issueChange(launch, worktree);
  if (issueChanged !== null) return stop(issueChanged.reason, issueChanged.detail);

  const before = treeHash(gate.root);
  const prompt = unrepaired === null ? continuePrompt(launch.issue, launch.repository, launch.base, DONE_GATE) : capturePromptOf(launch, unrepaired);
  const reply = sessionReplyOf(await resumeImplementing(call, prompt, implemented));
  if (typeof reply === "string") return stop("child-failed", reply);

  const status = gateStatusOf(worktree);
  const tree = treeHash(gate.root);
  const earlier = listOf(stored, "continues");
  const record = {
    round: earlier.length + 1,
    session_id: reply.session_id,
    tree,
    changed: tree !== before,
    ...(unrepaired === null ? {} : { capture: unrepaired.failed.n }),
  };
  const done = status.status === 0;
  writeLaunch(launchPath, { ...stored, continues: [...earlier, { ...record, done, reply: typeof reply.result === "string" ? reply.result : "", at: new Date().toISOString() }] });
  const shown = { ...record, ...shownOf(reply) };
  if (!done) return stop("not-done", notDoneOf(status), shown);
  return { action: "continue", ok: true, ...shown };
};

type StepAction = "implement" | "reread" | "review" | "repair" | "continue" | "capture";
type Next = { kind: "call"; action: StepAction } | { kind: "done" } | { kind: "stop"; reason: string; detail: string };

const STEP_ACTIONS: Record<StepAction, (call: WorktreeCall) => Promise<Result>> = {
  implement,
  reread,
  review,
  repair,
  continue: continueWork,
  capture: (call) => capture(call),
};

const STEP_FIELDS: Record<StepAction, readonly string[]> = {
  implement: ["action", "ok", "cost_usd", "duration_ms", "resumed", "reason"],
  reread: ["action", "ok", "round", "changed", "cost_usd", "duration_ms", "reason"],
  review: ["action", "ok", "round", "verdict", "required_keys", "cost_usd", "reason"],
  repair: ["action", "ok", "round", "changed", "cost_usd", "duration_ms", "reason"],
  continue: ["action", "ok", "round", "changed", "cost_usd", "duration_ms", "reason"],
  capture: ["action", "ok", "decision", "n", "reason"],
};

const CAPTURE_STOPS_FIXED_BY_CONTINUE = ["capture-failed", "not-done"];

const advancesAfterStop = (action: StepAction, result: Result): boolean =>
  action === "capture" && CAPTURE_STOPS_FIXED_BY_CONTINUE.includes(String(result.reason));

const amountOf = (value: unknown): number => (typeof value === "number" && Number.isFinite(value) ? value : 0);

export const currentReviewOf = (stored: Record<string, unknown>): (Record<string, unknown> & { required: unknown[] }) | null => {
  const reviews = listOf(stored, "reviews");
  const last = objectOf(reviews[reviews.length - 1]);
  return last !== null && Array.isArray(last.required) ? (last as Record<string, unknown> & { required: unknown[] }) : null;
};

const requiredKeysOf = (record: unknown): unknown[] => {
  const required = objectOf(record)?.required;
  return Array.isArray(required) ? required.map((entry) => objectOf(entry)?.key) : [];
};

const reopenedAgain = (entry: unknown): boolean => {
  const reopened = objectOf(entry)?.reopened;
  return Array.isArray(reopened) && reopened.length > 0;
};

const convergenceStop = (stored: Record<string, unknown>, current: { required: unknown[] }): Next | null => {
  const reviews = stored.reviews as unknown[];
  const before = objectOf(reviews[reviews.length - 2]);
  const unchanged = before !== null && repairAnswering(stored, before.round)?.changed === false;
  if (unchanged && current.required.some(reopenedAgain)) {
    const kept = current.required.filter(reopenedAgain).map((entry) => String(objectOf(entry)?.key));
    const detail = `The repair after review round ${String(before.round)} changed nothing, and the next review kept ${kept.join(", ")} open.`;
    return { kind: "stop", reason: "disagreement", detail };
  }
  if (reviews.length < 3) return null;
  const [first, second, third] = reviews.slice(-3).map(requiredKeysOf);
  const stuck = third.filter((key) => typeof key === "string" && first.includes(key) && second.includes(key));
  if (stuck.length === 0) return null;
  const detail = `${stuck.join(", ")} stayed required in each of the last 3 review rounds.`;
  return { kind: "stop", reason: "not-converging", detail };
};

const reviewOrCapture = (worktree: string, prepared: Prepared): Next => {
  const state = captureStateOf(worktree, prepared);
  if (state === null) return { kind: "call", action: "review" };
  const { failed } = state;
  if (failed === null) return { kind: "call", action: "capture" };
  const continues = listOf(prepared.stored, "continues");
  if (objectOf(continues[continues.length - 1])?.capture === failed.n) {
    const detail = `Capture ${String(failed.n)} failed on the working tree ${String(failed.tree)}, and the implementing session changed nothing after it. Read its log_tail in launch.json. Call capture directly to try again.`;
    return { kind: "stop", reason: "capture-failed", detail };
  }
  return { kind: "call", action: "continue" };
};

const reviewOrContinue = (worktree: string, prepared: Prepared): Next => {
  const { gate, stored } = prepared;
  if (gateStatusOf(worktree).status === 0) return reviewOrCapture(worktree, prepared);
  const continues = listOf(stored, "continues");
  const last = objectOf(continues[continues.length - 1]);
  if (last !== null && last.done === false && last.tree === treeHash(gate.root)) {
    const detail = `continue round ${String(last.round)} ended without passing the check, and the working tree has not changed since. Call continue directly to try again.`;
    return { kind: "stop", reason: "not-done", detail };
  }
  return { kind: "call", action: "continue" };
};

export const nextOf = (worktree: string): Next => {
  const prepared = preparedAt(worktree);
  if (prepared === null) return { kind: "stop", reason: "not-prepared", detail: notPrepared(worktree) };
  const { gate, stored, launch } = prepared;
  if (implementStateOf(stored) !== "finished") return { kind: "call", action: "implement" };
  if (readDigestOf(stored) !== launch.issue_digest) return { kind: "call", action: "reread" };
  const toReview = () => reviewOrContinue(worktree, prepared);
  const current = currentReviewOf(stored);
  if (current === null) return toReview();
  if (repairAnswering(stored, current.round) !== null) return toReview();
  if (treeHash(gate.root) !== current.tree) return toReview();
  if (current.issue_digest !== launch.issue_digest) return toReview();
  if (current.required.length === 0) {
    const changed = issueChange(launch, worktree);
    return changed === null ? { kind: "done" } : { kind: "stop", ...changed };
  }
  return convergenceStop(stored, current) ?? { kind: "call", action: "repair" };
};

const stepOf = (action: StepAction, result: Result): Record<string, unknown> => {
  const reviews = objectOf(result.reviews);
  const fields: Record<string, unknown> =
    action === "review"
      ? {
          ...result,
          required_keys: Array.isArray(result.required) ? requiredKeysOf(result) : undefined,
          cost_usd: reviews === null ? undefined : SIDES.reduce((sum, side) => sum + amountOf(objectOf(reviews[side])?.cost_usd), 0),
        }
      : result;
  return Object.fromEntries(STEP_FIELDS[action].filter((name) => fields[name] !== undefined).map((name) => [name, fields[name]]));
};

const launchFileOf = (worktree: string): string | null => {
  const gate = gateAt(worktree);
  return gate === null ? null : join(gate.dir, LAUNCH_FILE);
};

export const runFields = (worktree: string, steps: Record<string, unknown>[], cost: number): Record<string, unknown> => {
  const stored = preparedAt(worktree)?.stored ?? {};
  const current = currentReviewOf(stored);
  return {
    verdict: current?.verdict ?? null,
    required: current?.required ?? [],
    rounds: listOf(stored, "reviews").length,
    steps,
    cost_usd: cost,
    launch_file: launchFileOf(worktree),
  };
};

const runOutput = (worktree: string, steps: Record<string, unknown>[], cost: number, stop: Next | null): Result => {
  const fields = runFields(worktree, steps, cost);
  return stop?.kind === "stop" ? stopped("run", stop.reason, stop.detail, fields) : { action: "run", ok: true, ...fields };
};

export const runRounds = async ({ worktree, model, effort }: WorktreeCall): Promise<Result> => {
  const childCall = { worktree, model, effort, fresh: false };
  const steps: Record<string, unknown>[] = [];
  let cost = 0;
  let previous: StepAction | null = null;
  for (;;) {
    const next = nextOf(worktree);
    if (next.kind !== "call") return runOutput(worktree, steps, cost, next);
    if (next.action === previous) {
      const detail = `${previous} succeeded without advancing launch.json, and the next step would call ${previous} again.`;
      return runOutput(worktree, steps, cost, { kind: "stop", reason: "no-progress", detail });
    }
    previous = next.action;
    const result = await STEP_ACTIONS[next.action](childCall);
    const step = stepOf(next.action, result);
    steps.push(step);
    cost += amountOf(step.cost_usd);
    process.stderr.write(`${JSON.stringify({ ...step, total_cost_usd: cost })}\n`);
    if (!result.ok && !advancesAfterStop(next.action, result)) {
      return runOutput(worktree, steps, cost, { kind: "stop", reason: String(result.reason), detail: String(result.detail) });
    }
  }
};
