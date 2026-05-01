---
paths:
  - ".claude/agents/**"
---

# Subagent Conventions

`.claude/agents/` 配下のサブエージェント ファイルに対する規約。

## YAML Frontmatter

```yaml
---
name: agent-name              # lowercase-hyphens, ≤64 chars
description: Brief summary.   # 三人称、≤1024 chars
tools: Read, Grep, Glob       # フィールド名は `tools` (skills は `allowed-tools`)
model: opus                   # sonnet | opus | haiku | inherit | full-id
skills: [skill-name]          # Optional: 起動時に skill 内容を注入 (plugin form: <plugin>:<skill>)
memory: project               # Optional: user | project | local
background: true              # Optional: boolean
---
```

## 公式 frontmatter フィールド

| フィールド                              | 必須 | 備考                              |
| --------------------------------------- | ---- | --------------------------------- |
| name                                    | Yes  | 小文字 + ハイフン                 |
| description                             | Yes  | デリゲーション ルーティングに使用 |
| tools, disallowedTools                  | No   | カンマまたは空白区切り文字列      |
| model                                   | No   | デフォルト: `inherit`             |
| permissionMode, maxTurns                | No   | 必要に応じて                      |
| skills                                  | No   | 起動時に skill 内容を注入         |
| mcpServers, hooks                       | No   | 必要に応じて                      |
| memory                                  | No   | `user` / `project` / `local`      |
| background                              | No   | Boolean                           |
| effort, isolation, color, initialPrompt | No   | 必要に応じて                      |

## Description

| フィールド  | 要件       |
| ----------- | ---------- |
| description | 三人称のみ |

`when_to_use` フィールドはない。サブエージェントは Task ツール経由で起動され、自動ロードされない。

## 命名

パターン: `<role>-<scope>`。小文字 + ハイフンのみ。

| Role 接頭辞 | 用途                 | 例                  |
| ----------- | -------------------- | ------------------- |
| architect-  | 設計構成             | architect-feature   |
| critic-     | 反論                 | critic-design       |
| enhancer-   | コード改善           | enhancer-code       |
| evaluator-  | 品質評価             | evaluator-test      |
| explorer-   | コードベース探索     | explorer-feature    |
| generator-  | アーティファクト生成 | generator-test      |
| resolver-   | エラー修正           | resolver-build      |
| reviewer-   | 検査                 | reviewer-security   |
| team-       | swarm 参加者         | team-implementation |

## ディレクトリ構造

```text
agents/
├── architects/
├── critics/
├── enhancers/
├── evaluators/
├── explorers/
├── generators/
├── resolvers/
├── reviewers/
└── teams/
```

サブディレクトリは公式仕様の一部ではない。実装の探索は再帰的に行われるため、このレイアウトは実用上機能する。公式の `agents/` ロケーション セマンティクスが変わった場合は再評価する。

## Tools 形式

公式仕様に従いカンマまたは空白区切り文字列を使う。

```yaml
tools: Read, Grep, Glob
tools: Read Grep Glob       # こちらも有効
```

Bash matcher 構文 (`Bash(yomu:*)`) もサポートされる。

## モデル選択

| 必要条件                                     | 推奨         |
| -------------------------------------------- | ------------ |
| 多段命令、peer DM、シャットダウン プロトコル | opus, sonnet |
| 機械的な単一パス出力                         | haiku        |
| 親コンテキストに合わせる                     | inherit      |

Haiku は swarm の team agents から除外される。理由は `skills/swarm/SKILL.md` を参照。

## Memory

`memory: project` は、セッション横断でプロジェクト固有のパターン保持を有効にする。

### 選択基準

3 条件すべてを満たす場合のみ割り当てる。

| 条件             | 説明                                       | 例                         |
| ---------------- | ------------------------------------------ | -------------------------- |
| 頻度             | セッション横断で繰り返し起動される         | 監査のたびに呼ばれる       |
| プロジェクト依存 | 出力品質がプロジェクト固有の知識に依存する | 命名規約、許可パターン     |
| 学習効果         | memory が偽陽性を減らすか一貫性を改善する  | 既知例外を再報告しなくなる |

### カテゴリ別の除外

34 のうち 23 のエージェントが `memory: project` を使う。下のカテゴリは設計上 opt out している。

| カテゴリ   | 理由                                               |
| ---------- | -------------------------------------------------- |
| teams      | セッション内のみの実行。セッション横断の継続性なし |
| critics    | 客観性を保つ必要がある。memory はバイアスを生む    |
| enhancers  | ステートレスな変換。学習効果なし                   |
| evaluators | 固定メトリクスに対する採点。memory は基準をずらす  |
| generators | 出力はプロンプト入力のみで決まる                   |

## エージェント本文からの参照

| 必要               | 機構                                                                            |
| ------------------ | ------------------------------------------------------------------------------- |
| Skill 内容を再利用 | `skills: [skill-name]` frontmatter (起動時に注入)                               |
| クロスファイル参照 | エージェント ファイルからの相対パスで引用。エージェントが読み込み時に絶対化する |

## 本文構造

必須セクションはない。既存エージェントに共通するパターン。

| セクション             | 用途                                    |
| ---------------------- | --------------------------------------- |
| Input                  | エージェントが期待するタスク プロンプト |
| Constraints / PROHIBIT | エージェントが行ってはならないこと      |
| Workflow / Phases      | ステップごとのアクション                |
| Output                 | DM ペイロードまたはファイル成果物       |
| Error Handling         | 復旧の振る舞い                          |

代表例は `agents/` 配下の既存エージェントを参照。

## reviewer 固有のパターン

| 要素        | 規約                                                           |
| ----------- | -------------------------------------------------------------- |
| Scope       | 単一ドメイン、単一責務。約 80 行を目安。複雑な仕様ではそれ以上 |
| Frontmatter | `tools`, `model`, `skills`, `memory`                           |
| Output      | `findings` + `summary` を含む構造化 Markdown                   |

## サイズ

ハードリミットなし。簡潔に。1 パスで読める分量を目指す。

## セキュリティ プロパティ

| プロパティ | 値                                       |
| ---------- | ---------------------------------------- |
| 保存対象   | 分析パターン、規約、例外リスト           |
| 保存しない | 生のソースコード、シークレット、認証情報 |
| 配置       | `.claude/agent-memory/`                  |

配置は `.gitignore` に `/.claude/agent-memory/` として登録されている。
