// The fixture tests/tsconfig-scope.test.js's T-254 points at to prove a .ts under
// tests/ reaches the type-check set. Committed rather than written per run: the sandbox denies
// writes under tests/, so creating it at test time fails with EPERM.
export const tsconfigScopeFixture: number = 1;
