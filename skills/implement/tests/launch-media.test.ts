/// <reference types="node" />
import assert from "node:assert/strict";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { treeHash } from "../../../hooks/_lib/gate_record.ts";
import {
  BRANCH,
  CLEAN,
  type CaptureSetting,
  type Fixture,
  PR_URL,
  assertStopped,
  bodyFileOf,
  bodyText,
  captureAt,
  capturing,
  committed,
  expectedBody,
  fakeCapture,
  fakeReviewer,
  git,
  headOf,
  launchRecord,
  matchingPull,
  outputOf,
  passCheck,
  publishable,
  published,
  publicationsOf,
  review,
  rewriteLaunch,
  sha256,
  withPulls,
  worktreeOf,
  writeBody,
} from "./_launch-fixture.ts";

const MP4 = Buffer.concat([Buffer.from([0, 0, 0, 24]), Buffer.from("ftypisom"), Buffer.from("0123")]);

const WRITE_PNG_AND_MP4 = 'cp "$LOGS/shot.png" "$last/list.png"\ncp "$LOGS/clip.mp4" "$last/clip.mp4"\nexit 0\n';

const WRITE_TWO_PNGS = 'cp "$LOGS/shot.png" "$last/list.png"\ncp "$LOGS/shot.png" "$last/more.png"\nexit 0\n';

const ASSET_A = "https://github.com/user-attachments/assets/0123abcd-4567-89ab-cdef-0123456789ab";

const ASSET_B = "https://github.com/user-attachments/assets/fedcba98-7654-3210-fedc-ba9876543210";

const mediaBody = (commit: string, media: string[]): string =>
  `${[
    "Closes #42",
    "## Changes and rationale",
    "code reason",
    "## Requirements coverage",
    "requirements reason",
    "## Verification and unverified items",
    `Target commit: ${commit}`,
    `launch.ts: the target commit holds the tree that the last review round accepted. The local check (${JSON.stringify('[ -z "$LOGS" ] || echo check >> "$LOGS/check-calls"')}) passed. Self review: accepted. Independent review: accepted.`,
    "tests reason",
    "## Documents and sources",
    "documentation reason",
    "## Media",
    ...media.flatMap((path) => [`\`${path}\``, `![${path}](${path})`]),
    "## Remaining work and owners",
    "When this body was written, the draft publication, CI, the body and media checks, the switch to ready, and human approval were not complete.",
    "- Assigned AI: publish this PR as a draft and confirm that CI on the same head (test) registers and succeeds.",
    `- Assigned AI: attach the media of the target commit (${media.join(", ")}) with \`gh pr edit --body-file\` and \`--attach\`, and confirm with \`launch.ts published\` that every media reference in the public body points at an uploaded file.`,
    "- Assigned AI: on the PR page, confirm that each media displays or plays and matches its path (rendered_media_check).",
    "- Assigned AI: compare the latest public body with the Issue, the target commit, the accepted review, and the verification results (published_body_check). After confirming the body, the media, and CI on the same head, recheck, switch to ready, and read it back (mark_ready). Keep the draft while anything is unconfirmed.",
    "- Human: decide any change to requirements or permissions, and decide review, approval, and merge.",
  ].join("\n\n")}\n`;

const imageAttached = (text: string, path: string, asset: string): string => text.replaceAll(`![${path}](${path})`, `![${path}](${asset})`);

const videoAttached = (text: string, path: string, asset: string): string => text.replaceAll(`![${path}](${path})`, asset);

const mismatchDetail = (names: string): string =>
  `The pull request ${PR_URL} differs from what launch.ts confirmed before the push: ${names}. Reconcile it on GitHub, then call again.`;

function capturedAndReviewed(f: Fixture): void {
  const captured = captureAt(f);
  assert.equal(outputOf(captured).ok, true, `${captured.stdout}${captured.stderr}`);
  fakeReviewer(f, CLEAN);
  const reviewed = review(f);
  assert.equal(outputOf(reviewed).verdict, "accepted", `${reviewed.stdout}${reviewed.stderr}`);
}

function commitAll(f: Fixture, message: string): void {
  git(worktreeOf(f), "add", "-A");
  git(worktreeOf(f), "commit", "-q", "-m", message);
}

function withMedia(setting: CaptureSetting = {}, body?: string): Fixture {
  const f = body === undefined ? capturing(setting) : capturing(setting, body);
  writeFileSync(join(f.logs, "clip.mp4"), MP4);
  capturedAndReviewed(f);
  commitAll(f, "reviewed change with media");
  return f;
}

function bodyOut(f: Fixture): Record<string, unknown> {
  const result = writeBody(f);
  assert.equal(result.status, 0, `${result.stdout}${result.stderr}`);
  return outputOf(result);
}

const twoMedia = (): Fixture => withMedia({ destination: "trial/evidence/media/" }, WRITE_PNG_AND_MP4);

const CLIP = "trial/evidence/media/clip.mp4";

const LIST = "trial/evidence/media/list.png";

const bothAttached = (text: string): string => videoAttached(imageAttached(text, LIST, ASSET_A), CLIP, ASSET_B);

test("with one media, body puts the Media section between the documents and the remaining work, changes the three places of the remaining work, and prints the path as media", () => {
  const f = withMedia({ destination: "trial/evidence/media/" });
  const text = bodyText(f);
  assert.equal(text, mediaBody(headOf(f), [LIST]));
  assert.deepEqual(bodyOut(f).media, [LIST]);
});

test("with an image and a video, body lists both in the order git prints them, and the video has the same reference as the image", () => {
  const f = twoMedia();
  assert.equal(bodyText(f), mediaBody(headOf(f), [CLIP, LIST]));
  assert.deepEqual(bodyOut(f).media, [CLIP, LIST]);
});

test("without a capture, and with a commit that adds or changes no media, body is the body without media and media is empty", () => {
  const none = committed();
  assert.equal(bodyText(none), expectedBody({ commit: headOf(none) }));
  assert.deepEqual(bodyOut(none).media, []);

  const f = capturing({ required: false });
  writeFileSync(join(worktreeOf(f), "notes.md"), "notes\n");
  passCheck(f);
  fakeReviewer(f, CLEAN);
  assert.equal(outputOf(review(f)).verdict, "accepted");
  commitAll(f, "notes only");
  const check = JSON.stringify('[ -z "$LOGS" ] || echo check >> "$LOGS/check-calls"');
  assert.equal(bodyText(f), expectedBody({ commit: headOf(f), check }));
  assert.deepEqual(bodyOut(f).media, []);
});

test("a file under the destination without a media extension and a media deleted from the base are not listed", () => {
  const f = capturing();
  const media = join(worktreeOf(f), "media");
  const captured = captureAt(f);
  assert.equal(outputOf(captured).ok, true, captured.stdout);
  writeFileSync(join(media, "notes.txt"), "notes\n");
  passCheck(f);
  rewriteLaunch(f, (stored) => {
    const captures = [...(stored.captures as Record<string, unknown>[])];
    captures[captures.length - 1] = { ...captures[captures.length - 1], installed: treeHash(worktreeOf(f)) };
    return { ...stored, captures };
  });
  fakeReviewer(f, CLEAN);
  assert.equal(outputOf(review(f)).verdict, "accepted");
  commitAll(f, "media and notes");
  assert.deepEqual(bodyOut(f).media, ["media/list.png"]);
});

test("a media that the base has and the change deletes is not listed", () => {
  const f = capturing();
  mkdirSync(join(worktreeOf(f), "media"));
  writeFileSync(join(worktreeOf(f), "media", "old.png"), "old\n");
  commitAll(f, "base media");
  rewriteLaunch(f, (stored) => ({ ...stored, base: headOf(f) }));
  passCheck(f);
  capturedAndReviewed(f);
  commitAll(f, "replaced media");
  assert.ok(!existsSync(join(worktreeOf(f), "media", "old.png")));
  assert.deepEqual(bodyOut(f).media, ["media/list.png"]);
});

function publishedWithMedia(setting: CaptureSetting): Fixture {
  const f = withMedia(setting);
  const attached = imageAttached(bodyText(f), "media/list.png", ASSET_A);
  withPulls(f, [matchingPull(f, { body: attached })]);
  const result = published(f);
  assert.equal(result.status, 0, `${result.stdout}${result.stderr}`);
  return f;
}

test("on a stacked commit, body lists every media added from the base to HEAD in the order git prints them", () => {
  const f = publishedWithMedia({});
  writeFileSync(join(worktreeOf(f), "README.md"), "changed after publishing\n");
  passCheck(f);
  fakeCapture(f, WRITE_TWO_PNGS);
  capturedAndReviewed(f);
  commitAll(f, "stacked change");
  const out = bodyOut(f);
  assert.deepEqual(out.media, ["media/list.png", "media/more.png"]);
});

test("with a media path that has a space, body and published stop with media-path-unsupported, and body writes no file", () => {
  const f = withMedia({}, 'cp "$LOGS/shot.png" "$last/my shot.png"\nexit 0\n');
  const detail = 'The media path "media/my shot.png" has a character that launch.ts does not write into a pull request body.';
  assert.equal(assertStopped(writeBody(f), "media-path-unsupported").detail, detail);
  assert.ok(!existsSync(bodyFileOf(f)));
  withPulls(f, [matchingPull(f, { body: "anything\n" })]);
  assert.equal(assertStopped(published(f), "media-path-unsupported").detail, detail);
});

test("published succeeds when the body has the image and the video attached, and records the SHA-256 of the pull request body on stdout and in launch.json", () => {
  const f = twoMedia();
  const built = bodyText(f);
  const body = bothAttached(built);
  withPulls(f, [matchingPull(f, { body })]);
  const result = published(f);
  assert.equal(result.status, 0, `${result.stdout}${result.stderr}`);
  assert.equal(outputOf(result).body_digest, sha256(body));
  assert.notEqual(sha256(body), sha256(built));
  assert.equal(publicationsOf(f)[0].body_digest, sha256(body));
});

test("published stops with media-unattached naming the media still relative and every media, and adds no publication", () => {
  const f = twoMedia();
  const built = bodyText(f);
  const bodyFile = bodyFileOf(f);
  const detailOf = (paths: string) =>
    `The body of ${PR_URL} still holds the relative reference of ${paths}. In ${worktreeOf(f)}, run gh pr edit 9 --body-file ${bodyFile} with one --attach for every media of the body (${CLIP}, ${LIST}), then call published again.`;
  const cases: [string, string, string][] = [
    ["none attached", built, `${CLIP}, ${LIST}`],
    ["only the image attached", imageAttached(built, LIST, ASSET_A), CLIP],
  ];
  for (const [label, body, paths] of cases) {
    withPulls(f, [matchingPull(f, { body })]);
    assert.equal(assertStopped(published(f), "media-unattached").detail, detailOf(paths), label);
    assert.equal(launchRecord(worktreeOf(f)).publications, undefined, label);
  }
});

test("published stops with pr-mismatch naming body for an upper-case asset id, an image attached in the video form, one more character, and a null body", () => {
  const f = twoMedia();
  const built = bodyText(f);
  const upper = `${ASSET_A.slice(0, -2)}AB`;
  const bodies: [string, unknown][] = [
    ["upper-case asset id", videoAttached(imageAttached(built, LIST, upper), CLIP, ASSET_B)],
    ["image in the video form", videoAttached(videoAttached(built, LIST, ASSET_A), CLIP, ASSET_B)],
    ["one more character", `${bothAttached(built)}x`],
    ["null", null],
  ];
  for (const [label, body] of bodies) {
    withPulls(f, [matchingPull(f, { body })]);
    assert.equal(assertStopped(published(f), "pr-mismatch").detail, mismatchDetail("body"), label);
  }
});

test("published names body last after the other differing fields", () => {
  const f = twoMedia();
  const body = `${bothAttached(bodyText(f))}x`;
  withPulls(f, [matchingPull(f, { draft: false, body })]);
  assert.equal(assertStopped(published(f), "pr-mismatch").detail, mismatchDetail("draft, body"));
});

test("publishable on a stacked commit compares the pull request body with the digest of the body after attaching", () => {
  const f = publishedWithMedia({ required: false });
  const [publication] = publicationsOf(f);
  const first = String(publication.commit);
  const attached = imageAttached(bodyText(f), "media/list.png", ASSET_A);
  assert.equal(publication.body_digest, sha256(attached));
  writeFileSync(join(worktreeOf(f), "notes.md"), "notes\n");
  passCheck(f);
  fakeReviewer(f, CLEAN);
  assert.equal(outputOf(review(f)).verdict, "accepted");
  commitAll(f, "notes after publishing");
  const pullAt = (body: string) => matchingPull(f, { head: { ref: BRANCH, sha: first, repo: { full_name: "owner/repo" } }, body });
  withPulls(f, [pullAt(attached)]);
  const result = publishable(f);
  assert.equal(result.status, 0, `${result.stdout}${result.stderr}`);
  withPulls(f, [pullAt(`${attached}x`)]);
  assertStopped(publishable(f), "body-changed");
});
