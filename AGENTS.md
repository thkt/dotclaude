## Checks after a change

After changing code or tests, run `bun run check:feedback` before finishing the work. When it fails, read the diagnostics, fix the cause, and run it again until it passes. For an assurance test, or for a change whose reach you cannot judge, also run `bun run check`. Do not report a passing `check:feedback` as a passing full check.
