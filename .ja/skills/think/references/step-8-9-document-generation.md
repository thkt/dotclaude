# Steps 7-8: SOW / Spec 生成

## Step 7: SOW

テンプレート ${CLAUDE_SKILL_DIR}/templates/sow.md を読む。設計コンテキスト (Steps 0-6) から埋める。ID 形式: AC-N。

出力: `.claude/workspace/planning/YYYY-MM-DD-[feature]/sow.md`

### 品質ゲート

各セクションを書く前に適用する。

| セクション | ゲート                                                                                                                                               |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Why        | 5 フィールドすべて埋まっていること。Outcome は計測可能な結果であり、成果物ではない                                                                   |
| AC         | 各 AC が Why Outcome に紐づくこと。Observable signal 列が埋まっていること (HTTP 200、状態 X)。孤立 AC なし、Why Problem を超えるスコープクリープなし |
| Scope      | Out of Scope が Why フィールドまたは制約に紐づくこと。In Scope の Observable outcome 列が埋まっていること (具体的なシグナル)                         |
| Bound      | Boundaries セクションは任意。存在する場合は最低 1 つの Never 行が必須。Enforced by 列は具体的なメカニズムを名指しすること                            |
| Impl       | Phase あたりファイル数 < 5。Steps は具体的な変更を記述すること                                                                                       |
| Test       | 各 AC に 1 つ以上のテスト。Verification は具体的に何を確認するかを記述すること                                                                       |
| Risks      | 1 つ以上のリスクを特定。Probability 列を埋める。Impact = HIGH のときは Mitigation 必須                                                               |

## Step 8: Spec

テンプレート ${CLAUDE_SKILL_DIR}/templates/spec.md を読む。SOW から生成する。ID 形式: FR-001, T-001, NFR-001。

追跡性: `FR-001 Implements: AC-001` → `T-001 Validates: FR-001`

出力: `.claude/workspace/planning/[same-dir]/spec.md`

### 品質ゲート

各セクションを書く前に適用する。

| セクション | ゲート                                                                   |
| ---------- | ------------------------------------------------------------------------ |
| FR         | EARS 構文必須。1 文に 1 SHALL。曖昧な値は禁止 (appropriate など)         |
| FR         | 設計判断の根拠を記述する (バリアント再利用、YAGNI の理屈など)            |
| Domain     | 概念レベルのみ。型 / フィールド名は使わない。Invariants を FR に紐づける |
| Test       | 各 FR に 1 つ以上のシナリオ。Given-When-Then 全列に具体的な値            |
| NFR        | Rationale 列を埋める。なぜこの目標値か (UX バジェット、SLA など)         |
| Assume     | 各仮定に Impact-if-broken を添える                                       |
| Impl       | Depends 列に先行 Phase ID または `none` を指定                           |
| Trace      | AC → FR → Test → NFR チェーンが切れていない                              |
