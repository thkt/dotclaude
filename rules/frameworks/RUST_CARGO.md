---
paths:
  - "**/Cargo.toml"
---

# Cargo.toml

## Package metadata

| Field | Library | Binary |
| ----- | ------- | ------ |
| `name` / `version` / `edition` | Required | Required |
| `rust-version` | Recommended (MSRV) — match the newest Rust feature the crate uses | Recommended — same |
| `description` / `license` / `repository` | Recommended (Required when publishing) | Recommended |
| `readme` | Recommended when publishing | Optional |
| `publish = false` | Set when not publishing to crates.io | Set when not publishing |
| `keywords` / `categories` | Publishing to crates.io only (max 5 keywords) | Publishing to crates.io only |

License: prefer `MIT OR Apache-2.0` (Rust-ecosystem default).

## Dependencies

| Rule | Detail |
| ---- | ------ |
| Version | Semver range (`"2"`, not `"=2.0.1"`) unless a pin is required |
| Features | Always explicit: `serde = { version = "1", features = ["derive"] }` |
| Dev-only | `[dev-dependencies]` — not compiled into release |
| Optional + feature gate | `optional = true` on dep + `features = { x = ["dep:pkg"] }` |
| Git dep | Pin with `rev = "<sha>"`, not branch name |

## Features

| Rule | Detail |
| ---- | ------ |
| Naming | `snake_case`, no `with_` prefix (C-FEATURE) |
| Default | Keep `default = [...]` minimal — opt-in over opt-out |
| `test-support` | Conventional feature name for exposing test helpers (mocks, fixtures) to downstream test code |
| Feature unification | Features are additive — never use them for mutually-exclusive behavior |

## `[lints]` canonical set

Enforce in `Cargo.toml` (Rust 1.74+) so `cargo build`, `cargo clippy`, and IDE all see the same config.

```toml
[lints.rust]
unsafe_code = "forbid"        # "allow" only on FFI / extern crates

[lints.clippy]
# Groups
all = { level = "warn", priority = -1 }
pedantic = { level = "warn", priority = -1 }

# Pedantic opt-outs (common false positives)
module_name_repetitions = "allow"
# Note: `missing_errors_doc` / `missing_panics_doc` intentionally left at warn —
# RUST.md requires `# Errors` / `# Panics` sections on public fallible APIs.

# Specific deny (project-wide strictness)
absolute_paths = "deny"
cast_possible_truncation = "deny"
redundant_closure_for_method_calls = "deny"
filter_map_next = "deny"
flat_map_option = "deny"
manual_filter_map = "deny"
manual_find_map = "deny"
wildcard_imports = "deny"
enum_glob_use = "deny"
str_to_string = "deny"
needless_pass_by_value = "deny"
```

### Group policy

| Group | Setting |
| ----- | ------- |
| `correctness` / `suspicious` | deny / warn (default) — never disable as group |
| `complexity` / `perf` / `style` | warn (default) — fix or `#[allow]` with reason |
| `pedantic` | warn as group, cherry-pick `allow` for false positives |
| `nursery` | Never enable as group — cherry-pick stable lints |
| `restriction` | Never enable as group — cherry-pick individual lints |

### CI

`cargo clippy --all-targets --all-features -- -D warnings` — fail the build on any warning.

## Workspace

```toml
[workspace]
members = [".", "crates/<child>"]

[workspace.dependencies]
serde = { version = "1", features = ["derive"] }
thiserror = "2"

[workspace.lints.rust]
unsafe_code = "forbid"

[workspace.lints.clippy]
# ... same canonical set
```

Members inherit with:

```toml
[dependencies]
serde = { workspace = true }

[lints]
workspace = true
```

| Rule | Detail |
| ---- | ------ |
| Shared versions | `[workspace.dependencies]` — pin once, inherit everywhere |
| Shared lints | `[workspace.lints]` — consistent strictness across crates |
| Single lockfile | All members share one `Cargo.lock`; compatible dependency versions unify across the workspace |
| FFI isolation | Child crate holds `unsafe extern`; outer crate keeps `unsafe_code = "forbid"` |

## Supplementary tools

Beyond `rustfmt` / `clippy`, these `cargo` subcommands close common gaps for AI-driven development.

| Tool | Purpose | Usage |
| ---- | ------- | ----- |
| `cargo-nextest` | Faster, parallel test runner with retries and better output | `cargo nextest run` — replaces `cargo test` locally and in CI; accelerates RGRC cycles |
| `cargo-llvm-cov` | Source-based coverage measurement | `cargo llvm-cov --all-features` — enforces the C0 ≥ 90% / C1 ≥ 80% gates from `CODE_THRESHOLDS.md` |
| `cargo-deny` | License / security-advisory / banned-crate checks | `cargo deny check` in CI with a `deny.toml` policy |
| `cargo-machete` | Detect unused `[dependencies]` entries | `cargo machete` — catches deps added during exploration but never wired in |

Install with `cargo install <tool>` or `cargo binstall <tool>` (faster via prebuilt binaries).

## Avoid

| AI tends to | Correct |
| ----------- | ------- |
| `serde = "1"` without feature list | `serde = { version = "1", features = ["derive"] }` |
| `version = "1.0.42"` exact pin for lib dep | Semver range `"1"` unless a pin is required |
| `git = "...", branch = "main"` | Pin with `rev = "<sha>"` for reproducibility |
| `#![warn(clippy::pedantic)]` in source | `[lints.clippy] pedantic = { level = "warn", priority = -1 }` in `Cargo.toml` |
| `cargo test` when `cargo-nextest` is installed | `cargo nextest run` — faster feedback, fail-fast options |
