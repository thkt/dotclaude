---
paths:
  - ".claude/skills/**"
---

# Workflows

## コマンド選択

| 状況                             | ワークフロー                                                     |
| -------------------------------- | ---------------------------------------------------------------- |
| 小さなバグ、安定したコードベース | `/fix`                                                           |
| 既知の実装                       | `/code`                                                          |
| 原因不明 / 知識欠落              | `/research` → `/fix`                                             |
| 設計または方針未確定             | `/think`                                                         |
| 新機能                           | `/feature` (または: `/research` → `/think` → `/code` → `/audit`) |
| 緊急の本番障害                   | `/fix` (緊急、設計を省略)                                        |

## Team-First 原則

デフォルトは Team (TeamCreate + TaskList で進捗追跡)。

| コマンド    | モード | 備考                         |
| ----------- | ------ | ---------------------------- |
| `/feature`  | Team   | 既存のチーム構造             |
| `/audit`    | Auto   | スコープに基づく判断         |
| `/think`    | Solo   |                              |
| `/code`     | Auto   | スコープに基づく判断         |
| `/fix`      | Auto   | 下記の Solo 条件             |
| `/research` | Solo   |                              |
| Utility     | Solo   | /commit, /checkout, /pr など |

Auto では、すべての Solo 条件を満たす → Solo、そうでなければ → Team。

| Solo 条件            | 例                         |
| -------------------- | -------------------------- |
| 対象 1-2 ファイル    | typo 修正、単一関数の変更  |
| 完了まで単一フェーズ | リサーチやテスト生成不要   |
| エージェント連携なし | 他エージェントへの依存なし |

## 利用可能なコマンド

| コマンド    | カテゴリ      | 用途                                                             |
| ----------- | ------------- | ---------------------------------------------------------------- |
| `/think`    | Core          | 検証付きの SOW 作成                                              |
| `/research` | Core          | 実装なしの調査                                                   |
| `/code`     | Core          | TDD/RGRC 実装                                                    |
| `/audit`    | Core          | エージェントによるコードレビュー                                 |
| `/polish`   | Core          | AI 由来の slop 除去                                              |
| `/feature`  | Core          | 機能ライフサイクル全体 (explore + architect + implement + audit) |
| `/fix`      | Quick         | 高速バグ修正 (think→code→test)                                   |
| `/adr`      | Documentation | Architecture Decision Record                                     |
| `/checkout` | Git           | ブランチ名提案                                                   |
| `/commit`   | Git           | Conventional Commits メッセージ                                  |
| `/pr`       | Git           | PR 説明                                                          |
| `/issue`    | Git           | GitHub Issue                                                     |
| `/preview`  | Git           | PR スクリーニングレビュー                                        |

## Todo 進捗追跡

クロスセッションは `export CLAUDE_CODE_TASK_LIST_ID="[feature]-tasks"`。

| コマンド   | Todo アクション                                 |
| ---------- | ----------------------------------------------- |
| `/think`   | Implementation Plan から TaskCreate             |
| `/code`    | TaskUpdate → in_progress / completed            |
| `/audit`   | (`/code` フェーズ経由)                          |
| `/feature` | TaskCreate (Phase 1)、フェーズ全体で TaskUpdate |
