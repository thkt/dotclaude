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

## Naming Conventions

### Casing (RFC 430 / C-CASE)

| Item | Convention |
| ---- | ---------- |
| Crate / Module / Function / Method / Local / Macro | `snake_case` |
| Type / Trait / Enum variant | `UpperCamelCase` |
| Constant / Static | `SCREAMING_SNAKE_CASE` |
| Type parameter | Concise `UpperCamelCase` — single letter (`T`, `E`) unless ambiguous |
| Lifetime | Short lowercase (`'a`, `'src`) |

Acronyms in `UpperCamelCase` count as one word: `Uuid` not `UUID`, `Stdin` not `StdIn`. Crate names drop `-rs`/`-rust` suffix.

### Conversion prefix (C-CONV)

| Prefix | Cost | Semantics |
| ------ | ---- | --------- |
| `as_` | Cheap | Borrowed → borrowed (view) |
| `to_` | Expensive | Borrowed → borrowed / borrowed → owned |
| `into_` | Variable | Owned → owned (consumes) |

### Other conventions

| Rule | Detail |
| ---- | ------ |
| Getter | No `get_` prefix. `self.name()` / `self.name_mut()` |
| Iterator | `iter` / `iter_mut` / `into_iter` |
| Error type | `UpperCamelCase` verb-object-error order: `ParseIntError`, not `IntParseError` |
| Constructor | `new` or `with_<detail>`. Conversion constructor: `from_<other>` |

### Avoid

| AI tends to | Correct |
| ----------- | ------- |
| `get_name()` | `name()` |
| `UserID`, `HTTPClient` | `UserId`, `HttpClient` |
| `fn as_string(&self) -> String` (allocates, but `as_` implies cheap) | `fn to_string(&self) -> String` |
| `fn to_bytes(self) -> Vec<u8>` (consumes, but `to_` implies borrow preserved) | `fn into_bytes(self) -> Vec<u8>` |

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

Centralize setup in helpers that return both the primary handle and any RAII guards (e.g., `TempDir`). Name them by the role, not the crate.

| Helper pattern | Purpose |
| -------------- | ------- |
| `test_db() -> (Db, TempDir)` | Fresh isolated DB in a temp dir |
| `test_<crate>() -> (<MainType>, TempDir)` | Construct the crate's main type with test doubles — no real network / filesystem |
| `setup_test_files(files)` | Write fixture files to a temp dir and return the resulting handle |

### Isolation

| Rule | Detail |
| ---- | ------ |
| Temp dir | Use `tempfile::tempdir()` — bind the `TempDir` to `_dir` so it lives until the test ends |
| Mocks | Use crate-provided mock/failing doubles (e.g., `MockEmbedder`, `FailingEmbedder`) — never call real network / model endpoints in unit tests |

### Assertions

Add a failure message whenever the assertion mismatch alone does not explain the problem.

```rust
assert!(stdout.starts_with(expected_prefix), "expected prefix {expected_prefix:?}, got: {stdout}");
```

### `test-support` feature

Expose test helpers (mocks, fixtures) via `[features] test-support = []` so downstream crates can depend on this crate with `features = ["test-support"]` under their `[dev-dependencies]`. Plain `#[cfg(test)]` hides them from external tests.

## Use Declarations

Use explicit path prefixes to avoid ambiguity and reduce refactoring cost.

| Prefix | Scope |
| ------ | ----- |
| `crate::` | From crate root |
| `super::` | Parent module |
| `self::` | Current module |
| `::crate_name::` | External crate |

Pick one grouping style per crate (`use std::{a, b}` vs separate lines). `rustfmt` enforces alphabetical order.

## Idioms

Prefer idiomatic Rust to reduce line count.

| Situation | Prefer | Over |
| --------- | ------ | ---- |
| Error propagation | `?` | `unwrap()` in production code |
| `Option` fallback | `unwrap_or(default)` / `unwrap_or_else(\|\| ...)` | `match` |
| `Result` fallback | `unwrap_or(default)` / `unwrap_or_else(\|e\| ...)` | `match` |
| Error type conversion | `map_err(\|e\| ...)` | `match Err(e) =>` |
| Discard + transform | `.filter_map()` | `.filter().map()` |
| Boolean short-circuit | `.any()` / `.all()` | explicit loop |
| Single variant check | `if let` / `let else` | `match` |
| Boolean pattern check | `matches!(val, Pat)` | `match` returning bool |
| Single-arg closure | point-free (`f`) | `\|x\| f(x)` |
| `Option<String>` → `Option<&str>` | `opt.as_deref()` | `opt.as_ref().map(\|s\| s.as_str())` |
| HashMap insert-or-modify | `map.entry(k).or_insert_with(...)` | `if !map.contains_key(k) { map.insert(...) }` |
| Pattern + conditional in match | `match v { Some(x) if let Ok(y) = f(x) => ... }` (1.95+) | Nested `match` / `if let` blocks |
| Push + use mutable ref | `let r = v.push_mut(x);` (1.95+) | `v.push(x); v.last_mut().unwrap()` |
| Integer to bool | `bool::try_from(n)?` (1.95+) | `n != 0` (intent unclear) |
| Platform / feature branching | `cfg_select! { unix => ..., _ => ... }` (1.95+) | `cfg-if` crate dependency |

`unwrap()` is acceptable in tests and where the invariant is proven by construction.

Features tagged `(1.95+)` require `rust-version = "1.95"` in `Cargo.toml`. Align MSRV with the newest feature the crate actually uses.

### Derive selection

Minimum set per type. Over-deriving leaks representation and bloats compile time.

| Derive | When |
| ------ | ---- |
| `Debug` | Always — required for `?` error output, test failures, `dbg!` |
| `Clone` | User needs duplication |
| `Copy` | POD ≤ 16 bytes with no semantic cost. Requires `Clone` |
| `Default` | Obvious zero-value exists |
| `PartialEq` / `Eq` | Equality is well-defined |
| `Hash` | Used as map key (must agree with `Eq`) |
| `Serialize` / `Deserialize` | Type crosses the serialization boundary. Never on internal-only types |

Manual impl (not derivable):

| Trait | When |
| ----- | ---- |
| `Display` | User-facing types. Pairs with `thiserror::Error` via `#[error("...")]` |
| `From<T>` / `TryFrom<T>` | Natural conversion from another type — prefer over ad-hoc `new`/`with_*` (C-CONV-TRAITS) |

## Error Handling

### Library vs application

| Context | Crate | Pattern |
| ------- | ----- | ------- |
| Library | `thiserror` | Callers pattern-match on variants |
| Application / CLI entry | `anyhow` | Callers only propagate; use `.context()` for trace |
| Mixed | thiserror in `lib.rs`, anyhow in `main.rs` | Lib exposes typed errors, bin wraps with context |

### thiserror conventions

| Rule | Detail |
| ---- | ------ |
| Attribute | `#[derive(Error, Debug)]` on enum |
| Message | `#[error("... {field} ...")]` |
| Wrap + auto-convert | `#[from]` on the inner error — enables `?`. Implies `#[source]` — do not add both |
| Preserve chain | `#[source]` when not wrapping (additional context fields) |
| Variant granularity | One variant per distinct cause. Do not flatten to `String` |
| Forward compatibility | `#[non_exhaustive]` on `pub` error enums — adding a variant is non-breaking |
| Crate-level alias | `pub type Result<T> = std::result::Result<T, CrateError>;` at crate root. Override with `std::result::Result<T, OtherError>` when the error type differs |

### anyhow conventions

| Rule | Detail |
| ---- | ------ |
| Return type | `anyhow::Result<T>` |
| Layer context | `.context("failed to load config")?` |
| Early exit | `bail!("reason")` |
| Assertion | `ensure!(cond, "msg")` |

### Avoid

| AI tends to | Correct |
| ----------- | ------- |
| `-> Result<T, Box<dyn Error>>` in library public API | Define a `thiserror` enum so callers can match |
| Global `AppError` enum covering every module | Per-module error types, `#[from]` to wrap |
| `.map_err(\|e\| e.to_string())?` | `#[from]` or `.context()` — preserves chain |
| `anyhow!` inside a library | Reserve `anyhow` for application layer |
| `#[from]` combined with `#[source]` on the same field | `#[from]` alone — it already implies `#[source]` |

## Unsafe (2024 Edition)

| Rule | Detail |
| ---- | ------ |
| `unsafe fn` body | Wrap each unsafe operation in `unsafe {}` — `unsafe_op_in_unsafe_fn` is warn-by-default |
| `extern` blocks | `unsafe extern "C" { ... }` — the `unsafe` keyword is required on the block |
| `#[no_mangle]`, `#[export_name]`, `#[link_section]` | Must be `unsafe #[no_mangle]` etc. |
| `static mut` | References to `static mut` are deny-by-default (2024 `static_mut_refs` lint). Replace with `Mutex`, `RwLock`, or atomics |
| `std::env::set_var` / `remove_var` | Now `unsafe` — wrap in `unsafe {}` |

Every `unsafe {}` block carries a `// SAFETY: ...` comment explaining why the invariants hold. Public `unsafe fn` additionally documents the caller's contract in a `# Safety` rustdoc section.

## Ownership & Smart Pointers

### Pointer selection

| Pointer | Ownership | Thread-safe | When |
| ------- | --------- | ----------- | ---- |
| `Box<T>` | Single | N/A | Heap alloc, recursive types, `Box<dyn Trait>` |
| `Rc<T>` | Shared (count) | No | Graph / DAG in single thread |
| `Arc<T>` | Shared (count) | Yes | Cross-thread shared |
| `Cow<'a, B>` | Borrowed or owned | N/A | Mostly-immutable with occasional mutation |

### Interior mutability

| Pattern | Scope |
| ------- | ----- |
| `Rc<RefCell<T>>` | Single-thread shared mutable |
| `Arc<Mutex<T>>` | Multi-thread, critical section has no `.await` |
| `Arc<RwLock<T>>` | Multi-thread, read-heavy |
| `Arc<tokio::sync::Mutex<T>>` | Lock held across `.await` |

### Parameter types

Default to the narrowest type that compiles.

| Want | Parameter |
| ---- | --------- |
| Read only | `&str`, `&[T]`, `&T` |
| Mutate | `&mut T` |
| Consume / store | `String`, `Vec<T>`, `T` |
| Flexible read-only | `impl AsRef<str>` — accepts `&str`, `&String`, `String` |
| Flexible take-ownership | `impl Into<String>` — accepts `&str` (converts), `String` |

### Avoid

| AI tends to | Correct |
| ----------- | ------- |
| `fn f(s: &String)` | `fn f(s: &str)` |
| `fn f(v: &Vec<T>)` | `fn f(v: &[T])` |
| `Arc<Mutex<T>>` with lock across `.await` | `Arc<tokio::sync::Mutex<T>>` |
| `Clone`-everywhere to satisfy borrow checker | Adjust lifetimes or restructure ownership |

## Async / Concurrency

| Scenario | Approach |
| -------- | -------- |
| Parallel async tasks (I/O-bound) | `tokio::spawn` with `move` closures |
| Parallel tasks + shared local variable | Wrap in `Arc<T>` and clone before spawn, or use `async-scoped` for scope-bounded parallelism |
| Blocking I/O inside async context | `tokio::task::spawn_blocking` — moves work to the blocking-thread pool |
| CPU-bound parallelism | `rayon` (data parallelism) or `std::thread::spawn` (ad-hoc) |

`tokio::spawn` requires `'static` — local variables cannot be borrowed across spawn boundaries. For scope-bounded parallelism, use `async-scoped::TokioScope::scope_and_block` (analogous to `std::thread::scope`).

### Patterns

| Pattern | When |
| ------- | ---- |
| `OnceLock<T>` (std, 1.70+) | Lazy one-time init via `get_or_init()` — for function-local deferred construction |
| `LazyLock<T>` (std, 1.80+) | `static` with inline closure init — for globals that were previously `lazy_static!` |
| `const fn` | Compile-time computation of `Duration`, bit masks, etc. |

### Avoid

| AI tends to | Correct |
| ----------- | ------- |
| `lazy_static!` | `LazyLock` (global `static`) or `OnceLock` (function-local) — both std |
| `tokio::spawn` around a blocking call | `tokio::task::spawn_blocking` |
| `std::sync::Mutex` with lock held across `.await` | `tokio::sync::Mutex` |

## Polymorphism

| Choose | When |
| ------ | ---- |
| `enum` | Variants are a closed set known at compile time. Static dispatch is faster in hot loops — measure before optimizing |
| `dyn Trait` | External callers need to add new types, or the type appears in a public crate API |
| `impl Trait` (generics) | Static dispatch with no vtable — avoids overhead but causes monomorphization bloat; profile before choosing |

### Avoid

| AI tends to | Correct |
| ----------- | ------- |
| `-> impl Trait` in public return position | Named type — `impl Trait` return is a breaking change to widen later |
| `Box<dyn Trait>` when the variant set is closed | `enum` — cheaper dispatch, exhaustive `match` |
| `enum` collapsing types that callers should be able to extend | `dyn Trait` if downstream crates must add new variants |

## API Design Patterns

### Newtype

Wrap a primitive in a single-field struct to distinguish semantically different values with identical representation.

```rust
pub struct UserId(pub u64);
pub struct ProductId(pub u64);
```

Zero runtime cost. Prevents cross-type confusion at compile time.

### Type state

Encode state in the type parameter; invalid transitions become compile errors.

| Rule | Detail |
| ---- | ------ |
| State markers | Zero-sized structs (`struct Connected;`) or `PhantomData<State>` |
| Transition | Consume `self`, return new type |
| Operations | Implement methods only on the valid state |

### Builder

Use when the struct has ≥3 optional fields OR validation is required before construction.

| Rule | Detail |
| ---- | ------ |
| Entry | `Foo::builder()` returning `FooBuilder` |
| Setter | `fn with_x(&mut self, x: X) -> &mut Self` (mutable ref, ergonomic) |
| Build | `fn build(self) -> Foo` — or `Result<Foo, _>` if validation can fail |

For 1–2 fields, prefer struct literal or plain `new`.

### Sealed trait

Prevent external crates from implementing a public trait when future method additions must stay non-breaking.

```rust
mod private { pub trait Sealed {} }
pub trait MyTrait: private::Sealed { /* ... */ }
```

### Dependency injection via factory parameter

```rust
pub fn from_env() -> Result<Self> { Self::from_env_with(std::env::var) }
pub fn from_env_with<F>(get: F) -> Result<Self>
where F: Fn(&str) -> Result<String, VarError> { /* ... */ }
```

Public `from_env()` for production, `from_env_with()` for tests with a mock lookup.

### Avoid

| AI tends to | Correct |
| ----------- | ------- |
| `fn f(force: bool, dry_run: bool)` | enum or struct (`Mode::Force` / `{ force, dry_run }`) |
| Runtime flag for state (`is_connected: bool`) | Type state pattern |
| `String` for every identifier | Newtype (`UserId`, `OrderId`) |
| Freely accepting external trait impls on a public trait | Sealed pattern if evolution matters |

## Crate Splitting

Split a module into a separate crate when any of these apply:

| Case | Detail |
| ---- | ------ |
| Compile time | Large, rarely-changed code isolated so incremental builds skip it |
| Shared logic | Code compiled for multiple targets (e.g., native binary + WASM) |
| Proc macro | Procedural macros must be in a separate crate — they compile to a native plugin loaded by `rustc` |
| Unsafe isolation | FFI / `unsafe extern` isolated in a child crate; outer crate can then `#![forbid(unsafe_code)]` |

## Documentation (rustdoc)

### Comment style

| Syntax | Scope |
| ------ | ----- |
| `///` | Item (function, struct, enum, trait, method) |
| `//!` | Module or crate (top of `lib.rs` / `module.rs`) |

### Sections

Plural form even with a single entry.

| Header | When |
| ------ | ---- |
| `# Examples` | Every `pub` item — code blocks auto-compile as doctests |
| `# Errors` | Functions returning `Result` |
| `# Panics` | Functions that may panic — state the precondition |
| `# Safety` | `unsafe fn` / `unsafe trait` — state the caller's contract |

### Conventions

| Rule | Detail |
| ---- | ------ |
| Summary | First line: one sentence, period-terminated |
| Example error handling | Use `?`, never `.unwrap()` |
| Hidden setup | Prefix doctest setup lines with `#` — compiles but hidden |
| Type references | Full name with generics: `Option<T>` |
| Intra-doc links | `` [`Foo`] `` auto-resolves |

### Enforcement

`#![warn(missing_docs)]` on library crate roots only (binary entry points do not require per-item docs).

### Avoid

| AI tends to | Correct |
| ----------- | ------- |
| `.unwrap()` in `# Examples` | `?` with a fallible `fn main() -> Result<(), E>` |
| `# Example` (singular) | `# Examples` (plural, always) |
| `missing_docs` on binaries | Library crates only |

## Logging

Use `tracing` (structured, async-aware) over `log`.

| Level | When |
| ----- | ---- |
| `error!` | Operation failed, user-visible impact |
| `warn!` | Recoverable anomaly (retry, fallback taken) |
| `info!` | Lifecycle events (startup, config loaded) |
| `debug!` | Per-request / per-item trace during development |
| `trace!` | Fine-grained flow (rare) |

| Rule | Detail |
| ---- | ------ |
| Structured fields | `info!(count = items.len(), "indexed batch")` — field then message |
| Spans | `#[tracing::instrument]` on request / task entry points |
| Subscriber | Initialize `tracing_subscriber` once at `main` with `EnvFilter::from_default_env()` |
| No `println!` / `eprintln!` | Except for CLI stdout output that is the program's actual result |

### Avoid

| AI tends to | Correct |
| ----------- | ------- |
| `println!("debug: {x}")` sprinkled in library code | `tracing::debug!(x = ?x)` |
| `info!("loaded {}", count)` | `info!(count, "loaded")` (structured) |
| Initializing `tracing_subscriber` in library code | Only at the application entry point |
