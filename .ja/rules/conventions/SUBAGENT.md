---
paths:
  - ".claude/agents/**"
---

# Subagent Conventions

`.claude/agents/` 配下のサブエージェント ファイルに対する規約。

## 命名

命名パターンは小文字 + ハイフン `<role>-<scope>` のみ。ファイルは role の複数形サブディレクトリに置く。

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

## YAML Frontmatter

サブエージェントは Task ツール経由で起動され、自動ロードされない。Agent / AskUserQuestion / EnterPlanMode / ScheduleWakeup などはサブエージェント内で動作せず `tools` に列挙しても無効。

| フィールド                      | 必須 | 備考                                                                                           |
| ------------------------------- | ---- | ---------------------------------------------------------------------------------------------- |
| name                            | Yes  | 小文字 + ハイフン。ファイル名と一致不要。同一スコープ内で一意 (重複は片方が警告なく破棄)       |
| description                     | Yes  | いつ委譲すべきかを書く。デリゲーション ルーティングに使用                                      |
| tools, disallowedTools          | No   | カンマまたは空白区切り文字列。省略時は全ツール継承。Bash matcher 構文 (`Bash(git log:*)`) も可 |
| model                           | No   | sonnet / opus / haiku / fable / inherit / full-id。デフォルト: `inherit`                       |
| permissionMode, maxTurns        | No   | 必要に応じて                                                                                   |
| skills                          | No   | 起動時に skill 内容を注入。plugin form は `<plugin>:<skill>`                                   |
| mcpServers, hooks               | No   | 必要に応じて                                                                                   |
| memory                          | No   | `user` / `project` / `local`。有効化で Read / Write / Edit を自動付与                          |
| background                      | No   | Boolean。デフォルト: `false`                                                                   |
| effort                          | No   | low / medium / high / xhigh / max                                                              |
| isolation, color, initialPrompt | No   | 必要に応じて                                                                                   |

## モデル選択基準

| 必要条件                                     | 推奨         |
| -------------------------------------------- | ------------ |
| 多段命令、peer DM、シャットダウン プロトコル | opus, sonnet |
| 機械的な単一パス出力                         | haiku        |
| 親コンテキストに合わせる                     | inherit      |

## Memory 選択基準

付与後 project スコープに実データが貯まらないまま残る場合は外す。

| 必須条件         | 説明                                       | 例                         |
| ---------------- | ------------------------------------------ | -------------------------- |
| 頻度             | セッション横断で繰り返し起動される         | 監査のたびに呼ばれる       |
| プロジェクト依存 | 出力品質がプロジェクト固有の知識に依存する | 命名規約、許可パターン     |
| 学習効果         | memory が偽陽性を減らすか一貫性を改善する  | 既知例外を再報告しなくなる |

## 本文構造

| セクション             | 用途                                    |
| ---------------------- | --------------------------------------- |
| Input                  | エージェントが期待するタスク プロンプト |
| Constraints / PROHIBIT | エージェントが行ってはならないこと      |
| Workflow / Phases      | ステップごとのアクション                |
| Output                 | DM ペイロードまたはファイル成果物       |
| Error Handling         | 復旧の振る舞い                          |

## 参照記法

相対パスの解決先は起動プロジェクトに依存する。

| 形式                                         | 用途                   | 理由                                                  |
| -------------------------------------------- | ---------------------- | ----------------------------------------------------- |
| `skills: [skill-name]` frontmatter           | Skill 内容の再利用     | preload 制御として起動時に全文が context へ注入される |
| `~/.claude/skills/<skill>/references/foo.md` | 補足資料の遅延読み込み | cwd に依存せず Read で解決できる                      |
| `skills/<skill>/references/foo.md`           | 避ける                 | cwd が `~/.claude` のときしか解決できない             |
| `${CLAUDE_SKILL_DIR}`                        | 不可                   | skill 本文専用の変数                                  |

## サイズ制限

本文は 200 行を閾値とする。
