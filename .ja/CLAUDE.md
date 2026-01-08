# CLAUDE.md

## 優先ルール（順番に従うこと）

### [P0] 最重要 - コアAI動作ルール

**常時有効** - すべてのユーザーメッセージに適用、他のすべてのルールより優先

コア原則: [@../rules/core/AI_OPERATION_PRINCIPLES.md](../rules/core/AI_OPERATION_PRINCIPLES.md)
タスク検証: [@../rules/core/PRE_TASK_CHECK_RULES.md](../rules/core/PRE_TASK_CHECK_RULES.md) (hook経由で注入)

### [P1] 必須 - 言語設定

**常時強制** - 出力は日本語でなければならない

- 入力: ユーザーからの日本語
- 処理: 内部的には英語
- 出力: **日本語のみ** - 英語出力を厳禁
- すべてのテンプレート、メッセージ、ラベルを日本語に翻訳
- 重要: ルールファイルが英語でも日本語出力を維持

### [P2] デフォルト - 開発アプローチ

**常時適用** - すべての開発に対するコア原則

必須原則（SOLID、DRY、オッカムの剃刀、ミラーの法則、YAGNI）は `applying-code-principles` スキルで利用可能。

**クイック判断質問**（実装前に毎回適用）:

- 「もっとシンプルな方法は？」（オッカムの剃刀）
- 「1分以内に理解できる？」（ミラーの法則）
- 「知識を重複させていない？」（DRY）
- 「今必要？」（YAGNI）

スキルは関連キーワードで自動起動。詳細: [@../skills/applying-code-principles/SKILL.md](../skills/applying-code-principles/SKILL.md)

### [P3] コンテキスト依存 - 必要時参照

**必要に応じて適用** - タスクタイプに基づいてロード

- コードタスク: `enhancing-progressively` スキルで利用可能
- React/UI: `applying-frontend-patterns` スキルで利用可能
- コンポーネント設計: [Container/Presentational](../patterns/frontend/container-presentational.md)
- テスト: `generating-tdd-tests` スキルで利用可能

**注**: スキルはコンテキストとキーワードに基づいて自動起動。

完全ガイド: [PRINCIPLES_GUIDE.md](../rules/PRINCIPLES_GUIDE.md)

### [P4] オプション - ファイル削除動作

- **rmコマンドは絶対使用禁止**: rmはsettings.jsonで無効化
- **git rmも禁止**: ファイルを恒久的に削除してしまう
- **常にゴミ箱を使用**: 恒久削除の代わりに~/.Trash/へ移動
- **コマンド**: `mv [file] ~/.Trash/` してから `git add -A` で削除を記録
- **理由**: 安全性 - 誤って削除したファイルの復元が可能

## 作業完了ガイドライン

**重要**: 完了報告前に以下の基準をすべて満たすことを確認:

- **テスト作成**: テスト作成後、以下のチェックをすべて実行:
  1. プロジェクトのテストコマンドを実行（package.json/pubspec.yaml等から発見）
  2. 終了コードが0であることを確認（全テスト合格）
  3. 一般的なパターン: `npm test`, `yarn test`, `flutter test`, `vitest` 等

- **コード実装**: コード作成後、以下のチェックをすべて実行:
  1. ビルド/コンパイル成功（終了コード0）
  2. リンターがエラー0で通過（警告は5未満なら許容）
  3. 関連するすべてのテストが合格（失敗0）
  4. クリティカルパスの手動スモークテスト（実施手順を記録）

チェックが失敗した場合:

- ビルドエラー: 即座に修正、先に進まない
- リンターエラー: すべてのエラーを修正、時間があれば警告も対処
- テスト失敗: 根本原因を修正、テストを無効化しない
- スモークテスト失敗: デバッグして再テストしてグリーンになるまで

- **コマンド発見**（優先順に実行）:
  1. **最初**: README.mdを読み、"Scripts"または"Commands"セクションを確認
  2. **次に**: パッケージマネージャ設定を調査（package.json > scripts、pubspec.yaml > scripts）
  3. **その次**: 一般的なテストファイルを検索（_.test._、_.spec._、test/、spec/）
  4. **最後の手段**: 手順1-3で結果がない場合、以下の形式でユーザーに質問:
     「テストコマンドが見つかりませんでした。テスト実行コマンドを指定してください（例: npm test, yarn test）。」

- **完了報告を厳禁**:
  - 失敗するテストがある場合（未実装機能のテストを明示的に作成している場合を除く）
  - コンパイル/ビルドエラーがある場合
  - 前回の試行からの未解決エラーがある場合

### コマンドリファレンス

- コマンド一覧: [@../docs/COMMANDS.md](../docs/COMMANDS.md)

### ドキュメントガイドライン

- ドキュメントルール: [@../rules/guidelines/DOCUMENTATION_RULES.md](../rules/guidelines/DOCUMENTATION_RULES.md)
- すべてのドキュメントで絶対的な一貫性を確保
