---
paths:
  - "**/Cargo.toml"
---

# Cargo

## パッケージメタデータ

`license`: `MIT OR Apache-2.0`(Rust エコシステムのデフォルト)を優先。Crate `name`: 英数字と `-` のみ。`name = "..."` のアンダースコアは publish / search 時点で `-` に正規化される。

| フィールド                               | Library                                             | Binary               |
| ---------------------------------------- | --------------------------------------------------- | -------------------- |
| `name` / `version` / `edition`           | 必須                                                | 必須                 |
| `rust-version`                           | 推奨(MSRV) — クレートが使う最新の Rust 機能に揃える | 推奨 — 同じ          |
| `description` / `license` / `repository` | 推奨(公開時は必須)                                  | 推奨                 |
| `readme`                                 | 公開時は推奨                                        | オプション           |
| `publish = false`                        | crates.io に公開しない時に設定                      | 公開しない時に設定   |
| `keywords` / `categories`                | crates.io 公開時のみ(keywords 最大 5 個)            | crates.io 公開時のみ |

## 依存関係

| ルール                  | 詳細                                                                |
| ----------------------- | ------------------------------------------------------------------- |
| バージョン              | semver 範囲(`"2"`、`"=2.0.1"` ではない)、ピン留めが必要な場合を除く |
| フィーチャー            | 常に明示: `serde = { version = "1", features = ["derive"] }`        |
| dev 専用                | `[dev-dependencies]` — リリースにはコンパイルされない               |
| optional + feature gate | dep に `optional = true` + `features = { x = ["dep:pkg"] }`         |
| Git dep                 | ブランチ名ではなく `rev = "<sha>"` でピン留め                       |

## フィーチャー

| ルール           | 詳細                                                                               |
| ---------------- | ---------------------------------------------------------------------------------- |
| 命名             | `snake_case`、`with_` プレフィックスなし(C-FEATURE)                                |
| デフォルト       | `default = [...]` は最小に保つ — opt-in > opt-out                                  |
| `test-support`   | テストヘルパー(モック、フィクスチャ)を下流テストコードに公開する慣例フィーチャー名 |
| フィーチャー合成 | フィーチャーは加法的 — 相互排他的な振る舞いに使わない                              |

## `[lints]` canonical set

`Cargo.toml`(Rust 1.74+)で強制し、`cargo build`、`cargo clippy`、IDE すべてで同じ設定を使う。

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

### グループポリシー

| グループ                        | 設定                                                  |
| ------------------------------- | ----------------------------------------------------- |
| `correctness` / `suspicious`    | deny / warn(デフォルト) — グループ単位で無効化しない  |
| `complexity` / `perf` / `style` | warn(デフォルト) — 修正するか `#[allow]` に理由付き   |
| `pedantic`                      | グループとして warn、false positive は `allow` で除外 |
| `nursery`                       | グループとして有効化しない — 安定した lint を個別選択 |
| `restriction`                   | グループとして有効化しない — 個別 lint を選択         |

### CI

`cargo clippy --all-targets --all-features -- -D warnings`。警告があればビルド失敗。

## ワークスペース

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

メンバーでの継承:

```toml
[dependencies]
serde = { workspace = true }

[lints]
workspace = true
```

| ルール         | 詳細                                                                                        |
| -------------- | ------------------------------------------------------------------------------------------- |
| 共有バージョン | `[workspace.dependencies]` — 一度ピン留めしてどこでも継承                                   |
| 共有 lints     | `[workspace.lints]` — クレート間で一貫した厳格度                                            |
| 単一 lockfile  | 全メンバーが 1 つの `Cargo.lock` を共有。互換性ある依存バージョンがワークスペース全体で統一 |
| FFI 隔離       | 子クレートが `unsafe extern` を保持、外側クレートは `unsafe_code = "forbid"` を維持         |

## 補助ツール

`rustfmt` / `clippy` を超えた `cargo` サブコマンドで、AI 駆動開発のよくあるギャップを埋める。`cargo install <tool>` または `cargo binstall <tool>`(プリビルドバイナリで高速)でインストール。

| ツール           | 目的                                                         | 使い方                                                                                |
| ---------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| `cargo-nextest`  | リトライと改善された出力を持つ高速並列テストランナー         | `cargo nextest run` — ローカル・CI で `cargo test` を置き換え、RGRC サイクルを加速    |
| `cargo-llvm-cov` | ソースベースのカバレッジ計測                                 | `cargo llvm-cov --all-features` — `THRESHOLDS.md` の C0 ≥ 90% / C1 ≥ 80% ゲートを強制 |
| `cargo-deny`     | ライセンス / セキュリティアドバイザリ / 禁止クレートチェック | CI で `cargo deny check`、`deny.toml` ポリシーと共に                                  |
| `cargo-machete`  | 未使用の `[dependencies]` エントリを検出                     | `cargo machete` — 探索中に追加したが結局つながれなかった依存を検出                    |

## 避けるべき

| AI がやりがち                                  | 正しい                                                                        |
| ---------------------------------------------- | ----------------------------------------------------------------------------- |
| feature リストなしの `serde = "1"`             | `serde = { version = "1", features = ["derive"] }`                            |
| ライブラリ依存に `version = "1.0.42"` 完全ピン | semver 範囲 `"1"`、ピン留めが必要な場合を除く                                 |
| `git = "...", branch = "main"`                 | 再現性のため `rev = "<sha>"` でピン留め                                       |
| ソースコードで `#![warn(clippy::pedantic)]`    | `Cargo.toml` で `[lints.clippy] pedantic = { level = "warn", priority = -1 }` |
| `cargo-nextest` が入っているのに `cargo test`  | `cargo nextest run` — 高速フィードバック、fail-fast オプション                |
