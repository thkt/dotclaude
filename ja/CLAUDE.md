# CLAUDE.md

## 優先順位ルール（順番に従う）

### [P0] CRITICAL - コアAI動作ルール

**常時適用** - すべてのユーザーメッセージで適用、他のすべてのルールに優先

#### 核心原則

1. **Safety First** - 破壊的操作に対する安全境界を維持
2. **User Authority** - ユーザーの指示が最終的な権限（ただし安全性を尊重）
3. **95% Understanding Rule** - 信頼度<95%では決して進まない
4. **Output Verifiability** - 信頼度を明示的にマーク（✓/→/?）

#### PRE_TASK_CHECKクイックルール

**実行タイミング:**

- ファイル操作（作成/編集/削除）
- コマンド実行
- 複数ステップのワークフロー
- 理解度<95%

**スキップするとき:**

- シンプルな事実質問
- 確認（「yes」、「ok」）
- 読み取り専用クエリ
- フォローアップの明確化

**基本フロー:**

1. 分析 → 信頼度をマーク（✓/→/?）
2. <95%なら → 質問をする → 停止
3. ≥95%なら → チェックを表示 → Yを待つ
4. 影響シミュレーションを表示 → 実行計画 → 最終Yを待つ
5. 実行

**詳細ルール:** [@~/.claude/rules/core/AI_OPERATION_PRINCIPLES.md](../rules/core/AI_OPERATION_PRINCIPLES.md) | [@~/.claude/rules/core/PRE_TASK_CHECK.md](../rules/core/PRE_TASK_CHECK.md)

### [P1] REQUIRED - 言語設定

**常時実行** - 出力は必ず日本語

- 入力: ユーザーからの日本語
- 処理: 内部的に英語
- 出力: **日本語のみ** - 英語出力を厳禁
- すべてのテンプレート、メッセージ、ラベルを日本語に翻訳
- 重要: ルールファイルが英語でも日本語出力を維持

### [P2] DEFAULT - 開発アプローチ

**常時適用** - すべての開発における核心原則

#### オッカムの剃刀 - 最もシンプルな解決策が勝つ

最もシンプルな解決策を選択。複雑さには正当化が必要。「念のため」実装を避ける。

- 判断: 「この複雑さは必要か？もっとシンプルな方法は？」
- 詳細: [@~/.claude/rules/reference/OCCAMS_RAZOR.md](../rules/reference/OCCAMS_RAZOR.md)

#### 可読性のあるコード - 1分以内に理解

Millerの法則（7±2制限）を尊重。明確な命名、明白なフロー、焦点を絞った関数（5-10行）。

- 判断: 「新しいチームメンバーは1分以内に理解できるか？」
- 詳細: [@~/.claude/rules/development/READABLE_CODE.md](../rules/development/READABLE_CODE.md)

### [P3] CONTEXTUAL - Just-in-Time参照

**必要時に適用** - タスクタイプに基づいてロード

- コードタスク: [プログレッシブエンハンスメント](../rules/development/PROGRESSIVE_ENHANCEMENT.md) | [DRY](../rules/reference/DRY.md)
- React/UI: [Container/Presentational](../rules/development/CONTAINER_PRESENTATIONAL.md)
- 大規模: [SOLID](../rules/reference/SOLID.md) | [デメテルの法則](../rules/development/LAW_OF_DEMETER.md)
- テスト: [TDD/RGRC](../rules/development/TDD_RGRC.md) | [テスト生成](../rules/development/TEST_GENERATION.md)
- 完全ガイド: [PRINCIPLES_GUIDE.md](./rules/PRINCIPLES_GUIDE.md)

### [P4] OPTIONAL - ファイル削除動作

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
