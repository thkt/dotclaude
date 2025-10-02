# CLAUDE.md

## 優先順位ルール（順番に従う）

### [P0] コアAI動作ルール（必須遵守）

**これらのルールは基本的なAI動作を管理し、常に遵守する必要があります。**

- **AI動作原則**: [@~/.claude/rules/core/AI_OPERATION_PRINCIPLES.md](../rules/core/AI_OPERATION_PRINCIPLES.md)
  - Safety First - 破壊的操作に対する安全境界を維持
  - User Authority - ユーザーの指示が最終的な権限
  - Workflow Integration - 構造化された操作のためにPRE_TASK_CHECKに従う
  - **優先度**: 最上位（他のすべてのルールに優先）
  - **適用**: すべてのユーザーメッセージでフック経由で内部的に適用

- **事前タスクチェック**: [@~/.claude/rules/core/PRE_TASK_CHECK.md](../rules/core/PRE_TASK_CHECK.md)
  - ファイル操作前の理解確認
  - 複数ステップワークフローの実行計画
  - 破壊的操作に対するユーザー承認ゲート
  - **適用タイミング**: ファイル操作、コマンド実行、複雑なタスク
  - **ワークフロー**: 原則適用 → PRE_TASK_CHECK → 確認待機

**注**: これらのP0ルールはすべてのAI相互作用の基盤です。他のすべての優先レベル（P1、P2、P3）はP0が確立した枠組みの中で動作します。

### [P1] 言語

- 入力: ユーザーからの日本語
- 処理: 内部的に英語
- 出力: **日本語のみ** - ユーザーへの英語出力禁止
- 翻訳: 以下は**必須**:
  - すべてのフォーマットテンプレート（Understanding Level → 理解レベル）
  - すべてのメッセージとプロンプト（Proceed? → 進めてよろしいですか？）
  - すべてのラベルとステータス（completed → 完了）
- **重要**: ルールファイルが英語でも、出力は必ず日本語

### [P2] 開発アプローチ

- **原則ガイド**: 完全な適用ガイド → [@~/.claude/ja/rules/PRINCIPLES_GUIDE.md](./rules/PRINCIPLES_GUIDE.md)
- **核心原則**: オッカムの剃刀 → [@~/.claude/rules/reference/OCCAMS_RAZOR.md](../rules/reference/OCCAMS_RAZOR.md)
- **デフォルト哲学**: プログレッシブエンハンスメント → [@~/.claude/rules/development/PROGRESSIVE_ENHANCEMENT.md](../rules/development/PROGRESSIVE_ENHANCEMENT.md)
- **コード可読性**: The Art of Readable Code → [@~/.claude/rules/development/READABLE_CODE.md](../rules/development/READABLE_CODE.md)
- **Container/Presentational**: コンポーネント設計パターン → [@~/.claude/rules/development/CONTAINER_PRESENTATIONAL.md](../rules/development/CONTAINER_PRESENTATIONAL.md)

### [P3] ファイル削除動作

- **rmコマンドは絶対使用しない**: settings.jsonでrmは無効化されている
- **常にゴミ箱を使用**: 永久削除ではなく~/.Trash/にファイルを移動
- **コマンド**: ファイル削除には`mv [file] ~/.Trash/`を使用
- **理由**: 安全性 - 誤って削除したファイルの復元が可能

## 作業完了ガイドライン

**重要**: 完了を報告する前にすべての作業が適切に検証されていることを確認

- **テスト作成**: テストを作成した後、必ずプロジェクトのテストコマンドを実行してパスすることを確認
  - package.json/pubspec.yaml等からテストコマンドを発見
  - 一般的なパターン: `npm test`, `yarn test`, `flutter test`, `vitest` など

- **コード実装**: コードを書いた後、必ず以下を確認:
  - コンパイル/ビルドエラーがない（プロジェクトのビルド/解析コマンドを使用）
  - Lintがパスする（利用可能な場合はプロジェクトのlintコマンドを使用）
  - 関連テストがパスする（関連するテストスイートを実行）
  - 明らかな実行時エラーがない

- **コマンド発見**:
  - まずREADME.mdで利用可能なスクリプトを確認
  - パッケージマネージャーの設定を確認（package.jsonのscripts、pubspec.yamlなど）
  - 不明な場合はユーザーに特定のコマンドを尋ねる

- **再試行ポリシー**: 問題発生時は自動で最大5回まで再試行し、それでも解消できない場合にのみユーザーへ連絡する（途中経過は報告しない）
  - ユーザーへの報告: "同じエラーが5回続いています。別のアプローチが必要かもしれません。"

- **以下の状態では完了を報告しない**:
  - テストが失敗している（未実装機能のテストを明示的に作成している場合を除く）
  - コンパイル/ビルドエラーがある
  - 前回の試行から未解決のエラーがある

### コマンドリファレンス

- コマンドリスト（英語版）: [@~/.claude/docs/COMMANDS.md](../docs/COMMANDS.md)
- コマンドリスト（日本語版）: [@~/.claude/ja/docs/COMMANDS.md](./docs/COMMANDS.md)

### ドキュメントガイドライン

- ドキュメントルール: [@~/.claude/ja/docs/DOCUMENTATION_RULES.md](./docs/DOCUMENTATION_RULES.md)
- すべてのドキュメントで一貫性を維持
