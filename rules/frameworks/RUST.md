---
paths:
  - "**/*.rs"
---

# Rust

## Module Structure

| Rule | Detail |
| ---- | ------ |
| File layout | Use `sub.rs` + `sub/child.rs` style. Avoid `sub/mod.rs` |
| Visibility | Minimum required. Prefer `pub(super)` over `pub(crate)` over `pub` |
| impl splitting | One struct can have `impl` blocks across multiple files. Mark split methods `pub(super)` to limit visibility to the declaring module |

### Binary CLI layout

```
src/
├── main.rs           # subcommand dispatch
├── lib.rs            # crate root, wire-up
├── config.rs         # configuration types
├── <domain>.rs       # domain module
├── <domain>/
│   └── tests.rs      # split out when inline grows long
├── storage.rs        # persistence layer
├── storage/
│   ├── <concern>.rs
│   └── tests.rs
└── tools.rs          # external tool wrappers
    └── <tool>.rs
tests/
└── cli_integration.rs
```

## Testing

### File placement

| Pattern | When |
| ------- | ---- |
| `#[cfg(test)] mod tests { use super::*; ... }` | Default — keep tests near the code |
| `#[cfg(test)] mod tests;` → `tests.rs` | When test code grows long enough to obscure the module |
| `tests/cli_integration.rs` | Binary CLI behavior (spawns the real binary) |

### Naming

| Rule | Detail |
| ---- | ------ |
| T-NNN identifier | Prefix each test with `// T-NNN: function_name` immediately before `#[test]` |
| Function name | Self-documenting snake_case |

### Helpers

| Helper | Purpose |
| ------ | ------- |
| `test_db() -> (Db, TempDir)` | Open a fresh in-memory-backed SQLite DB in a temp dir |
| `test_yomu() -> (Yomu, TempDir)` | Construct a `Yomu` instance for testing without a real embedder |
| `setup_test_files(files)` | Write fixtures to a temp dir and return the open DB |

### Isolation

| Rule | Detail |
| ---- | ------ |
| Temp dir | Use `tempfile::tempdir()` — bind the `TempDir` to `_dir` so it lives until the test ends |
| Mocks | Use `rurico::embed::{MockEmbedder, FailingEmbedder}` — never call real model endpoints in unit tests |

### Assertions

Add a failure message whenever the assertion mismatch alone does not explain the problem.

```rust
assert!(stdout.starts_with("yomu "), "expected 'yomu <version>', got: {stdout}");
```


## Use Declarations

Use explicit path prefixes to avoid ambiguity and reduce refactoring cost.

| Prefix | Scope |
| ------ | ----- |
| `crate::` | From crate root |
| `super::` | Parent module |
| `self::` | Current module |
| `::crate_name::` | External crate |

Pick one grouping style (`use std::{a, b}` vs separate lines) per crate and apply it consistently. `rustfmt` enforces alphabetical order automatically.

## Idioms

Prefer idiomatic Rust to reduce line count.

| Situation | Prefer | Over |
| --------- | ------ | ---- |
| Error propagation | `?` | `unwrap()` in production code |
| Optional fallback | `unwrap_or_else(\|e\| ...)` | `match` |
| Error type conversion | `map_err(\|e\| ...)` | `match Err(e) =>` |
| Discard + transform | `.filter_map()` | `.filter().map()` |
| Boolean short-circuit | `.any()` / `.all()` | explicit loop |
| Single variant check | `if let` / `let else` | `match` |
| Boolean pattern check | `matches!(val, Pat)` | `match` returning bool |
| Single-arg closure | point-free (`f`) | `\|x\| f(x)` |

`unwrap()` is acceptable in tests and where the invariant is proven by construction.

## Unsafe (2024 Edition)

| Rule | Detail |
| ---- | ------ |
| `unsafe fn` body | Wrap each unsafe operation in `unsafe {}` — `unsafe_op_in_unsafe_fn` is warn-by-default |
| `extern` blocks | `unsafe extern "C" { ... }` — the `unsafe` keyword is required on the block |
| `#[no_mangle]`, `#[export_name]`, `#[link_section]` | Must be `unsafe #[no_mangle]` etc. |
| `static mut` | References are deny-by-default. Replace with `Mutex`, `RwLock`, or atomics |
| `std::env::set_var` / `remove_var` | Now `unsafe` — wrap in `unsafe {}` |

## Async / Concurrency

| Scenario | Approach |
| -------- | -------- |
| Parallel tasks, no shared state | `tokio::spawn` with `move` closures |
| Parallel tasks + shared local variable | Wrap in `Arc<T>` and clone before spawn, or use `async-scoped` for scope-bounded parallelism |
| CPU-bound work | `rayon` or `std::thread::spawn` — not `tokio::spawn` |
| I/O-bound work | `tokio::spawn` |

`tokio::spawn` requires `'static` — local variables cannot be borrowed across spawn boundaries. For scope-bounded parallelism, use `async-scoped::TokioScope::scope_and_block` (analogous to `std::thread::scope`).

## Polymorphism

| Choose | When |
| ------ | ---- |
| `enum` | Variants are a closed set known at compile time. Roughly 2× faster than `dyn Trait` in dispatch-heavy loops |
| `dyn Trait` | External callers need to add new types, or the type appears in a public crate API |
| `impl Trait` (generics) | Static dispatch with no vtable — avoids overhead but causes monomorphization bloat; profile before choosing |

## Crate Splitting

Split a module into a separate crate when any of these apply:

| Case | Detail |
| ---- | ------ |
| Compile time | Large, rarely-changed code isolated so incremental builds skip it |
| Shared logic | Code compiled for multiple targets (e.g., native binary + WASM) |
| Proc macro | Procedural macros must be in a separate crate — they compile to a native plugin loaded by `rustc` |

Workspace note: all members share a single `Cargo.lock`; compatible dependency versions are unified across the workspace.
