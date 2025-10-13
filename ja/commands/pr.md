---
name: pr
description: ブランチの変更内容を分析して包括的なPR説明文を自動生成
priority: high
suitable_for:
  type: [git, workflow, documentation, review]
  phase: [pull-request, review]
  understanding: "≥ 70%"
aliases: [pull-request, pr-desc]
timeout: 15
allowed-tools: Bash(git diff*), Bash(git log*), Bash(git status*), Bash(git branch*), Bash(git remote*), Read, Grep
context:
  branch_comparison: "dynamic"
  commit_history: "analyzed"
  file_changes: "summarized"
  test_coverage: "checked"
---

# /pr - プルリクエスト説明文ジェネレーター

## 目的

現在のブランチとベースブランチを比較して、すべての変更を分析し、包括的なPR説明文を生成します。

## 重要な注意事項

**出力言語**: このコマンドで生成されるPR説明文は、必ず日本語に翻訳してください。テンプレート内の英語のセクション名（Summary, Problem/Motivation, Solution等）や説明文も、すべて日本語に変換して出力します。

## 動的コンテキスト分析

### 現在のブランチ情報

```bash
!`git branch --show-current`
```

### ベースブランチの検出

```bash
!`git symbolic-ref refs/remotes/origin/HEAD | sed 's@^refs/remotes/origin/@@'`
```

### ブランチ比較サマリー

```bash
!`git diff $(git symbolic-ref refs/remotes/origin/HEAD | sed 's@^refs/remotes/origin/@@')...HEAD --stat`
```

### コミット履歴

```bash
!`git log $(git symbolic-ref refs/remotes/origin/HEAD | sed 's@^refs/remotes/origin/@@')..HEAD --oneline`
```

### 変更されたファイル

```bash
!`git diff $(git symbolic-ref refs/remotes/origin/HEAD | sed 's@^refs/remotes/origin/@@')...HEAD --name-only`
```

### 変更統計

```bash
!`git diff $(git symbolic-ref refs/remotes/origin/HEAD | sed 's@^refs/remotes/origin/@@')...HEAD --shortstat`
```

## PR説明文生成プロセス

### 1. 変更分析

#### タイプ分類

主要な変更タイプを判定：

- **機能**: 新しい機能が追加された
- **バグ修正**: 問題が解決された
- **リファクタリング**: コード改善
- **パフォーマンス**: 最適化の変更
- **ドキュメント**: ドキュメント更新
- **雑務**: メンテナンスタスク

#### 影響評価

```bash
# テストファイルの変更をチェック
!`git diff $(git symbolic-ref refs/remotes/origin/HEAD | sed 's@^refs/remotes/origin/@@')...HEAD --name-only | grep -E "(test|spec)" | wc -l`
```

```bash
# 破壊的変更をチェック
!`git diff $(git symbolic-ref refs/remotes/origin/HEAD | sed 's@^refs/remotes/origin/@@')...HEAD | grep -E "^-\s*(export|public|interface)" | head -5`
```

```bash
# 影響を受けるコンポーネント数をカウント
!`git diff $(git symbolic-ref refs/remotes/origin/HEAD | sed 's@^refs/remotes/origin/@@')...HEAD --name-only | xargs -I {} dirname {} | sort -u | wc -l`
```

### 2. コンテンツ構造

以下のセクションでPR説明文を生成：

1. **サマリー**: 高レベルの概要
2. **問題/動機**: なぜこの変更が必要か
3. **解決策**: 何が実装されたか
4. **変更内容**: 詳細な内訳
5. **テスト**: 検証方法
6. **スクリーンショット**: UI変更がある場合
7. **チェックリスト**: レビュー基準
8. **関連**: イシュー/PR

## PR説明文テンプレート

### 包括的テンプレート

```markdown
## プルリクエスト説明文

### サマリー
[すべての変更の1段落概要]

### 問題/動機
[これらの変更が必要な理由]
- イシュー: [該当する場合はイシューへのリンク]
- コンテキスト: [背景情報]
- ゴール: [達成しようとしていること]

### 解決策
[問題がどのように解決されたか]
- アプローチ: [実装戦略]
- 主要な決定: [重要な選択]
- トレードオフ: [もしあれば妥協点]

### 変更内容

#### コア変更
- [ ] [実装された主要機能/修正]
- [ ] [副次的な変更]
- [ ] [追加の改善]

#### ファイル変更サマリー
- **追加**: [作成された新しいファイル]
- **変更**: [更新されたファイル]
- **削除**: [削除されたファイル]

#### 技術的詳細
```text
[コード構造またはアーキテクチャの変更]
```

### テスト

#### テスト方法

1. [ステップバイステップのテスト手順]
2. [期待される動作]
3. [検証すべきエッジケース]

#### テストカバレッジ

- [ ] ユニットテストを追加/更新
- [ ] 統合テストを追加/更新
- [ ] 手動テスト完了
- [ ] エッジケースをテスト

### スクリーンショット/デモ

[該当する場合、スクリーンショットまたはGIFを追加]

#### スクリーンショット

**変更前:**
[画像/説明]

**変更後:**
[画像/説明]

### チェックリスト

- [ ] コードはプロジェクトのスタイルガイドラインに従っている
- [ ] セルフレビュー完了
- [ ] 複雑なロジックにコメントを追加
- [ ] ドキュメントを更新
- [ ] console.logやデバッグコードなし
- [ ] ローカルでテストがパス
- [ ] リントエラーなし
- [ ] 破壊的変更を文書化

### 関連

- Closes #[イシュー番号]
- Related to #[他のイシュー/PR]
- Depends on #[依存PR]

### 推奨ラベル

- `[タイプ]` (feature/bug/refactor)
- `[優先度]` (high/medium/low)
- `[コンポーネント]` (影響を受けるエリア)
- `[レビュー]` (needs-review)

### 簡潔なテンプレート（小さな変更用）

```text
## サマリー
[変更の簡単な説明]

## 変更内容
- [主要な変更1]
- [主要な変更2]
- [主要な変更3]

## テスト
- [ ] テストがパス
- [ ] 手動テスト完了

## 関連
- Fixes #[イシュー]

## 高度な機能

### コミットのグループ化

タイプ別にコミットをグループ化：

```bash
# 機能
!`git log $(git symbolic-ref refs/remotes/origin/HEAD | sed 's@^refs/remotes/origin/@@')..HEAD --oneline | grep -E "^[a-f0-9]+ feat" | head -5`
```

```bash
# 修正
!`git log $(git symbolic-ref refs/remotes/origin/HEAD | sed 's@^refs/remotes/origin/@@')..HEAD --oneline | grep -E "^[a-f0-9]+ fix" | head -5`
```

### 依存関係の変更

```bash
# package.jsonの変更をチェック
!`git diff $(git symbolic-ref refs/remotes/origin/HEAD | sed 's@^refs/remotes/origin/@@')...HEAD -- package.json | grep -E "^[+-]\s+\"" | head -10`
```

### パフォーマンス影響

```bash
# パフォーマンス関連の変更をチェック
!`git diff $(git symbolic-ref refs/remotes/origin/HEAD | sed 's@^refs/remotes/origin/@@')...HEAD | grep -E "(memo|cache|optimize|performance)" | head -5`
```

## 出力フォーマット

```markdown
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PR説明文ジェネレーター

## ブランチ分析
- **現在のブランチ**: [ブランチ名]
- **ベースブランチ**: [ターゲットブランチ]
- **コミット数**: [数]
- **変更ファイル数**: [数]
- **行数**: +[追加] -[削除]

## 変更サマリー
- **タイプ**: [検出されたタイプ]
- **影響を受けるコンポーネント**: [リスト]
- **破壊的変更**: [はい/いいえ]
- **テスト含む**: [はい/いいえ]

## 生成されたPR説明文

### 推奨テンプレート
[GitHub用にフォーマットされた完全なPR説明文]

### 代替フォーマット

#### 詳細バージョン
[すべてのセクションを含む包括的な説明]

#### クイックバージョン
[小さな変更用の簡潔な説明]

## 使用手順

### GitHub Web用
1. 上記の説明をコピー
2. PR作成ページを開く
3. 説明フィールドに貼り付け

### GitHub CLI用
```bash
gh pr create --title "[PRタイトル]" --body "[PR説明]"
```

### Git CLI用

```bash
git push origin [ブランチ名]
# その後、Webインターフェースでプルリクエストを作成
```

## レビュー準備状況

- ✅ すべてのコミットを含む
- ✅ 変更を要約
- ✅ テスト手順を提供
- ✅ 関連イシューをリンク
- ✅ レビューチェックリストを含む

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## スマート検出機能

### イシュー参照の抽出

以下から自動的にイシュー番号を検出：

- コミットメッセージ
- ブランチ名
- ユーザー入力

### 変更パターン認識

一般的なパターンを識別：

- **API変更**: 新しいエンドポイント、変更されたコントラクト
- **UI更新**: コンポーネント変更、スタイル更新
- **データベース**: スキーマ変更、マイグレーション
- **設定**: 環境、ビルド設定

### レビュー複雑度の推定

以下に基づいてレビューアプローチを提案：

- 変更されたファイル数
- 変更されたコード行数
- 影響を受けるコンポーネント数
- テストの存在

## 統合ポイント

### 他のコマンドとの連携

- `/branch`と`/commit`の後に使用
- コードレビューを要求する前に
- `/review`コマンドを補完

### GitHub統合

以下と連携：

- GitHub Issues
- GitHub Projects
- GitHub Actions
- レビュー割り当て

## ベストプラクティス

### レビュアー向け

ハイライト：

- **フォーカスすべき点**: 重要な変更
- **スキップ可能な点**: 生成されたファイル、設定
- **既知の問題**: TODO、将来の改善

### コンテキスト用

含めるべき内容：

- **変更前/後**: UI変更用
- **パフォーマンスメトリクス**: 最適化用
- **エラー例**: バグ修正用
- **API例**: 新しいエンドポイント用

## 使用例

### 基本

```bash
/pr
```

現在のブランチ変更からPR説明文を生成します。

### イシュー参照付き

```bash
/pr "#456"
```

PRを特定のイシューにリンクします。

### カスタムコンテキスト付き

```bash
/pr "このPRはチームミーティングで議論された新しい認証フローを実装します"
```

説明に追加のコンテキストを組み込みます。
