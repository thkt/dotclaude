# Pre-flight: テスト + Hook Findings

Pre-flight はテスト実行と `reviews` hook 出力（knip/oxlint/tsgo/react-doctor）の finding 変換を担う。静的解析は hook 側、ここには置かない。

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

以下を優先順で確認し、最初にマッチしたものを使用する。

1. `test`
2. `test:unit`
3. `test:ci`
4. `spec`

ランナー未検出の場合は `command -v` でテストフレームワーク検出にフォールバックする。

| 設定ファイル                    | ツール確認          | コマンド         |
| ------------------------------- | ------------------- | ---------------- |
| `vitest.config.*`               | `command -v npx`    | `npx vitest run` |
| `jest.config.*`                 | `command -v npx`    | `npx jest`       |
| `pytest.ini` / `pyproject.toml` | `command -v pytest` | `pytest`         |
| `Cargo.toml`                    | `command -v cargo`  | `cargo test`     |

## Step 3: テスト実行

| ルール       | 動作                                               |
| ------------ | -------------------------------------------------- |
| テスト未検出 | Pre-flight テストをスキップ、エージェントへ進む    |
| 非ゼロ終了   | 出力をコンテキストとして保持、監査はブロックしない |
| タイムアウト | スクリプトごと60秒；超過時は kill して続行         |

スナップショットの `pre_flight` に記録する（カバレッジ利用可能なら付加、ツール不在は `skipped`）。

| フィールド | ソース                                     |
| ---------- | ------------------------------------------ |
| tests      | テスト出力 → total/passed/failed カウント  |
| coverage   | カバレッジレポート → c0 (行) / c1 (分岐) % |

## Step 4: hook 出力を finding に変換

| Hook 状態                                 | Action                                                                          |
| ----------------------------------------- | ------------------------------------------------------------------------------- |
| `additionalContext` 注入あり              | 各ツールセクションを parse → `PF-{seq}` finding（finding-schema.md の base fields） |
| 注入なし（未インストール / no-op / findings 無し） | snapshot に `hook_findings: 0` を記録し続行。Pre-flight は失敗させない          |

| フィールド   | 値                                                                              |
| ------------ | ------------------------------------------------------------------------------- |
| `finding_id` | `PF-{seq}`（1-based、同一 pre-flight 呼出内で全ツール通しの連番）               |
| `agent`      | `pre-flight`                                                                    |

ツールごとの category 命名規則。

| ツール       | category パターン                                                          | デフォルト severity                                 |
| ------------ | -------------------------------------------------------------------------- | --------------------------------------------------- |
| knip         | `unused-file`, `unused-export`, `unused-dependency`, `unlisted-dependency` | `unlisted` → high, `unused-file` → medium, 他 → low |
| oxlint       | `lint/{rule-name}`                                                         | `error` → high, `warning` → medium                  |
| tsgo         | `type-error/TS{code}`                                                      | high                                                |
| react-doctor | `react/{issue-type}`                                                       | medium                                              |
| （未知）     | `preflight/{tool-name}`                                                    | low                                                 |

finding-schema.mdの統合ルールを適用（同一パターン → 1 findingに統合）。
