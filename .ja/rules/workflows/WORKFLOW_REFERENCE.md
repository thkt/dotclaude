---
paths:
  - ".claude/commands/**"
  - ".claude/skills/**"
---

# ワークフローリファレンス

コマンドワークフローの詳細リファレンス。コマンドやスキルの編集時にロードされる。

## 利用可能なコマンド

### コア開発

| コマンド    | 目的                                                    |
| ----------- | ------------------------------------------------------- |
| `/think`    | SOW作成と検証                                           |
| `/research` | 実装なしの調査                                          |
| `/code`     | TDD/RGRC実装                                            |
| `/test`     | 包括的テスト                                            |
| `/audit`    | エージェント経由のコードレビュー                        |
| `/polish`   | AI生成スロップの除去                                    |
| `/validate` | SOW準拠の検証                                           |
| `/spec`     | Spec生成（実装詳細）                                    |
| `/sow`      | SOW進捗表示                                             |
| `/feature`  | 機能ライフサイクル全体（調査 + 設計 + 実装 + レビュー） |

### クイックアクション

| コマンド | 目的                              |
| -------- | --------------------------------- |
| `/fix`   | 迅速なバグ修正（think→code→test） |

### ブラウザ & ドキュメント

| コマンド  | 目的                            |
| --------- | ------------------------------- |
| `/e2e`    | ブラウザ操作からのE2Eテスト     |
| `/adr`    | アーキテクチャ決定記録          |
| `/docs`   | コードからドキュメント生成      |

### Git操作

| コマンド  | 目的                           |
| --------- | ------------------------------ |
| `/branch` | ブランチ名の提案               |
| `/commit` | Conventional Commitsメッセージ |
| `/pr`     | PRの説明                       |
| `/issue`  | GitHub Issues                  |

## Todo進捗トラッキング

クロスセッション: `export CLAUDE_CODE_TASK_LIST_ID="[feature]-tasks"`

| コマンド    | Todoアクション                                |
| ----------- | --------------------------------------------- |
| `/think`    | Implementation PlanからTaskCreate             |
| `/code`     | TaskUpdate → in_progress / completed          |
| `/test`     | （`/code` フェーズ経由）                      |
| `/audit`    | （`/code` フェーズ経由）                      |
| `/validate` | 残りのTaskUpdate → completed                  |
| `/feature`  | TaskCreate（Phase 1）、全フェーズでTaskUpdate |

## アーキテクチャ

| レイヤー | 配置場所            | 役割                     |
| -------- | ------------------- | ------------------------ |
| Command  | `commands/*.md`     | ユーザー向けワークフロー |
| Skill    | `skills/*/SKILL.md` | 知識ベース               |
| Agent    | `agents/**/*.md`    | 特化した分析             |

## コマンド × 原則マッピング

| コマンド    | 主要原則                         | 副次原則                          |
| ----------- | -------------------------------- | --------------------------------- |
| `/think`    | SOLID、オッカムの剃刀            | プログレッシブエンハンスメント    |
| `/research` | Strong Inference                 | コンテキストのためのすべての原則  |
| `/code`     | TDD、ベイビーステップ            | 読みやすいコード、DRY、AI支援開発 |
| `/test`     | TDD                              | デメテルの法則、AI支援開発        |
| `/fix`      | オッカムの剃刀                   | TIDYINGS                          |
| `/audit`    | すべての原則                     | 優先順序、Strong Inference        |
| `/feature`  | プログレッシブエンハンスメント   | TDD、SOLID、オッカムの剃刀        |
| `/polish`   | 読みやすいコード、オッカムの剃刀 | DRY、YAGNI                        |
| `/validate` | 出力の検証可能性                 | 完了基準                          |
| `/commit`   | 読みやすいコード                 | Conventional Commits              |
| `/branch`   | 読みやすいコード                 | 命名規約                          |
| `/pr`       | 読みやすいコード                 | ドキュメント                      |
| `/issue`    | 読みやすいコード                 | ミラーの法則                      |
| `/docs`     | 読みやすいコード                 | プログレッシブエンハンスメント    |
| `/adr`      | SOLID                            | リーキー抽象化                    |
| `/sow`      | オッカムの剃刀                   | プログレッシブエンハンスメント    |
| `/spec`     | オッカムの剃刀、SOLID            | TDD                               |
| `/e2e`      | TDD                              | プログレッシブエンハンスメント    |
