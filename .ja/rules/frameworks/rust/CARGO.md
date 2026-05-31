---
paths:
  - "**/Cargo.toml"
---

# Cargo

## パッケージ メタデータ

`license`: `MIT OR Apache-2.0` を推奨 (Rust エコシステムのデフォルト)。Crate `name`: 英数字と `-` のみ。`name = "..."` 内のアンダースコアは公開・検索時に `-` に正規化される。

| フィールド                               | Library                                           | Binary               |
| ---------------------------------------- | ------------------------------------------------- | -------------------- |
| `name` / `version` / `edition`           | 必須                                              | 必須                 |
| `rust-version`                           | 推奨 (MSRV)。crate が使う最新 Rust 機能に合わせる | 推奨                 |
| `description` / `license` / `repository` | 推奨 (公開時は必須)                               | 推奨                 |
| `readme`                                 | 公開時に推奨                                      | 任意                 |
| `publish = false`                        | crates.io に公開しない場合に設定                  | 公開しない場合に設定 |
| `keywords` / `categories`                | crates.io 公開時のみ (keywords は最大 5)          | crates.io 公開時のみ |

## 依存関係

| ルール             | 詳細                                                         |
| ------------------ | ------------------------------------------------------------ |
| バージョン         | semver 範囲 (`"2"`、`"=2.0.1"` 不可)。pin が必要な場合のみ   |
| Features           | 常に明示: `serde = { version = "1", features = ["derive"] }` |
| dev のみ           | `[dev-dependencies]`。release にコンパイルされない           |
| Optional + feature | dep に `optional = true` + `features = { x = ["dep:pkg"] }`  |
| Git dep            | branch 名ではなく `rev = "<sha>"` で pin                     |

## Features

| ルール              | 詳細                                                                           |
| ------------------- | ------------------------------------------------------------------------------ |
| 命名                | `snake_case`、`with_` 接頭辞なし (C-FEATURE)                                   |
| Default             | `default = [...]` を最小に保つ。opt-out より opt-in を優先                     |
| `test-support`      | テストヘルパー (mock, fixture) を下流テストコードに公開する慣例的な feature 名 |
| Feature unification | features は加法的。相互排他的な振る舞いには使わない                            |

## `[lints]` 標準セット

`Cargo.toml` で強制 (Rust 1.74+)。`cargo build`, `cargo clippy`, IDE すべてが同じ設定を見る。

```toml
[lints.rust]
unsafe_code = "forbid"        # FFI / extern crate のみで "allow"

[lints.clippy]
# Groups
all = { level = "warn", priority = -1 }
pedantic = { level = "warn", priority = -1 }

# Pedantic opt-outs (common false positives)
module_name_repetitions = "allow"
# Note: `missing_errors_doc` / `missing_panics_doc` は意図的に warn のまま。
# RUST.md は公開の失敗 API に `# Errors` / `# Panics` セクションを要求する。

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

### グループ ポリシー

| グループ                        | 設定                                                   |
| ------------------------------- | ------------------------------------------------------ |
| `correctness` / `suspicious`    | deny / warn (デフォルト)。グループとしては無効化しない |
| `complexity` / `perf` / `style` | warn (デフォルト)。修正するか理由付き `#[allow]`       |
| `pedantic`                      | グループとして warn、誤検知を `allow` で個別に外す     |
| `nursery`                       | グループ enable は不可。安定 lint を個別に拾う         |
| `restriction`                   | グループ enable は不可。個別に lint を拾う             |

### CI

`cargo clippy --all-targets --all-features -- -D warnings`。警告でビルド失敗。

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
# ... 同じ標準セット
```

メンバーは継承する。

```toml
[dependencies]
serde = { workspace = true }

[lints]
workspace = true
```

| ルール         | 詳細                                                                                 |
| -------------- | ------------------------------------------------------------------------------------ |
| 共有バージョン | `[workspace.dependencies]` で 1 度 pin して全体で継承                                |
| 共有 lints     | `[workspace.lints]` で crate 横断の一貫した厳しさ                                    |
| 単一 lockfile  | 全メンバーが 1 つの `Cargo.lock` を共有。互換バージョンが workspace 横断で統一される |
| FFI 隔離       | 子 crate が `unsafe extern` を持つ。外側 crate は `unsafe_code = "forbid"` を保つ    |

## 補助ツール

`rustfmt` / `clippy` 以外で、AI 主導開発の隙を埋める cargo サブコマンド。`cargo install <tool>` または `cargo binstall <tool>` (バイナリ プリビルドで高速) でインストール。

| ツール           | 用途                                                         | 使い方                                                                               |
| ---------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| `cargo-nextest`  | 並列実行・リトライ・出力改善付きのテストランナー             | `cargo nextest run`。ローカルと CI で `cargo test` を置換し、RGRC サイクルを加速     |
| `cargo-llvm-cov` | ソースベースのカバレッジ計測                                 | `cargo llvm-cov --all-features`。`THRESHOLDS.md` の C0 ≥ 90% / C1 ≥ 80% ゲートを強制 |
| `cargo-deny`     | ライセンス / セキュリティ アドバイザリ / 禁止 crate チェック | CI で `deny.toml` ポリシーと共に `cargo deny check`                                  |
| `cargo-machete`  | 未使用 `[dependencies]` エントリの検出                       | `cargo machete`。探索中に追加して未配線のままの依存を検出                            |

## 避ける

| AI が陥りがち                                       | 正しくは                                                                      |
| --------------------------------------------------- | ----------------------------------------------------------------------------- |
| feature 一覧なしの `serde = "1"`                    | `serde = { version = "1", features = ["derive"] }`                            |
| ライブラリ依存の `version = "1.0.42"` 完全 pin      | semver 範囲 `"1"`。pin が必要な場合のみ                                       |
| `git = "...", branch = "main"`                      | 再現性のため `rev = "<sha>"` で pin                                           |
| ソース内の `#![warn(clippy::pedantic)]`             | `Cargo.toml` の `[lints.clippy] pedantic = { level = "warn", priority = -1 }` |
| `cargo-nextest` がインストール済みでも `cargo test` | `cargo nextest run`。フィードバックが速く、fail-fast オプション有り           |
