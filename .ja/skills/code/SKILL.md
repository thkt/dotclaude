---
name: code
description: TDD/RGRC サイクルとリアルタイムテストフィードバックでコードを実装する。小さなバグ修正やエラー解決には使わない (/fix を使用)。
when_to_use: 実装して, コード書いて, implement, coding
allowed-tools: Bash(npm run) Bash(npm run:*) Bash(yarn run) Bash(yarn run:*) Bash(yarn:*) Bash(pnpm run) Bash(pnpm run:*) Bash(pnpm:*) Bash(bun run) Bash(bun run:*) Bash(bun:*) Bash(cargo:*) Bash(make:*) Bash(git status:*) Bash(git log:*) Bash(which:*) Edit MultiEdit Write Read LS Task AskUserQuestion Bash(ugrep:*) Bash(bfs:*)
model: opus
argument-hint: "[implementation description] [--no-storybook]"
---

# /code - TDD Implementation

NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST.

違反 → コードを削除し、テストを書き、書き直す。

## 開始時の宣言

コードを書く前に、以下の宣言をそのまま出力する。

> Starting TDD RGRC cycle. Every code change begins with a failing test.

## Rationalization Counters

| 言い訳                               | 反論                                                                                |
| ------------------------------------ | ----------------------------------------------------------------------------------- |
| "This is too simple for TDD"         | 単純な変更がリグレッションを隠す。1 行のテストが数時間の debug を防ぐ               |
| "I'll add tests later"               | "後で" は来ない。テスト負債は利息付きで複利になる                                   |
| "This is just a refactor"            | テストなしのリファクタは silent regression の最大原因                               |
| "Existing tests already cover"       | カバーするなら Red phase で確認できる。実行する                                     |
| "Testing this would be too slow"     | 遅いテストは production bug より速い                                                |
| "Red test doesn't need verification" | テストしない Red = 盲目的に書いている。実行して、失敗が意図と一致することを確認する |

## Input

- `$ARGUMENTS` に実装記述 (必須、空ならプロンプト)

### Flags

| Flag             | 効果                                              |
| ---------------- | ------------------------------------------------- |
| `--no-storybook` | Storybook 自動検出を無効化 (デフォルト: 自動検出) |

プロジェクトに Storybook + コンポーネントファイルがあるとき自動検出。Storybook Phase を参照。

## SOW Context

${CLAUDE_SKILL_DIR}/../\_lib/sow-resolution.md を参照

## Scope Guard

OUTCOME.md と SOW を読み込んだ後、(a) Phase ごとのファイル数と (b) outcome 整合性を確認する。Phase に Files ≥ 5 があれば、停止し `/think` で分割するようユーザーに求める。実装が OUTCOME.md の Non-goals に踏み込むか Constraints に抵触する場合、停止しユーザーに確認する。SOW がなく `$ARGUMENTS` が ≥ 5 ファイルを示唆する場合、まず `/think` 実行を提案する。

## Target Languages

JS/TS が first-class。Rust / Go / Python は `generator-test` のフレームワーク検出経由で動く。検出が失敗するときは task prompt にテストランナーを明示する。Storybook/E2E phase は非 JS/TS では既存条件で自動スキップ。Quality Gates は言語非依存 (T-NNN coverage、gates hook が言語ごとに pre/post-edit)。

## External References

| Reference                                       | 読むタイミング                    | 見つからない/不明瞭時                        |
| ----------------------------------------------- | --------------------------------- | -------------------------------------------- |
| `.claude/OUTCOME.md`                            | Step 0 Outcome Anchor             | rules/core/OUTCOME.md の flow で stub を生成 |
| ${CLAUDE_SKILL_DIR}/../\_lib/sow-resolution.md  | Step 1 SOW 検出                   | SOW なし状態、Scope Guard を inline で適用   |
| ${CLAUDE_SKILL_DIR}/references/csf3-patterns.md | Storybook Phase 全条件 pass       | 最小 CSF3 stories フォーマットを使う         |
| `ralph-loop` plugin                             | Step 4 RGRC 反復                  | Red → Green → Refactor を手動ループ          |
| `generator-test` agent                          | Step 2 spawn                      | Error Handling: Leader が直接テスト生成      |
| `evaluator-test` agent                          | Step 8 Quality Gates、Spec が存在 | Test Quality gate をスキップ                 |
| `reviewer-readability` agent                    | Step 5 Review Gate                | /fix ではスキップ; 手動レビューで継続        |

## Notation

| 記号         | 意味                                                        | 用途                                                               |
| ------------ | ----------------------------------------------------------- | ------------------------------------------------------------------ |
| `T-NNN`      | `T-\d{3}` 3 桁ゼロパディング spec scenario ID (例: `T-001`) | テスト関数名、describe/it 文字列、または inline コメントに埋め込む |
| `TaskOutput` | `run_in_background: true` spawn からの同期受信              | 完了を待ってから次へ進む                                           |

## Execution

| Step | アクション             | 詳細                                                                           |
| ---- | ---------------------- | ------------------------------------------------------------------------------ |
| 0    | Outcome Anchor         | `.claude/OUTCOME.md` を読む。不在なら stub を生成 (rules/core/OUTCOME.md 参照) |
| 1    | SOW Context            | SOW/spec を検出して読む → Scope Guard                                          |
| 2    | `generator-test` spawn | `subagent_type: generator-test`, `run_in_background: true`                     |
| 3    | テスト結果を受信       | `TaskOutput` (実装前に完了を待つ)                                              |
| 4    | RGRC サイクル          | `ralph-loop --max-iterations 10` で自動反復                                    |
| 5    | Review Gate            | `reviewer-readability` を spawn (/fix ではスキップ)                            |
| 6    | Storybook Phase        | 条件付き                                                                       |
| 7    | E2E Phase              | 条件付き                                                                       |
| 8    | Quality Gates          | use-workflow-code を参照                                                       |

## Spec Evolution

実装中に新規要件が見つかる (edge case、エラー処理、統合関心事)。

1. 先に Spec を更新する: spec.md の Test Scenarios 表に T-NNN を追加
2. それからテストを書く: テスト名/コメントで新しい T-NNN を参照
3. Spec トレースなしのテストを追加してはいけない: 全テストは T-NNN にマップする

`evaluator-test` は T-NNN マッピングを使ってカバレッジ等の品質メトリクスを計算する。

## Storybook Phase (条件付き)

### 条件

すべて pass する必要があり、順に評価し、最初の fail でスキップ。

| #   | チェック                     | 方法                                                      | fail 時           |
| --- | ---------------------------- | --------------------------------------------------------- | ----------------- |
| 1   | `--no-storybook` フラグなし  | `$ARGUMENTS` を parse                                     | スキップ (silent) |
| 2   | プロジェクトに Storybook     | `.storybook/` 存在 OR package.json deps に `@storybook/*` | スキップ (silent) |
| 3   | 実装にコンポーネントファイル | 変更ファイルに PascalCase export の `.tsx`/`.jsx`         | スキップ (silent) |

### 宣言

条件が一致したら、生成前に announce する。

```
[auto-detect] Storybook detected + {File}.tsx appears to be a component.
Will generate {File}.stories.tsx. Opt out with --no-storybook.
```

### 実行

検出された各コンポーネントについて、${CLAUDE_SKILL_DIR}/references/csf3-patterns.md に従い `{Component}.stories.tsx` を生成する。Spec の Component API セクションがあれば props をそこから取得し、なければコンポーネントから推論する。

### 既存 Stories の扱い

| 選択肢 | アクション                 |
| ------ | -------------------------- |
| [O]    | 既存ファイルを上書き       |
| [S]    | スキップ - 既存を保持      |
| [M]    | マージ - diff を表示、手動 |
| [D]    | Diff のみ - 新規を追記     |

## E2E Phase (条件付き)

### 条件

すべて pass する必要があり、順に評価し、最初の fail でスキップ。

| #   | チェック                         | 方法                                        | fail 時             |
| --- | -------------------------------- | ------------------------------------------- | ------------------- |
| 1   | Spec に `Type: e2e` シナリオ     | Spec Test Scenarios 表を grep               | スキップ (silent)   |
| 2   | agent-browser インストール済み   | `which agent-browser`                       | スキップ + advisory |
| 3   | package.json で dev server 検出  | `dev`, `start:dev`, `start` script に match | スキップ + advisory |
| 4   | dev server 稼働中 (ユーザー確認) | AskUserQuestion: "Dev server at {url}?"     | スキップ + advisory |

### Dev Server 検出

`package.json` script から検出。

| 優先度 | script 名パターン        | デフォルト URL        |
| ------ | ------------------------ | --------------------- |
| 1      | dev, start:dev           | http://localhost:5173 |
| 2      | start                    | http://localhost:3000 |
| 3      | storybook, storybook:dev | http://localhost:6006 |

script 値で指定されていれば port を抽出 (`--port`, `-p`, `PORT=`)。

### 実行

```
Agent(subagent_type: "generator-e2e",
      prompt: "spec_path: <path>\ndev_server_url: <url>",
      run_in_background: true)
```

## Quality Gates

| Check                     | 条件                    | 方法                          |
| ------------------------- | ----------------------- | ----------------------------- |
| AC met                    | RGRC 後                 | 手動 (SOW なしならスキップ)   |
| Test Quality (per-metric) | Spec が存在             | `evaluator-test` エージェント |
| Iteration 強制            | 各 Write/Edit/MultiEdit | `gates` hook (PostToolUse)    |

呼び出し詳細は use-workflow-code を参照。

## Error Handling

| エラー                             | アクション                                                                            |
| ---------------------------------- | ------------------------------------------------------------------------------------- |
| generator-test タイムアウト        | Leader が直接テスト生成                                                               |
| generator-test がテストを 0 件生成 | spec の存在を確認、ユーザーに確認                                                     |
| ralph-loop 停滞                    | ループを停止、手動修正                                                                |
| Quality gates fail                 | commit 前に issue を修正                                                              |
| Evaluator metric が閾値以下        | uncovered/excess/duplicate/granularity/intent issue を修正                            |
| Evaluator タイムアウト             | gate をスキップ、警告ログ                                                             |
| Spec 見つからず                    | T-NNN trace なしで進む、Test Quality gate をスキップ (またはユーザーに spec 作成依頼) |
| agent-browser クラッシュ           | E2E をスキップ、advisory、続行                                                        |
| Dev server 到達不能                | E2E をスキップ、advisory、続行                                                        |
| E2E tests fail                     | Advisory (ブロックしない)                                                             |
| Storybook phase エラー             | phase をスキップ、advisory、続行                                                      |
