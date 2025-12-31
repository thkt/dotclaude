---
description: Git diffを分析し、Conventional Commits形式のメッセージを生成する
allowed-tools: Task
model: inherit
dependencies: [commit-generator, utilizing-cli-tools]
---

# /commit - Gitコミットメッセージ生成

ステージされた変更を分析し、Conventional Commits仕様に従った適切なコミットメッセージを生成します。

**実装**: このコマンドは最適なパフォーマンスとコンテキスト効率のため、専門の `commit-generator` サブエージェントに委譲します。

## 動作概要

このコマンドを実行すると:

1. Taskツールで `commit-generator` サブエージェントを起動
2. サブエージェントがgit diffとstatusを分析（コードベースコンテキスト不要）
3. Conventional Commits形式のメッセージを生成
4. 複数のメッセージ案を返却

## 使い方

### 基本的な使い方

```bash
/commit
```

ステージされた変更を分析し、メッセージを提案します。

### コンテキスト付き

```bash
/commit "認証フローに関連"
```

コンテキストをメッセージ生成に組み込みます。

### Issue番号付き

```bash
/commit "#123"
```

コミットメッセージにIssue参照を含めます。

## Conventional Commits形式

```text
<type>(<scope>): <subject>

[optional body]

[optional footer]
```

### コミットタイプ

| タイプ | 用途 |
| --- | --- |
| `feat` | 新機能 |
| `fix` | バグ修正 |
| `docs` | ドキュメント |
| `style` | フォーマット |
| `refactor` | コード再構築 |
| `perf` | パフォーマンス改善 |
| `test` | テスト |
| `chore` | メンテナンス |
| `ci` | CI/CD変更 |
| `build` | ビルドシステム変更 |

### サブジェクト行のルール

1. **72文字以内**
2. **命令形を使用**（「add」「added」ではなく）
3. **タイプ後の最初の文字を大文字にしない**
4. **末尾にピリオドを付けない**
5. **具体的かつ簡潔に**

## 良い例

```markdown
✅ feat(auth): add OAuth2 authentication support
✅ fix(api): resolve timeout in user endpoint
✅ docs(readme): update installation instructions
✅ perf(search): optimize database queries
```

## 悪い例

```markdown
❌ Fixed bug (タイプなし、曖昧すぎる)
❌ feat: Added new feature. (大文字、ピリオド)
❌ update code (タイプなし、具体性なし)
❌ FEAT(AUTH): ADD LOGIN (すべて大文字)
```

## 出力形式

コマンドは以下を提供します:

- **分析概要**: 変更ファイル、追加/削除行数、検出されたタイプ/スコープ
- **推奨メッセージ**: 分析に基づいた最適なメッセージ
- **代替フォーマット**: 詳細版、簡潔版、Issue参照付き
- **使用方法**: 生成されたメッセージでコミットする方法

## ワークフローとの統合

以下とシームレスに連携:

- `/branch` - まずブランチを作成
- `/pr` - コミット後にPR説明を生成
- `/test` - コミット前にテストをパスさせる

## 技術詳細

### サブエージェントのメリット

- **90%のコンテキスト削減**: git操作のみ、コードベース読み込みなし
- **2-3倍の高速実行**: git分析に最適化された軽量エージェント
- **専門ロジック**: コミットメッセージ生成に特化
- **並列実行**: 他の操作と同時実行可能

### 使用するGit操作

サブエージェントはgitコマンドのみを実行:

- `git diff --staged` - 変更を分析
- `git status` - ファイル状態を確認
- `git log` - コミットスタイルを学習
- ファイルシステムアクセスやコード解析なし

## 関連コマンド

- `/branch` - 変更からブランチ名を生成
- `/pr` - PR説明を作成
- `/audit` - コミット前のコードレビュー

## ベストプラクティス

1. **関連する変更をステージ**: 論理的に関連する変更をグループ化
2. **頻繁にコミット**: 小さく、焦点を絞ったコミットが良い
3. **コミット前にレビュー**: 提案されたメッセージを確認
4. **破壊的変更を含める**: 常に破壊的変更を明記
5. **Issueを参照**: 該当する場合はコミットをIssueにリンク

## コンテキスト効率

このコマンドは最小限のコンテキスト使用に最適化:

- ✅ コードベースファイルの読み込みなし
- ✅ gitメタデータのみを分析
- ✅ 高速実行（5秒未満）
- ✅ 他のタスクと並列実行可能

---

**注**: 実装詳細は `.claude/agents/git/commit-generator.md` を参照してください
