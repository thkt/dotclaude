# Commands Design

コマンドの設計意図と関係性を説明します。

📌 **[日本語版](../.ja/docs/COMMANDS.md)**

## Architecture

```mermaid
graph TD
    subgraph User["User Interface"]
        CMD["/command"]
    end

    subgraph Orchestration["Command Layer"]
        CMD --> SKILL[Skills]
        CMD --> AGENT[Agents]
        CMD --> PLUGIN[External Plugins]
    end

    subgraph Execution["Execution Layer"]
        SKILL --> FORK[Fork Context]
        AGENT --> TASK[Task Tool]
    end
```

## Command Categories

| Category       | Commands                                         | Purpose          |
| -------------- | ------------------------------------------------ | ---------------- |
| Planning       | `/think`, `/research`, `/sow`, `/spec`            | 要件定義・調査   |
| Implementation | `/code`, `/fix`, `/test`                         | コード実装       |
| Quality        | `/audit`, `/polish`, `/validate`                 | 品質保証         |
| Documentation  | `/docs`, `/adr`, `/e2e`                           | ドキュメント生成 |
| Git            | `/commit`, `/branch`, `/pr`, `/issue`            | Git操作          |

## Design Principles

### 1. Thin Wrapper Pattern

コマンドは「オーケストレーター」であり、実装詳細を持たない。

```markdown
# 良い例: /code

- Skills: orchestrating-workflows (RGRC定義)
- Agents: test-generator (テスト生成)
- Plugins: ralph-loop (自動イテレーション)

# 悪い例

- コマンド内にTDD手順をハードコード
```

### 2. Conditional Context Loading

必要な時だけスキルをロード。

```markdown
/code --frontend → applying-frontend-patterns をロード
/code --principles → applying-code-principles をロード
/code (フラグなし) → 追加スキルなし
```

### 3. Graceful Degradation

外部プラグインがなくても動作する。

```markdown
ralph-loop あり → 自動RGRC反復
ralph-loop なし → 手動確認モード (機能は同じ)
```

## Command Relationships

```mermaid
flowchart LR
    subgraph Quick["Quick Fix"]
        F["/fix"]
    end
    subgraph Investigate["Investigation"]
        R1["/research"] --> F2["/fix"]
    end
    subgraph Feature["Full Workflow"]
        R2["/research"] --> T["/think"]
        T --> S["/spec"]
        S --> C["/code"]
        C --> TE["/test"]
        TE --> A["/audit"]
        A --> P["/polish"]
        P --> V["/validate"]
    end
```

| Pattern              | When to Use            |
| -------------------- | ---------------------- |
| `/fix` のみ          | 原因が明確な小さなバグ |
| `/research` → `/fix` | 原因不明の問題         |
| Full Workflow        | 新機能、複雑な変更     |

## Command → Skill/Agent Mapping

| Command   | Skills Used                                   | Agents Used        |
| --------- | --------------------------------------------- | ------------------ |
| `/think`  | -                                             | -                  |
| `/code`   | orchestrating-workflows, generating-tdd-tests | test-generator     |
| `/audit`  | applying-code-principles                      | 13 reviewer agents |
| `/fix`    | -                                             | -                  |
| `/polish` | -                                             | code-simplifier    |
| `/docs`   | documenting-\*                                | \*-analyzer        |

## File Structure

```text
commands/
├── code.md      # YAML front matter + 実行手順
├── fix.md
├── think.md
└── ...
```

### Front Matter Fields

| Field           | Required | Purpose                         |
| --------------- | -------- | ------------------------------- |
| `description`   | ✓        | コマンドの説明（Skill表示用）   |
| `allowed-tools` | ✓        | 使用可能なツール                |
| `model`         | -        | 使用モデル（opus/sonnet/haiku） |
| `argument-hint` | -        | 引数のヒント表示                |

## Related

- [SKILLS_AGENTS.md](./SKILLS_AGENTS.md) — スキル・エージェントの詳細
- [WORKFLOW_REFERENCE](../rules/workflows/WORKFLOW_REFERENCE.md) — ワークフロー選択ガイド
