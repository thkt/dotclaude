# Pre-flight: テスト + Hook Findings

静的解析は `reviews` hook（knip, oxlint, tsgo, react-doctor、ADR-0013準拠）に委譲。
Pre-flightはテスト実行とhook出力のfinding変換に集中。

## Step 1: プロジェクトルートからタスクランナーを検出

| ファイル         | ランナー                |
| ---------------- | ----------------------- |
| `package.json`   | npm / yarn / pnpm / bun |
| `composer.json`  | composer                |
| `Makefile`       | make                    |
| `Taskfile.yml`   | task                    |
| `Cargo.toml`     | cargo                   |
| `pyproject.toml` | poetry / uv / ruff      |
| `Gemfile`        | bundle exec             |

## Step 2: 検出したランナーからテストスクリプトを探索

一般的な名前: `test`, `test:unit`, `test:ci`, `spec`

フォールバック: ランナー未検出の場合、`command -v` でテストフレームワークを確認:

| 設定ファイル                    | ツール確認          | コマンド         |
| ------------------------------- | ------------------- | ---------------- |
| `vitest.config.*`               | `command -v npx`    | `npx vitest run` |
| `jest.config.*`                 | `command -v npx`    | `npx jest`       |
| `pytest.ini` / `pyproject.toml` | `command -v pytest` | `pytest`         |
| `Cargo.toml`                    | `command -v cargo`  | `cargo test`     |

## Step 3: テスト実行

| ルール       | 動作                                               |
| ------------ | -------------------------------------------------- |
| テスト未検出 | Pre-flightテストをスキップ、エージェントへ進む     |
| 非ゼロ終了   | 出力をコンテキストとして保持、監査はブロックしない |
| タイムアウト | スクリプトごと60秒；超過時は kill して続行         |

カバレッジが利用可能な場合はカバレッジ付きで実行。

スナップショットの `pre_flight` に結果を記録:

| フィールド | ソース                                     |
| ---------- | ------------------------------------------ |
| tests      | テスト出力 → total/passed/failed カウント  |
| coverage   | カバレッジレポート → c0 (行) / c1 (分岐) % |

テストランナーまたはカバレッジツールが利用不可の場合は `skipped` として記録。

## Step 4: hook 出力を finding に変換

PreToolUse(Skill) hookが `additionalContext` を注入した場合（例:
ADR-0013に基づく
`claude-reviews`）、各ツールセクションをparseし、finding-schema.mdのbase
fieldsに従って `PF-{seq}` findingに変換する。

| フィールド   | 値                               |
| ------------ | -------------------------------- |
| `finding_id` | `PF-{seq}`（全ツール通しの連番） |
| `agent`      | `pre-flight`                     |

category命名規則:

| ツール       | category パターン                                                          | デフォルト severity                                 |
| ------------ | -------------------------------------------------------------------------- | --------------------------------------------------- |
| knip         | `unused-file`, `unused-export`, `unused-dependency`, `unlisted-dependency` | `unlisted` → high, `unused-file` → medium, 他 → low |
| oxlint       | `lint/{rule-name}`                                                         | `error` → high, `warning` → medium                  |
| tsgo         | `type-error/TS{code}`                                                      | high                                                |
| react-doctor | `react/{issue-type}`                                                       | medium                                              |
| （未知）     | `preflight/{tool-name}`                                                    | low                                                 |

finding-schema.mdの統合ルールを適用（同一パターン → 1 findingに統合）。
