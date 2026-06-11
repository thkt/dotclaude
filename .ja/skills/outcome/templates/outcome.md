# OUTCOME テンプレートと例

`.claude/OUTCOME.md` の stub テンプレートとプロジェクト形態の例。/outcome スキルが生成・更新時に読む。

## Template

各リポジトリの `.claude/OUTCOME.md` は以下の構造に従う。Behavior は必須。Indicators は任意で、Behavior を裏付ける場合のみ書く。slot ごとの記入例は `<!-- 例: ... -->` 形式で書く。

```markdown
# OUTCOME

## Outcome state

[任意の冒頭文。プロジェクトの存在意義と、向かう方向。理想表現を許容]

### Behavior

[完了状態における主体 (人間ユーザー / AI エージェント / システム) の状態。実装非依存。観察可能。distinct な振る舞いごとに 1 行]

<!-- 例: AI エージェントは同じ編集サイクル内で違反を修正し、hook を素通りしない -->
<!-- 例: 開発者は内部ソースを参照せずに API を統合できる -->

### Indicators

[任意。上の Behavior を裏付ける状態。数値、時間、または理想方向。Behavior を sharpen する Indicator がなければ section ごと省略]

| Indicator  | 値                       | 裏付ける Behavior    |
| ---------- | ------------------------ | -------------------- |
| Time       | [境界値]                 | [どの Behavior 行か] |
| Error rate | [境界値]                 | [どの Behavior 行か] |
| Value      | [受益者が価値を持つ状態] | [どの Behavior 行か] |

## Non-goals

[箇条書き。明示的にスコープ外とするもの]

## Constraints

[箇条書き。動かせない技術、法的、組織的制約]
```

## Examples

3 つのプロジェクト形態。各例で Behavior と任意の Indicators を示す。

### 内部 hook tool (例: guardrails)

```markdown
## Outcome state

guardrails は AI エージェントの hooks として動作し、フロントエンドプロジェクトに対して機能する。AI が作成・編集したコードを監査してフィードバックを返すことで、エージェントの編集サイクル内で問題点を検出・修正可能な状態を維持する。フィードバックの精度と AI エージェントの体験を継続的に高める方向で進化する。

### Behavior

- 禁止パターンを書いた AI エージェントは blocking signal を受け、同じ編集サイクル内でコードを修正する
- すべての編集が commit 前に hook を通るため、禁止パターンは main に到達しない
- AI エージェントは hook の stderr を読んで、人手介入なしで修正する

### Indicators

| Indicator | 値                                          | 裏付ける Behavior                                              |
| --------- | ------------------------------------------- | -------------------------------------------------------------- |
| 精度      | 違反検知の精度が継続的に向上する            | エージェントが信頼できるフィードバックに基づいて修正する       |
| UX        | AI エージェントの編集体験が継続的に向上する | エージェントが hook を負担と感じず、修正サイクルを自発的に回す |
```

### Developer CLI (例: recall)

```markdown
## Outcome state

### Behavior

- 開発者は過去セッションの判断を再導出せずに取得できる
- 開発者は別語で再検索せずに、取得した結果に基づいて行動する

### Indicators

| Indicator | 値                                | 裏付ける Behavior          |
| --------- | --------------------------------- | -------------------------- |
| Time      | 典型的な履歴に対し検索が 2 秒以内 | 開発者が検索途中で諦めない |
```

### SaaS 機能 (例: okr-dashboard)

```markdown
## Outcome state

### Behavior

- チームメンバーが手動の spreadsheet コピーなしで weekly に key result を更新する
- ステークホルダーは owner に問い合わせずに org-wide の OKR 状態を読む

### Indicators

| Indicator | 値                                      | 裏付ける Behavior                |
| --------- | --------------------------------------- | -------------------------------- |
| Value     | 各メンバーがアプリ内で現状の OKR を見る | データが見えるから更新が継続する |
```
