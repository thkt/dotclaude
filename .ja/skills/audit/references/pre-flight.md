# Pre-flight: Tests + Hook Findings

Pre-flight は test を実行し、`reviews` hook 出力 (knip/oxlint/tsgo/react-doctor) を finding に変換する。静的解析は hook 側で行い、ここでは行わない。

## Step 1: プロジェクトルートから task runner を検出

| ファイル         | Runner                  |
| ---------------- | ----------------------- |
| `package.json`   | npm / yarn / pnpm / bun |
| `composer.json`  | composer                |
| `Makefile`       | make                    |
| `Taskfile.yml`   | task                    |
| `Cargo.toml`     | cargo                   |
| `pyproject.toml` | poetry / uv / ruff      |
| `Gemfile`        | bundle exec             |

## Step 2: 検出した runner で test スクリプトを探す

以下の名前を優先順で確認し、最初の match を使う。

1. `test`
2. `test:unit`
3. `test:ci`
4. `spec`

runner が見つからない場合、`command -v` でフレームワーク検出に fallback する。

| Config File                     | ツールチェック      | コマンド         |
| ------------------------------- | ------------------- | ---------------- |
| `vitest.config.*`               | `command -v npx`    | `npx vitest run` |
| `jest.config.*`                 | `command -v npx`    | `npx jest`       |
| `pytest.ini` / `pyproject.toml` | `command -v pytest` | `pytest`         |
| `Cargo.toml`                    | `command -v cargo`  | `cargo test`     |

## Step 3: テスト実行

| ルール          | 振る舞い                                             |
| --------------- | ---------------------------------------------------- |
| test 見つからず | pre-flight tests をスキップ、エージェントへ進む      |
| 非ゼロ終了      | 出力をコンテキストとして取得、audit はブロックしない |
| タイムアウト    | スクリプトあたり 60s; kill して続行                  |

snapshot の `pre_flight` に記録 (取得可能なら coverage 付き; ツールなしなら `skipped`)。

| Field    | Source                                       |
| -------- | -------------------------------------------- |
| tests    | test 出力 → total/passed/failed カウント    |
| coverage | coverage report → c0 (line) / c1 (branch) % |

## Step 4: hook 出力を finding に変換

| Hook 状態                                   | アクション                                                                                           |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `additionalContext` を注入                  | 各 tool セクションを parse → `PF-{seq}` finding に `status: static` (finding-schema.md base fields) |
| 不在 (未インストール、no-op、findings ゼロ) | snapshot に `hook_findings: 0` を記録; pre-flight を fail させない                                   |

| Field        | Value                                               |
| ------------ | --------------------------------------------------- |
| `finding_id` | `PF-{seq}` (1-based、pre-flight 内で tool 横断連番) |
| `agent`      | `pre-flight`                                        |
| `status`     | `static` (deterministic ツールで機械的に確認済み)   |

ツールごとのカテゴリ命名規則。

| ツール       | Category パターン                                                          | デフォルト severity                                        |
| ------------ | -------------------------------------------------------------------------- | ---------------------------------------------------------- |
| knip         | `unused-file`, `unused-export`, `unused-dependency`, `unlisted-dependency` | `unlisted` → high, `unused-file` → medium, others → low |
| oxlint       | `lint/{rule-name}`                                                         | `error` → high, `warning` → medium                       |
| tsgo         | `type-error/TS{code}`                                                      | high                                                       |
| react-doctor | `react/{issue-type}`                                                       | medium                                                     |
| (未知)       | `preflight/{tool-name}`                                                    | low                                                        |

finding-schema.md の Consolidation Rule (同パターン → 単一 finding) を PF finding 内のみで適用する。PF と Wave 1 は別扱い (下記 Pipeline Treatment)。

## PF Findings の Pipeline 扱い

PF findings (`status: static`) は challenger/verifier をスキップする。deterministic ツールが自身の evidence を提供しているため。reconcile された Wave 1 findings と並んで integrator に直接流れる。

| Stage      | PF の扱い                                                |
| ---------- | -------------------------------------------------------- |
| challenger | スキップ。機械的に確認済み                               |
| verifier   | スキップ。ツール出力自体が evidence                      |
| root-cause | 含める。PF findings は root cause 解析の seed になり得る |
| integrator | 直接受け取る。Wave 1 と cross-reference (下記)           |

### Wave 1 Cross-reference

PF finding と同じ `file:line` (overlap ±3、`SKILL.md` の Multi-run Aggregation と同一 tolerance) に Wave 1 finding がある場合、integrator は Wave 1 finding の evidence に cross-reference を追記する。

`Static-confirmed by ${PF-id} (${PF.category})`

両 finding は snapshot に残る。PF は `status: static` のまま、Wave 1 は reconcile 済み status を保つ。cross-reference により `output.md` がエントリを merge せずに関係を render できる。重複扱いではなく、強化シグナルとして扱う。
