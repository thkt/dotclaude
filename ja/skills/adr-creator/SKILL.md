---
description: >
  MADR形式で高品質なArchitecture Decision Recordを作成するための構造化プロセス。
  トリガーキーワード: "ADR", "Architecture Decision", "決定記録", "技術選定",
  "アーキテクチャ決定", "design decision", "技術的決定", "設計判断", "create ADR",
  "作成 ADR", "記録 決定", "document decision"。
  事前作成検証、テンプレート選択、参照収集、校正、インデックス更新、再試行メカニズムを持つエラー回復の
  6段階プロセスを提供します。
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

- [ ] 同名のADRが存在しないか
- [ ] 採番が連続しているか
- [ ] `docs/adr/`ディレクトリが存在するか
- [ ] MADRテンプレートが利用可能か

**失敗時の処理**:

- 重複検出 → ユーザーに代替タイトルを提案
- ディレクトリ不在 → 自動作成を提案
- テンプレート不在 → デフォルトテンプレートを使用

---

### Phase 2: テンプレート選択 (Template Selection)

**目的**: 決定の種類に最適なテンプレートを選択

**利用可能なテンプレート**:

1. **technology-selection.md** - 技術選定（ライブラリ、フレームワーク、言語）
2. **architecture-pattern.md** - アーキテクチャパターン（MVC、マイクロサービス等）
3. **default.md** - 汎用テンプレート

**選択基準**:

```markdown
ユーザーの決定が以下に該当する場合:
- "採用する" "選定する" "使用する" → technology-selection
- "パターン" "アーキテクチャ" "設計" → architecture-pattern
- その他 → default
```

**テンプレートの構造**:

```markdown
# [決定のタイトル]

## 状態
[提案中 | 承認済み | 非推奨 | 却下]

## 背景
なぜこの決定が必要か

## 決定内容
何を決定したか

## 根拠
なぜこの決定を行ったか

## 結果
この決定による影響

## メタ情報
- 決定日: YYYY-MM-DD
- 関係者: [@username]
```

---

### Phase 3: 参照元収集 (Reference Collection)

**目的**: 決定に関連するコードやドキュメントを自動収集

**収集対象**:

1. **関連ファイル**: grep検索でキーワードに一致するファイル
2. **関連PR**: GitHub APIで関連するPull Request
3. **関連Issue**: GitHub APIで関連するIssue
4. **既存ADR**: 関連する他のADR

**スクリプト**: `scripts/collect-references.sh`

**実行例**:

```bash
# 「React」に関連する参照を収集
./scripts/collect-references.sh "React"

# 出力:
# - src/components/*.tsx (23 files)
# - PR #145: Migrate to React 18
# - Issue #78: React performance concerns
# - ADR-0003: Choose React for frontend
```

**ADRへの反映**:

```markdown
## 参照
- [PR #145](https://github.com/org/repo/pull/145) - Migrate to React 18
- [Issue #78](https://github.com/org/repo/issues/78) - Performance concerns
- [ADR-0003](./0003-choose-react.md) - 以前の関連決定
```

---

### Phase 4: 校正とチェックリスト (Proofreading & Checklist)

**目的**: ADRの品質を検証

**自動チェック項目**:

- [ ] タイトルは明確か（<80文字）
- [ ] 背景セクションに「なぜ」が記載されているか
- [ ] 決定内容が具体的か
- [ ] 根拠に少なくとも2つの理由があるか
- [ ] 結果セクションで影響を述べているか
- [ ] メタ情報（日付、関係者）が記入されているか

**チェックリストテンプレート**:

使用: `references/impact-analysis.md`

```markdown
## Impact Analysis Checklist

### 技術的影響
- [ ] 既存システムとの互換性
- [ ] パフォーマンスへの影響
- [ ] セキュリティへの影響

### 組織的影響
- [ ] チームのスキルセット
- [ ] 学習コスト
- [ ] サポート体制

### 運用的影響
- [ ] デプロイメントの変更
- [ ] モニタリングの要件
- [ ] ドキュメントの更新
```

---

### Phase 5: インデックス更新 (Index Update)

**目的**: ADRの索引を自動更新

**実行内容**:

1. `docs/adr/README.md`に新しいADRを追加
2. 採番順にソート
3. ステータス（承認済み、却下等）を反映

**自動生成例**:

```markdown
# Architecture Decision Records

## 承認済み
- [ADR-0001](./0001-use-typescript.md) - TypeScriptを採用
- [ADR-0002](./0002-use-react.md) - Reactを採用
- [ADR-0003](./0003-use-postgresql.md) - PostgreSQLを採用

## 提案中
- [ADR-0004](./0004-adopt-microservices.md) - マイクロサービス化

## 却下
- [ADR-0005](./0005-use-mongodb.md) - MongoDB採用（却下）
```

---

### Phase 6: エラー回復と再試行 (Error Recovery & Retry)

**目的**: ファイル作成失敗時に自動回復

**再試行メカニズム**:

- **最大再試行回数**: 3回
- **再試行間隔**: 指数バックオフ（1秒、2秒、4秒）
- **再試行トリガー**:
  - ファイルロック
  - 一時的なネットワークエラー
  - ディレクトリ作成の競合

**失敗時の代替アクション**:

1. **一時ファイルに保存**: `/tmp/adr-draft-{timestamp}.md`
2. **ユーザーに通知**: 「一時ファイルに保存しました。手動で移動してください」
3. **ロールバック**: 部分的な変更を元に戻す

---

## 使用例

### 基本的な使い方

```markdown
ユーザー: 「TypeScript採用のADRを作成して」

ADR Creator Skillがアクティブ化 →

1. Pre-Check: 重複なし ✓
2. Template: technology-selection.md を選択
3. References: TypeScript関連ファイル収集
   - src/**/*.ts (156 files)
   - tsconfig.json
4. Checklist: 品質確認
5. Index: README.md 更新
6. 完了: docs/adr/0023-adopt-typescript.md 作成
```

### 高度な使い方

```markdown
ユーザー: 「マイクロサービス化の決定を記録して、影響分析も含めて」

ADR Creator Skillがアクティブ化 →

1. Template: architecture-pattern.md を選択
2. Checklist: impact-analysis.md を使用
3. References: 関連ADRをリンク
   - ADR-0010: モノリス構成
   - ADR-0015: API Gateway導入
4. 完了: 包括的なADRを生成
```

---

## 統合

### `/adr` コマンドとの連携

`/adr`コマンドは、このスキルを参照してADR作成プロセスを実行します：

```bash
/adr "Adopt GraphQL for API layer"

# 内部で adr-creator skill を呼び出し
# 6段階プロセスを自動実行
```

### `/adr:rule` との連携

作成したADRから、プロジェクトルールを自動生成：

```bash
/adr:rule 23  # ADR-0023からルール生成

# 生成されるファイル:
# docs/rules/0023-typescript-usage.md
# → .claude/CLAUDE.md に自動統合
```

---

## ベストプラクティス

### ADRを書くタイミング

- **技術選定**: 新しいライブラリ、フレームワーク、言語の採用
- **アーキテクチャ変更**: システム設計の大きな変更
- **重要な決定の変更**: 以前の決定を覆す場合
- **規約の確立**: チーム全体のルールを定める場合

### ADRを書かないタイミング

- **日常的なコード変更**: バグ修正、リファクタリング
- **実験的な試み**: POC、スパイク
- **一時的な措置**: ワークアラウンド

### 良いADRの特徴

1. **簡潔**: 1ページ以内
2. **具体的**: 「〜を検討した」ではなく「〜を選択した」
3. **理由付き**: 「なぜ」が明確
4. **トレーサブル**: 参照が充実
5. **更新可能**: 状態が追跡できる

---

## トラブルシューティング

### よくある問題

1. **重複したADR番号**
   - 解決: `scripts/renumber.sh` で再採番

2. **参照収集が遅い**
   - 解決: `.adrignore` で不要なディレクトリを除外

3. **テンプレートが見つからない**
   - 解決: `assets/default.md` をフォールバック

---

## 関連ドキュメント

- [MADRフォーマット仕様](https://adr.github.io/madr/)
- [ADRコマンドリファレンス](/docs/COMMANDS.md#adr)
- [ADR to Ruleコンバーター](/docs/COMMANDS.md#adr-rule)

---

**最終更新**: 2025-11-12
