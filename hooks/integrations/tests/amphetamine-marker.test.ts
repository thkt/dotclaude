/// <reference types="node" />
// Ports 3 of hooks/integrations/tests/amphetamine_agent_session_test.py's mtime-facing
// observations to amphetamine_agent_session.ts's side (unit U-003): the Python suite never
// asserts on _fresh/_any_fresh/_sweep directly, reading them only through acquire/release/
// background and a backdated marker (e.g. test_stale_marker_is_swept,
// test_release_closes_when_the_bg_marker_went_stale) -- that dispatch is a later unit's scope
// here (see amphetamine_agent_session.ts's file header), so these three scenarios call the
// exported primitives straight, the way hooks/_lib/tests/scribe-trigger.test.ts calls
// scribe_trigger.ts's find/shouldPrompt straight rather than through a hook subprocess.
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { anyFresh, fresh, removeMarker, STALE_MINUTES, sweep, touchMarker } from "../amphetamine_agent_session.ts";

// The window release reads a bg marker against (amphetamine_agent_session.py's
// BG_FRESH_MINUTES), independent of STALE_MINUTES: a marker can be well inside the sweep's
// 8-hour cutoff and still read as stale to the 15-minute bg check.
const BG_FRESH_MINUTES = 15;

function fixtureDir(): string {
  return mkdtempSync(join(tmpdir(), "amphetamine-marker-tests-"));
}

/** Moves path's mtime `minutes` into the past. Mirrors the retired Python suite's own backdate
 * helper (hooks/integrations/tests/amphetamine_agent_session_test.py). */
function backdate(path: string, minutes: number): void {
  const stamp = Date.now() / 1000 - minutes * 60;
  utimesSync(path, stamp, stamp);
}

test("T-393 touching an existing marker moves its mtime forward, so a background marker keeps reading fresh", () => {
  const dir = fixtureDir();
  const bgMarker = join(dir, "bg-session-a");

  touchMarker(bgMarker);
  backdate(bgMarker, BG_FRESH_MINUTES + 5);
  assert.equal(
    fresh(bgMarker, BG_FRESH_MINUTES),
    false,
    "a bg marker backdated past BG_FRESH_MINUTES must read stale before it is touched again",
  );

  // The background hook re-touches the same marker on its next fresh call, the way release's
  // _any_fresh(state_dir, "bg-", BG_FRESH_MINUTES) check depends on it still reading fresh.
  touchMarker(bgMarker);

  assert.equal(
    fresh(bgMarker, BG_FRESH_MINUTES),
    true,
    "touching the marker again must move its mtime forward so it reads fresh again",
  );
});

test("T-394 a marker older than the freshness window reads stale and one inside it reads fresh", () => {
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

test("T-395 removing a marker another process already removed does not throw", () => {
  const dir = fixtureDir();
  const marker = join(dir, "session-a");

  assert.equal(existsSync(marker), false, "the fixture must start with no marker on disk");
  assert.doesNotThrow(
    () => removeMarker(marker),
    "removeMarker must mirror Path.unlink(missing_ok=True) and stay silent for a marker another process already removed",
  );
});
