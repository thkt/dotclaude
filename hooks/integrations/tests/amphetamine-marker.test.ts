/// <reference types="node" />
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { anyFresh, fresh, removeMarker, STALE_MINUTES, sweep, touchMarker } from "../amphetamine_state.ts";

const BG_FRESH_MINUTES = 15;

function fixtureDir(): string {
  return mkdtempSync(join(tmpdir(), "amphetamine-marker-tests-"));
}

function backdate(path: string, minutes: number): void {
  const stamp = Date.now() / 1000 - minutes * 60;
  utimesSync(path, stamp, stamp);
}

test("touching an existing marker moves its mtime forward, so a background marker keeps reading fresh", () => {
  const dir = fixtureDir();
  const bgMarker = join(dir, "bg-session-a");

  touchMarker(bgMarker);
  backdate(bgMarker, BG_FRESH_MINUTES + 5);
  assert.equal(
    fresh(bgMarker, BG_FRESH_MINUTES),
    false,
    "a bg marker backdated past BG_FRESH_MINUTES must read stale before it is touched again",
  );

  touchMarker(bgMarker);

  assert.equal(
    fresh(bgMarker, BG_FRESH_MINUTES),
    true,
    "touching the marker again must move its mtime forward so it reads fresh again",
  );
});

test("a marker older than the freshness window reads stale and one inside it reads fresh", () => {
  const dir = fixtureDir();
  const staleMarker = join(dir, "session-a");
  const freshMarker = join(dir, "session-b");

  writeFileSync(staleMarker, "");
  writeFileSync(freshMarker, "");
  backdate(staleMarker, STALE_MINUTES + 60);
  backdate(freshMarker, 60);

  assert.equal(
    fresh(staleMarker, STALE_MINUTES),
    false,
    "a marker older than STALE_MINUTES must read stale",
  );
  assert.equal(
    fresh(freshMarker, STALE_MINUTES),
    true,
    "a marker inside STALE_MINUTES must read fresh",
  );
  assert.equal(
    anyFresh(dir, "session-", STALE_MINUTES),
    true,
    "anyFresh must see the fresh marker even alongside a stale one carrying the same prefix",
  );

  sweep(dir);
  assert.equal(existsSync(staleMarker), false, "sweep must drop the marker past STALE_MINUTES");
  assert.equal(existsSync(freshMarker), true, "sweep must keep the marker inside STALE_MINUTES");
});

test("removing a marker another process already removed does not throw", () => {
  const dir = fixtureDir();
  const marker = join(dir, "session-a");

  assert.equal(existsSync(marker), false, "the fixture must start with no marker on disk");
  assert.doesNotThrow(
    () => removeMarker(marker),
    "removeMarker must mirror Path.unlink(missing_ok=True) and stay silent for a marker another process already removed",
  );
});
