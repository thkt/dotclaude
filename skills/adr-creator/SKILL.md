---
name: adr-creator
description: >
  Structured process for creating high-quality Architecture Decision Records in MADR format.
  Triggers on keywords: "ADR", "Architecture Decision", "決定記録", "技術選定",
  "アーキテクチャ決定", "design decision", "技術的決定", "設計判断", "create ADR",
  "作成 ADR", "記録 決定", "document decision".
  Provides 6-phase process: pre-creation validation, template selection, reference collection,
  proofreading, index update, and error recovery with retry mechanisms.
allowed-tools: Read, Write, Edit, Grep, Glob, Bash, Task
---

# ADR Creator - 構造化ADR作成プロセス

## 目的

MADR形式のArchitecture Decision Recordを、検証・収集・生成・確認の4段階プロセスで作成し、ドキュメント品質を保証する。

## 実行フロー

### Phase 1: 作成前検証 (Pre-Creation Check)

**目的**: 重複や不整合を事前に防ぐ

**実行内容**:

1. 既存ADRの重複チェック
2. 命名規則の検証
3. 日付・バージョン整合性確認
4. ディレクトリ構造の検証

**スクリプト**: `scripts/pre-check.sh`

**チェック項目**:

```bash
# 1. 既存ADR重複チェック
- タイトルの類似度チェック（Levenshtein距離 < 3で警告）
- 同一技術・パターンの既存ADR検索
- 関連するsuperseded ADRの確認

# 2. 命名規則検証
- タイトル長: 5-64文字
- 使用禁止文字チェック（/:*?"<>|）
- Slug生成可能性確認

# 3. 日付・バージョン整合性
- 作成日 ≤ 現在日
- プロジェクトバージョンとの整合性
- タイムゾーン確認

# 4. ディレクトリ構造
- docs/adr/ 存在確認
- 書き込み権限確認
- 採番ルール確認（0001-9999）
```

**出力例**:

```text
🔍 ADR作成前チェック

✅ 重複チェック: 類似ADRなし
✅ 命名規則: OK
✅ 日付整合性: OK
⚠️  警告: ADR-0015 が関連する可能性（"Adopt React for UI"）
   → 関連性を確認してください

✅ 作成可能です
次の番号: 0023
```

### Phase 2: テンプレート選択とセクション構成

**目的**: ADRの種類に応じた適切な構成を選択

**テンプレート種類**:

| テンプレート | 用途 | セクション特性 |
|-------------|------|---------------|
| technology-selection | 技術・ライブラリ選定 | Alternatives比較重視 |
| architecture-pattern | アーキテクチャパターン | Context詳細・Consequences分析 |
| process-change | 開発プロセス変更 | Decision Drivers詳細 |
| deprecation | 既存技術の非推奨化 | Migration Plan必須 |

**選択プロセス**:

```text
📋 ADRテンプレート選択

この決定はどの分類に該当しますか？

1. 技術選定（ライブラリ、フレームワーク、言語）
2. アーキテクチャパターン（構造、設計方針）
3. プロセス変更（ワークフロー、ルール）
4. 非推奨化（既存技術の廃止）

選択 > 1

✅ テンプレート: technology-selection.md
必須セクション:
- Context and Problem Statement
- Considered Options (最低3つ推奨)
- Pros and Cons of the Options
- Decision Outcome
- Confirmation (実装検証方法)
```

### Phase 3: 参照元の収集 (Reference Collection)

**目的**: 決定の根拠となる情報を体系的に収集

**スクリプト**: `scripts/collect-references.sh`

**収集対象**:

```bash
# 1. プロジェクトドキュメント
- README.md の関連セクション
- docs/ 配下の仕様書
- CHANGELOG.md の関連エントリ

# 2. Issue Tracker
- GitHub Issues（該当ラベル: architecture, decision）
- 関連する議論スレッド
- 決定に至った経緯

# 3. Pull Requests
- 関連する実装PR
- レビューコメント
- パフォーマンス計測結果

# 4. 外部リソース
- 公式ドキュメント
- ベンチマーク結果
- コミュニティの評価
```

**出力形式**:

```markdown
## 参照元（自動収集）

### プロジェクト内
- [README.md#技術スタック](../README.md#tech-stack)
- [仕様書: 状態管理要件](../docs/requirements/state-management.md)

### Issue・PR
- [Issue #145: 状態管理ライブラリの選定](https://github.com/org/repo/issues/145)
- [PR #167: Zustand POC実装](https://github.com/org/repo/pull/167)

### 外部リソース
- [Zustand公式ドキュメント](https://github.com/pmndrs/zustand)
- [State of JS 2024: State Management](https://stateofjs.com/...)
- [ベンチマーク結果](https://npmtrends.com/zustand-vs-redux)
```

**実装方法**:

```bash
#!/bin/bash
# scripts/collect-references.sh

KEYWORD="$1"  # 例: "zustand" "state management"

# GitHub Issues検索（gh CLI使用）
echo "### Issue・PR"
gh issue list --search "$KEYWORD" --state all --limit 5 \
  --json number,title,url \
  --jq '.[] | "- [Issue #\(.number): \(.title)](\(.url))"'

# プロジェクト内grep
echo "### プロジェクト内"
rg -l "$KEYWORD" docs/ README.md 2>/dev/null | while read file; do
  echo "- [$file]($file)"
done
```

### Phase 4: 校正・検証チェックリスト

**目的**: ADR完成後の品質保証

**スクリプト**: `scripts/validate-adr.sh`

**検証項目**:

#### 4-1. 影響範囲分析

```markdown
# references/impact-analysis.md

## 影響範囲チェックリスト

### コードベース
- [ ] 影響を受けるファイル数を特定（予想: ___個）
- [ ] 変更が必要なモジュール一覧
- [ ] 破壊的変更の有無
- [ ] 互換性レイヤーの必要性

### 依存関係
- [ ] package.json更新の必要性
- [ ] 依存ライブラリとの競合確認
- [ ] バージョン制約の確認

### チーム
- [ ] 影響を受けるチームメンバー数
- [ ] 学習コスト見積もり（___時間/人）
- [ ] ドキュメント更新タスク
```

#### 4-2. テストカバレッジ

```markdown
# references/test-coverage.md

## テスト更新チェックリスト

- [ ] 既存テストの更新範囲特定
- [ ] 新規テストの必要性（推定: ___個）
- [ ] E2Eテストへの影響
- [ ] パフォーマンステスト要否
- [ ] 回帰テスト計画
```

#### 4-3. ロールバック計画

```markdown
# references/rollback-plan.md

## ロールバック計画チェックリスト

### 準備
- [ ] ロールバック手順書作成
- [ ] バックアップ対象の特定
- [ ] 切り戻しトリガー定義

### 検証
- [ ] ロールバック所要時間見積もり（___分）
- [ ] データ整合性の確保方法
- [ ] 部分適用/段階的ロールバックの可否
```

**検証スクリプト実行例**:

```bash
# scripts/validate-adr.sh 0023-adopt-zustand.md

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ADR検証レポート: 0023-adopt-zustand.md
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ 必須セクション: 完備
✅ MADR形式: 準拠
⚠️  警告: Confirmation セクションが空白
⚠️  警告: 参照元が2件のみ（推奨: 3件以上）

📊 チェックリスト進捗:
  影響範囲分析: 3/5 完了
  テスト更新: 0/5 未着手  ← 要対応
  ロールバック計画: 2/3 完了

推奨: テスト更新チェックリストを完了してください
```

### Phase 5: 索引更新・リンク生成

**目的**: ADR間の関連性を可視化し、発見性を向上

**スクリプト**: `scripts/update-index.sh`

**実行内容**:

#### 5-1. ADR一覧の自動生成

```bash
# docs/adr/README.md 自動更新

## Architecture Decision Records

| 番号 | タイトル | ステータス | 日付 |
|-----|---------|----------|------|
| [0023](0023-adopt-zustand.md) | Adopt Zustand for State Management | proposed | 2025-10-21 |
| [0022](0022-migration-turborepo.md) | Migrate to Turborepo | accepted | 2025-10-15 |
| [0021](0021-typescript-strict.md) | Enable TypeScript Strict Mode | accepted | 2025-10-10 |

### ステータス別
- **Proposed**: 0023
- **Accepted**: 0015, 0016, 0021, 0022
- **Deprecated**: 0008
- **Superseded**: 0003 → 0021
```

#### 5-2. 関連ADRの相互リンク

```markdown
# ADR-0023内に自動追加

## Related ADRs

### Depends On
- [ADR-0015: Adopt React for UI](0015-adopt-react-for-ui.md) - 状態管理の前提

### Related
- [ADR-0021: TypeScript Strict Mode](0021-typescript-strict.md) - 型安全性の強化

### May Supersede
- [ADR-0008: Use Redux for State](0008-use-redux-for-state.md) - 将来的に置き換え
```

**リンク生成アルゴリズム**:

```bash
# キーワードベースの関連性検出
KEYWORDS=$(extract_keywords "$ADR_FILE")  # "zustand", "state", "react"

# 既存ADRから関連度スコア算出
for existing_adr in docs/adr/*.md; do
  score=$(calculate_relevance "$KEYWORDS" "$existing_adr")
  if [ $score -gt 3 ]; then
    echo "Related: $existing_adr (score: $score)"
  fi
done
```

### Phase 6: 失敗時の再試行手順

**目的**: エラー時の自動復旧と明確なガイダンス

**エラーパターンと対処**:

#### 6-1. パス解決エラー

```text
❌ Error: Cannot create docs/adr/0023-adopt-zustand.md
   Reason: Relative path resolution failed

🔧 自動修正試行:
1. 相対パス → 絶対パス変換
   Before: docs/adr/
   After:  /Users/user/project/docs/adr/

2. ディレクトリ作成試行
   mkdir -p /Users/user/project/docs/adr/

3. 再実行中...
```

#### 6-2. テンプレート選択失敗

```text
❌ Error: 選択したテンプレートが見つかりません
   Template: technology-selection.md
   Path: .claude/skills/adr-creator/assets/

🔧 フォールバック:
1. デフォルトテンプレート使用
2. カスタムテンプレートの提案
   - 類似のADRから構造抽出
   - MADRミニマル構成で開始

選択 > 1 (デフォルト)

✅ デフォルトテンプレートで続行
```

#### 6-3. 参照元収集失敗

```text
⚠️  Warning: GitHub Issues収集失敗
   Reason: gh CLI not authenticated

🔧 代替手段:
1. ローカルファイルのみ検索（続行可能）
2. 手動で参照元を入力
3. あとで追加（ADR作成後に編集）

選択 > 1

✅ ローカル参照元のみで続行
   プロジェクト内: 3件検出
   外部リンク: 手動入力が必要
```

## 使用方法

### 基本的な呼び出し

```bash
# /adrコマンドがこのskillを自動的に使用
/adr "Adopt Zustand for State Management"
```

### スキルの動作フロー

```text
1. Pre-Check実行（自動）
   ↓
2. テンプレート選択（対話）
   ↓
3. 参照元収集（自動 + 手動補完）
   ↓
4. 情報入力（対話）
   ↓
5. ADR生成
   ↓
6. 検証実行（自動）
   ↓
7. チェックリスト提示（確認）
   ↓
8. 索引更新（自動）
   ↓
9. 完了
```

## 設定オプション

### SKILL.md frontmatter拡張

```yaml
---
# 既存設定
name: ADR Creator
description: 構造化されたプロセスで高品質なArchitecture Decision Recordを作成

# 追加設定
config:
  strict_mode: true              # 全チェックリスト必須
  auto_collect_references: true  # 参照元自動収集
  template_fallback: minimal     # テンプレート失敗時の動作
  index_auto_update: true        # 索引自動更新
  duplicate_threshold: 0.7       # 重複判定の類似度閾値（0-1）
---
```

## 段階的導入計画

### Phase 1 (即座に実装可能)

- ✅ pre-check.sh: 重複・命名規則チェック
- ✅ テンプレート選択UI
- ✅ 基本的な索引更新

### Phase 2 (1週間以内)

- ⏳ collect-references.sh: GitHub連携
- ⏳ validate-adr.sh: 完成度検証
- ⏳ チェックリストテンプレート

### Phase 3 (2週間以内)

- ⏳ 関連ADR自動リンク
- ⏳ エラーハンドリング拡充
- ⏳ 統計情報ダッシュボード

## トラブルシューティング

### Q: スクリプトが実行されない

```bash
# 実行権限の付与
chmod +x .claude/skills/adr-creator/scripts/*.sh
```

### Q: GitHub連携が動かない

```bash
# gh CLI認証確認
gh auth status

# 未認証の場合
gh auth login
```

### Q: テンプレートをカスタマイズしたい

```bash
# プロジェクト固有テンプレート配置
.claude/skills/adr-creator/assets/custom-template.md

# ADR作成時に選択肢に表示される
```

## 関連ドキュメント

- [MADR公式サイト](https://adr.github.io/madr/)
- [ADRツール比較](https://adr.github.io/tooling/)
- [Zenn記事: Claude Agent Skills](https://zenn.dev/explaza/articles/b3dde4451aa249)
