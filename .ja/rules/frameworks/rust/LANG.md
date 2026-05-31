---
paths:
  - "**/*.rs"
---

# Rust

## モジュール構造

| ルール       | 詳細                                                                                                                   |
| ------------ | ---------------------------------------------------------------------------------------------------------------------- |
| ファイル配置 | `sub.rs` + `sub/child.rs` スタイルを使う。`sub/mod.rs` は避ける                                                        |
| 可視性       | 必要最小。`pub(super)` > `pub(crate)` > `pub` の順で選ぶ                                                               |
| impl 分割    | 1 つの struct は複数ファイルに `impl` ブロックを持てる。分割メソッドは `pub(super)` で宣言モジュールに可視性を限定する |

### バイナリ CLI 配置

```
src/
├── main.rs           # サブコマンド ディスパッチ
├── lib.rs            # crate root, wire-up
├── config.rs         # 設定型
├── <domain>.rs       # ドメイン モジュール
├── <domain>/
│   └── tests.rs      # インライン テストが長くなったら分離
├── storage.rs        # 永続化レイヤー
├── storage/
│   ├── <concern>.rs
│   └── tests.rs
└── tools.rs          # 外部ツールラッパー
    └── <tool>.rs
tests/
└── cli_integration.rs
```

## 命名規約

### ケーシング (RFC 430 / C-CASE)

| 項目                                               | 規約                                                       |
| -------------------------------------------------- | ---------------------------------------------------------- |
| Crate / Module / Function / Method / Local / Macro | `snake_case`                                               |
| Type / Trait / Enum variant                        | `UpperCamelCase`                                           |
| Constant / Static                                  | `SCREAMING_SNAKE_CASE`                                     |
| 型パラメータ                                       | 簡潔な `UpperCamelCase`。曖昧でなければ単一文字 (`T`, `E`) |
| Lifetime                                           | 短い小文字 (`'a`, `'src`)                                  |

`UpperCamelCase` 内の頭字語は 1 単語扱い: `Uuid` (not `UUID`)、`Stdin` (not `StdIn`)。Crate 名は `-rs`/`-rust` 接尾辞を付けない。

### 変換接頭辞 (C-CONV)

| 接頭辞  | コスト   | セマンティクス              |
| ------- | -------- | --------------------------- |
| `as_`   | 低コスト | 借用 → 借用 (ビュー)       |
| `to_`   | 高コスト | 借用 → 借用 / 借用 → 所有 |
| `into_` | 可変     | 所有 → 所有 (消費する)     |

### その他の規約

| ルール      | 詳細                                                                           |
| ----------- | ------------------------------------------------------------------------------ |
| Getter      | `get_` 接頭辞は使わない。`self.name()` / `self.name_mut()`                     |
| Iterator    | `iter` / `iter_mut` / `into_iter`                                              |
| エラー型    | `UpperCamelCase` で動詞-対象-Error の順: `ParseIntError` (not `IntParseError`) |
| Constructor | `new` または `with_<detail>`。変換コンストラクタ: `from_<other>`               |

### 避ける

| AI が陥りがち                                                        | 正しくは                         |
| -------------------------------------------------------------------- | -------------------------------- |
| `get_name()`                                                         | `name()`                         |
| `UserID`, `HTTPClient`                                               | `UserId`, `HttpClient`           |
| `fn as_string(&self) -> String` (確保するのに `as_` は cheap を示唆) | `fn to_string(&self) -> String`  |
| `fn to_bytes(self) -> Vec<u8>` (消費するのに `to_` は借用保持を示唆) | `fn into_bytes(self) -> Vec<u8>` |

## テスト

### ファイル配置

| パターン                                       | 適用条件                                              |
| ---------------------------------------------- | ----------------------------------------------------- |
| `#[cfg(test)] mod tests { use super::*; ... }` | デフォルト。テストをコードの近くに保つ                |
| `#[cfg(test)] mod tests;` → `tests.rs`         | テスト コードがモジュールを覆い隠すほど長くなった場合 |
| `tests/cli_integration.rs`                     | バイナリ CLI 挙動 (実バイナリを起動)                  |

### 命名

| ルール       | 詳細                                                           |
| ------------ | -------------------------------------------------------------- |
| T-NNN 識別子 | 各テストの `#[test]` 直前に `// T-NNN: function_name` を付ける |
| 関数名       | self-documenting な snake_case                                 |

### ヘルパー

セットアップは、主ハンドルと RAII ガード (例: `TempDir`) の両方を返すヘルパーに集約する。crate ではなく役割で命名する。

| ヘルパー パターン                         | 用途                                                                             |
| ----------------------------------------- | -------------------------------------------------------------------------------- |
| `test_db() -> (Db, TempDir)`              | temp dir 内に新規分離 DB                                                         |
| `test_<crate>() -> (<MainType>, TempDir)` | crate のメイン型をテスト ダブルで構築。実ネットワーク/ファイルシステムを使わない |
| `setup_test_files(files)`                 | フィクスチャ ファイルを temp dir に書き、結果のハンドルを返す                    |

### 分離

| ルール   | 詳細                                                                                                                                             |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Temp dir | `tempfile::tempdir()` を使う。`TempDir` を `_dir` にバインドし、テスト終了まで生存させる                                                         |
| Mocks    | crate 提供の mock/failing ダブル (例: `MockEmbedder`, `FailingEmbedder`) を使う。ユニット テストで実ネットワーク/モデル エンドポイントを呼ばない |

### アサーション

アサーション不一致だけでは原因が説明できないときは失敗メッセージを追加する。

```rust
assert!(stdout.starts_with(expected_prefix), "expected prefix {expected_prefix:?}, got: {stdout}");
```

### `test-support` feature

`[features] test-support = []` を介してテストヘルパー (mock, fixture) を露出させ、下流 crate が `[dev-dependencies]` で `features = ["test-support"]` を使えるようにする。`#[cfg(test)]` だけでは外部テストから隠れる。

## use 宣言

曖昧さを避け、リファクタ コストを下げるため、明示的なパス接頭辞を使う。crate ごとに 1 つのグルーピング スタイル (`use std::{a, b}` vs 別行) を選ぶ。`rustfmt` がアルファベット順を強制する。

| 接頭辞           | スコープ        |
| ---------------- | --------------- |
| `crate::`        | crate root から |
| `super::`        | 親モジュール    |
| `self::`         | 現モジュール    |
| `::crate_name::` | 外部 crate      |

## イディオム

行数を減らすために idiomatic な Rust を選ぶ。`unwrap()` はテスト内、または不変条件が構築上保証されている場合は許容。`(1.95+)` タグの機能は `Cargo.toml` で `rust-version = "1.95"` を要求する。MSRV は実際に使う最新機能に合わせる。

| 状況                              | 推奨                                                     | 避ける                                        |
| --------------------------------- | -------------------------------------------------------- | --------------------------------------------- |
| エラー伝播                        | `?`                                                      | 本番コードでの `unwrap()`                     |
| `Option` フォールバック           | `unwrap_or(default)` / `unwrap_or_else(\|\| ...)`        | `match`                                       |
| `Result` フォールバック           | `unwrap_or(default)` / `unwrap_or_else(\|e\| ...)`       | `match`                                       |
| エラー型変換                      | `map_err(\|e\| ...)`                                     | `match Err(e) =>`                             |
| 破棄 + 変換                       | `.filter_map()`                                          | `.filter().map()`                             |
| Boolean 短絡                      | `.any()` / `.all()`                                      | 明示ループ                                    |
| 単一 variant チェック             | `if let` / `let else`                                    | `match`                                       |
| Boolean パターン チェック         | `matches!(val, Pat)`                                     | bool を返す `match`                           |
| 単一引数クロージャ                | point-free (`f`)                                         | `\|x\| f(x)`                                  |
| `Option<String>` → `Option<&str>` | `opt.as_deref()`                                         | `opt.as_ref().map(\|s\| s.as_str())`          |
| HashMap insert-or-modify          | `map.entry(k).or_insert_with(...)`                       | `if !map.contains_key(k) { map.insert(...) }` |
| match 内のパターン + 条件         | `match v { Some(x) if let Ok(y) = f(x) => ... }` (1.95+) | ネストした `match` / `if let`                 |
| Push + 可変参照を使う             | `let r = v.push_mut(x);` (1.95+)                         | `v.push(x); v.last_mut().unwrap()`            |
| Integer → bool                    | `bool::try_from(n)?` (1.95+)                             | `n != 0` (意図不明)                           |
| プラットフォーム / feature 分岐   | `cfg_select! { unix => ..., _ => ... }` (1.95+)          | `cfg-if` crate 依存                           |

### derive 選択

型ごとに最小セット。Over-deriving は表現を漏らし、コンパイル時間を膨らませる。

| Derive                      | 適用条件                                                     |
| --------------------------- | ------------------------------------------------------------ |
| `Debug`                     | 常時。`?` のエラー出力、テスト失敗、`dbg!` に必須            |
| `Clone`                     | ユーザーが複製を必要とする                                   |
| `Copy`                      | 16 バイト以下の POD で意味的コストなし。`Clone` を要求       |
| `Default`                   | 自明なゼロ値が存在する                                       |
| `PartialEq` / `Eq`          | 等価性が well-defined                                        |
| `Hash`                      | map のキーとして使う (`Eq` と整合)                           |
| `Serialize` / `Deserialize` | 型がシリアライゼーション境界を越える。内部専用型には付けない |

### 手動 impl (derivable でない)

| Trait                    | 適用条件                                                                   |
| ------------------------ | -------------------------------------------------------------------------- |
| `Display`                | ユーザー向けの型。`thiserror::Error` と `#[error("...")]` で組み合わせる   |
| `From<T>` / `TryFrom<T>` | 別型からの自然な変換。アドホックな `new`/`with_*` より優先 (C-CONV-TRAITS) |

## エラーハンドリング

### ライブラリ vs アプリケーション

| コンテキスト      | crate                                      | パターン                                          |
| ----------------- | ------------------------------------------ | ------------------------------------------------- |
| Library           | `thiserror`                                | 呼び出し元が variant でパターンマッチ             |
| Application / CLI | `anyhow`                                   | 呼び出し元は伝播のみ。`.context()` でトレース     |
| Mixed             | `lib.rs` で thiserror、`main.rs` で anyhow | lib は型付きエラーを露出、bin が context でラップ |

### thiserror 規約

| ルール             | 詳細                                                                                                                                           |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| 属性               | enum に `#[derive(Error, Debug)]`                                                                                                              |
| メッセージ         | `#[error("... {field} ...")]`                                                                                                                  |
| ラップ + 自動変換  | 内部エラーに `#[from]`。`?` を有効化。`#[source]` を含意するため両方を付けない                                                                 |
| チェーン保持       | ラップしないとき (追加コンテキスト フィールド) に `#[source]`                                                                                  |
| Variant 粒度       | 原因ごとに 1 variant。`String` に平坦化しない                                                                                                  |
| 前方互換性         | `pub` エラー enum に `#[non_exhaustive]`。variant 追加が non-breaking になる                                                                   |
| crate レベル alias | crate root に `pub type Result<T> = std::result::Result<T, CrateError>;`。エラー型が異なるときは `std::result::Result<T, OtherError>` で上書き |

### anyhow 規約

| ルール        | 詳細                                 |
| ------------- | ------------------------------------ |
| 戻り型        | `anyhow::Result<T>`                  |
| Layer context | `.context("failed to load config")?` |
| Early exit    | `bail!("reason")`                    |
| Assertion     | `ensure!(cond, "msg")`               |

### 避ける

| AI が陥りがち                                        | 正しくは                                             |
| ---------------------------------------------------- | ---------------------------------------------------- |
| ライブラリ公開 API で `-> Result<T, Box<dyn Error>>` | 呼び出し元がマッチできるよう `thiserror` enum を定義 |
| 全モジュール網羅のグローバル `AppError` enum         | モジュールごとのエラー型、`#[from]` でラップ         |
| `.map_err(\|e\| e.to_string())?`                     | `#[from]` または `.context()`。チェーンを保持        |
| ライブラリ内の `anyhow!`                             | `anyhow` はアプリケーション層に限る                  |
| 同一フィールドの `#[from]` と `#[source]` の併用     | `#[from]` のみ。`#[source]` は含意される             |

## Unsafe (2024 Edition)

すべての `unsafe {}` ブロックには不変条件が成り立つ理由を述べる `// SAFETY: ...` コメントを付ける。`pub unsafe fn` はさらに `# Safety` の rustdoc セクションで呼び出し元の契約を文書化する。

| ルール                                              | 詳細                                                                                                    |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `unsafe fn` 本体                                    | 各 unsafe 操作を `unsafe {}` でラップ。`unsafe_op_in_unsafe_fn` はデフォルト warn                       |
| `extern` ブロック                                   | `unsafe extern "C" { ... }`。ブロックに `unsafe` キーワードが必要                                       |
| `#[no_mangle]`, `#[export_name]`, `#[link_section]` | `unsafe #[no_mangle]` 等にする                                                                          |
| `static mut`                                        | `static mut` への参照はデフォルト deny (2024 `static_mut_refs` lint)。`Mutex`, `RwLock`, atomics で置換 |
| `std::env::set_var` / `remove_var`                  | 現在 `unsafe`。`unsafe {}` でラップ                                                                     |

## 所有権 & スマートポインタ

### ポインタ選択

| ポインタ     | 所有権       | スレッド安全 | 適用条件                             |
| ------------ | ------------ | ------------ | ------------------------------------ |
| `Box<T>`     | 単一         | N/A          | ヒープ確保、再帰型、`Box<dyn Trait>` |
| `Rc<T>`      | 共有 (count) | No           | 単一スレッドの graph / DAG           |
| `Arc<T>`     | 共有 (count) | Yes          | スレッド横断共有                     |
| `Cow<'a, B>` | 借用 or 所有 | N/A          | ほぼ不変、たまに変更                 |

### 内部可変性

| パターン                     | スコープ                                          |
| ---------------------------- | ------------------------------------------------- |
| `Rc<RefCell<T>>`             | 単一スレッド共有可変                              |
| `Arc<Mutex<T>>`              | 複数スレッド、`.await` を含まないクリティカル区間 |
| `Arc<RwLock<T>>`             | 複数スレッド、読み取り多め                        |
| `Arc<tokio::sync::Mutex<T>>` | `.await` 越しにロックを保持                       |

### パラメータ型

コンパイルが通る最も狭い型をデフォルトにする。

| 必要           | パラメータ                                              |
| -------------- | ------------------------------------------------------- |
| 読み取りのみ   | `&str`, `&[T]`, `&T`                                    |
| 変更           | `&mut T`                                                |
| 消費 / 保存    | `String`, `Vec<T>`, `T`                                 |
| 柔軟な読み取り | `impl AsRef<str>`。`&str`, `&String`, `String` を受ける |
| 柔軟な所有取得 | `impl Into<String>`。`&str` (変換)、`String` を受ける   |

### 避ける

| AI が陥りがち                            | 正しくは                               |
| ---------------------------------------- | -------------------------------------- |
| `fn f(s: &String)`                       | `fn f(s: &str)`                        |
| `fn f(v: &Vec<T>)`                       | `fn f(v: &[T])`                        |
| `Arc<Mutex<T>>` で `.await` 越しにロック | `Arc<tokio::sync::Mutex<T>>`           |
| 借用チェッカー回避のために `Clone` 連発  | ライフタイムの調整または所有権の再構成 |

## Async / 並行

`tokio::spawn` は `'static` を要求する。spawn 境界をまたいで局所変数を借用できない。スコープ限定の並列性には `async-scoped::TokioScope::scope_and_block` (`std::thread::scope` の async 版) を使う。

| シナリオ                               | アプローチ                                                                      |
| -------------------------------------- | ------------------------------------------------------------------------------- |
| 並列 async タスク (I/O バウンド)       | `move` クロージャの `tokio::spawn`                                              |
| 並列タスク + 共有局所変数              | `Arc<T>` でラップして spawn 前に clone、またはスコープ限定並列に `async-scoped` |
| async コンテキスト内のブロッキング I/O | `tokio::task::spawn_blocking`。ブロッキング スレッド プールに移す               |
| CPU バウンド並列                       | `rayon` (data parallelism) または `std::thread::spawn` (アドホック)             |

### パターン

| パターン                   | 適用条件                                                                         |
| -------------------------- | -------------------------------------------------------------------------------- |
| `OnceLock<T>` (std, 1.70+) | `get_or_init()` での 1 回限り遅延初期化。関数局所の遅延構築                      |
| `LazyLock<T>` (std, 1.80+) | インライン クロージャ初期化付きの `static`。以前 `lazy_static!` だったグローバル |
| `const fn`                 | `Duration`, ビットマスク等のコンパイル時計算                                     |

### 避ける

| AI が陥りがち                                | 正しくは                                                                |
| -------------------------------------------- | ----------------------------------------------------------------------- |
| `lazy_static!`                               | `LazyLock` (グローバル `static`) または `OnceLock` (関数局所)。両方 std |
| ブロッキング呼び出しを `tokio::spawn` で囲む | `tokio::task::spawn_blocking`                                           |
| `std::sync::Mutex` で `.await` 越しにロック  | `tokio::sync::Mutex`                                                    |

## 多態性

| 選ぶ                    | 適用条件                                                                                    |
| ----------------------- | ------------------------------------------------------------------------------------------- |
| `enum`                  | コンパイル時に閉じた variant 集合。静的ディスパッチがホットループでは速い。最適化前に計測   |
| `dyn Trait`             | 外部呼び出し元が新しい型を追加する必要、または公開 API に型が現れる                         |
| `impl Trait` (generics) | vtable なしの静的ディスパッチ。オーバーヘッド回避だが単相化で膨張する。プロファイル後に選ぶ |

### 避ける

| AI が陥りがち                                 | 正しくは                                                   |
| --------------------------------------------- | ---------------------------------------------------------- |
| 公開戻り位置での `-> impl Trait`              | 名前付き型。後で広げるのは breaking change                 |
| variant 集合が閉じているのに `Box<dyn Trait>` | `enum`。ディスパッチが安く、`match` が網羅的               |
| 呼び出し元が拡張すべき型を `enum` で集約      | 下流 crate が variant を追加する必要があるなら `dyn Trait` |

## API 設計パターン

### Newtype

意味的に異なる値を、表現が同じプリミティブで包んで区別する。

```rust
pub struct UserId(pub u64);
pub struct ProductId(pub u64);
```

ランタイム コストはゼロ。コンパイル時に型混同を防ぐ。

### Type state

状態を型パラメータでエンコードする。不正な遷移はコンパイル エラーになる。

| ルール        | 詳細                                                                |
| ------------- | ------------------------------------------------------------------- |
| State markers | ゼロサイズ struct (`struct Connected;`) または `PhantomData<State>` |
| Transition    | `self` を消費し新しい型を返す                                       |
| Operations    | 有効な状態にのみメソッドを実装                                      |

### Builder

struct に 3 つ以上の任意フィールド、または構築前の検証が必要なときに使う。

| ルール | 詳細                                                                 |
| ------ | -------------------------------------------------------------------- |
| Entry  | `Foo::builder()` が `FooBuilder` を返す                              |
| Setter | `fn with_x(&mut self, x: X) -> &mut Self` (可変参照、エルゴノミック) |
| Build  | `fn build(self) -> Foo`。検証が失敗しうるなら `Result<Foo, _>`       |

1-2 フィールドなら struct リテラルか普通の `new` を選ぶ。

### Sealed trait

公開 trait の将来のメソッド追加を non-breaking に保つため、外部 crate からの実装を防ぐ。

```rust
mod private { pub trait Sealed {} }
pub trait MyTrait: private::Sealed { /* ... */ }
```

### factory パラメータによる依存注入

```rust
pub fn from_env() -> Result<Self> { Self::from_env_with(std::env::var) }
pub fn from_env_with<F>(get: F) -> Result<Self>
where F: Fn(&str) -> Result<String, VarError> { /* ... */ }
```

公開の `from_env()` は本番用、`from_env_with()` は mock lookup 付きのテスト用。

### 避ける

| AI が陥りがち                                  | 正しくは                                              |
| ---------------------------------------------- | ----------------------------------------------------- |
| `fn f(force: bool, dry_run: bool)`             | enum か struct (`Mode::Force` / `{ force, dry_run }`) |
| 状態のランタイム フラグ (`is_connected: bool`) | Type state パターン                                   |
| 全識別子が `String`                            | Newtype (`UserId`, `OrderId`)                         |
| 公開 trait で外部実装を自由に許可              | 進化が重要なら Sealed パターン                        |

## crate 分割

以下のいずれかが当てはまるとき、モジュールを別 crate に分割する。

| ケース         | 詳細                                                                                                 |
| -------------- | ---------------------------------------------------------------------------------------------------- |
| コンパイル時間 | 大きく稀にしか変わらないコードを分離し、増分ビルドを省く                                             |
| 共有ロジック   | 複数ターゲット (例: ネイティブ バイナリ + WASM) 向けにコンパイル                                     |
| Proc macro     | 手続きマクロは別 crate に置く必要がある。`rustc` がロードするネイティブ プラグインへコンパイルされる |
| Unsafe 隔離    | FFI / `unsafe extern` を子 crate に隔離。外側 crate は `#![forbid(unsafe_code)]` を保てる            |

## ドキュメント (rustdoc)

### コメント スタイル

| 構文  | スコープ                                             |
| ----- | ---------------------------------------------------- |
| `///` | 要素 (function, struct, enum, trait, method)         |
| `//!` | モジュールまたは crate (`lib.rs` / `module.rs` 先頭) |

### セクション

エントリが 1 つでも複数形を使う。

| 見出し       | 適用条件                                                 |
| ------------ | -------------------------------------------------------- |
| `# Examples` | すべての `pub` 要素。コードブロックは doctest として実行 |
| `# Errors`   | `Result` を返す関数                                      |
| `# Panics`   | パニックしうる関数。前提条件を明示                       |
| `# Safety`   | `unsafe fn` / `unsafe trait`。呼び出し元の契約を明示     |

### 規約

| ルール                 | 詳細                                                          |
| ---------------------- | ------------------------------------------------------------- |
| Summary                | 1 行目: 1 文、ピリオド終端                                    |
| Example error handling | `?` を使う。`.unwrap()` は不可                                |
| Hidden setup           | doctest セットアップ行に `#` を付ける。コンパイルされて非表示 |
| Type 参照              | ジェネリクス込みのフルネーム: `Option<T>`                     |
| Intra-doc links        | ``[`Foo`]`` が自動解決                                        |

### 強制

`#![warn(missing_docs)]` はライブラリ crate root にのみ。バイナリ エントリ ポイントには要素ごとのドキュメントは不要。

### 避ける

| AI が陥りがち                 | 正しくは                                      |
| ----------------------------- | --------------------------------------------- |
| `# Examples` 内の `.unwrap()` | `?` と失敗しうる `fn main() -> Result<(), E>` |
| `# Example` (単数形)          | `# Examples` (常に複数形)                     |
| バイナリでの `missing_docs`   | ライブラリ crate のみ                         |

## ロギング

`tracing` (構造化、async 対応) を `log` より優先する。

| レベル   | 適用条件                                      |
| -------- | --------------------------------------------- |
| `error!` | 操作失敗、ユーザーに見える影響                |
| `warn!`  | 復旧可能な異常 (リトライ、フォールバック発動) |
| `info!`  | ライフサイクル イベント (起動、設定読み込み)  |
| `debug!` | リクエスト/要素単位の開発時トレース           |
| `trace!` | 細粒度のフロー (まれ)                         |

| ルール                        | 詳細                                                                                 |
| ----------------------------- | ------------------------------------------------------------------------------------ |
| 構造化フィールド              | `info!(count = items.len(), "indexed batch")`。フィールド先、メッセージ後            |
| Spans                         | リクエスト/タスクのエントリポイントに `#[tracing::instrument]`                       |
| Subscriber                    | `main` で `tracing_subscriber` を 1 度初期化。`EnvFilter::from_default_env()` を使う |
| `println!` / `eprintln!` 不可 | プログラムの実出力である CLI stdout 出力を除く                                       |

### 避ける

| AI が陥りがち                                      | 正しくは                               |
| -------------------------------------------------- | -------------------------------------- |
| ライブラリコードに `println!("debug: {x}")` を散在 | `tracing::debug!(x = ?x)`              |
| `info!("loaded {}", count)`                        | `info!(count, "loaded")` (構造化)      |
| ライブラリコードでの `tracing_subscriber` 初期化   | アプリケーション エントリ ポイントのみ |
