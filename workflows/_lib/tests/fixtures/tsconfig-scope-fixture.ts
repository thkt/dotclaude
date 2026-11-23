// The fixture tests/tsconfig-scope.test.js's T-254 points at to prove a .ts under
// workflows/_lib/tests/ reaches the type-check set. Committed rather than written per run: the
// sandbox denies writes under workflows/, so creating it at test time fails with EPERM (the same
// reason workflows/tests/fixtures/tsconfig-scope-fixture.ts is committed rather than generated).
export const tsconfigScopeFixture: number = 1;
