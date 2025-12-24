# Claude Code 実践ワークフロー Part 5

## /audit で多角的コードレビューする

> **対象読者**: Claude Code を既に導入している開発チーム

「レビューしたつもりが、見落としがあった…」—— 一人でのレビューには限界があります。この記事では、`/audit` コマンドで **複数の専門エージェント** による多角的なコードレビューを実行する方法を紹介します。

> **Part 1-4 未読の方へ**
>
> - **Part 1**: Commands / Agents / Skills の三層構造
> - **Part 2**: `/research` でコードベースを調査
> - **Part 3**: `/think` で SOW + Spec を生成
> - **Part 4**: `/code` で TDD/RGRC 実装
>
> `/audit` は `/code` で実装したコードを検証し、spec.md との整合性を確認します。

---

## 課題: 一人のレビューでは限界がある

コードレビューで起きがちな問題：

- セキュリティは見たが、アクセシビリティを見落とした
- パフォーマンスは確認したが、型安全性に問題があった
- 「なんとなく良さそう」で終わってしまう

結果、**本番環境で問題が発覚**し、修正コストが増大。

**解決策**: `/audit` で専門エージェントによる並列レビューを実行する。

---

## /audit の役割: 専門家チームによるレビュー

`/audit` は **audit-orchestrator** が複数の専門エージェントを**並列実行**します：

`/audit`

**audit-orchestrator**: レビュー全体を統括

| Phase | 内容 |
|-------|------|
| 1 | コンテキスト分析（git diff, 技術スタック検出） |
| 2 | 並列レビュー実行（専門エージェント群） |
| 3 | 結果統合（信頼度フィルタ、重複排除） |

↓

**並列実行される専門エージェント**:

| エージェント | 対象 |
|-------------|------|
| 🏗️ structure-reviewer | コード構成、DRY違反、結合度 |
| 🔍 root-cause-reviewer | 根本原因分析、アーキテクチャ負債 |
| 📖 readability-reviewer | 可読性、命名、複雑度 |
| 🔷 type-safety-reviewer | 型安全性、any使用 |
| 🧪 testability-reviewer | テスト設計、カバレッジ |
| ⚡ performance-reviewer | ボトルネック、バンドルサイズ |
| ♿ accessibility-reviewer | WCAG準拠、キーボード操作 |
| 🛡️ security-review (skill) | OWASP Top 10、認証問題 |
| 🎨 design-pattern-reviewer | パターン一貫性 |
| 🎯 progressive-enhancer | CSS-first設計、段階的強化 |
| 📄 document-reviewer | README品質、APIドキュメント |

> **Note**: Security review は独立したエージェントではなく、`security-review` skill を通じて実行されます。これにより OWASP Top 10 の知識ベースが参照されます。また、progressive-enhancer は `agents/enhancers/` に配置され、UI/UX改善に特化しています。

**なぜ「並列」が重要か？**

- 順次実行だと 11レビュー × 2分 = 22分
- 並列実行だと 11レビュー = 3-5分
- **4倍以上の高速化**

---

## 信頼度ベースのフィルタリング

レビュー結果には**信頼度スコア**と**マーカー**が付きます：

```text
## ✓ Critical Issues 🚨 (Confidence > 0.9)

Issue #1: SQL Injection 脆弱性
- Marker: [✓] High Confidence
- File: src/api/users.ts:42-45
- Confidence: 0.95
- Evidence: db.query(`SELECT * FROM users WHERE id = ${id}`)
- Impact: 任意のSQLが実行可能、データ漏洩リスク
- Recommendation: プレースホルダを使用
  → db.query('SELECT * FROM users WHERE id = ?', [id])

## → Medium Priority 💡 (Confidence 0.7-0.8)

Issue #2: N+1 クエリの可能性
- Marker: [→] Medium Confidence
- File: src/services/order.ts:78
- Inference: ループ内でDBクエリが実行されている構造から推論
- Note: 実際のパフォーマンス影響は計測が必要
```

### 信頼度の判断基準

| マーカー | 確信度 | 出力に含む？ | 判断基準 |
|---------|--------|------------|----------|
| **✓** | >0.8 | ✅ 必須 | コードで直接確認、file:line で参照可能 |
| **→** | 0.5-0.8 | ✅ 含む | パターンや構造から推論、要検証 |
| **?** | <0.5 | ❌ 除外 | 不確実すぎるため出力しない |

**重要**: 信頼度 0.7 未満の指摘は出力に含まれません。ノイズを減らし、アクションにつながる指摘だけを提示します。

---

## spec.md との整合性検証

`/audit` は自動的に spec.md を検出し、**仕様と実装の乖離**をチェックします：

**Specification vs Implementation 検証**:

| spec.md | 実装 |
|---------|------|
| FR-001: POST /auth/login | ✅ 実装済み |
| FR-002: トークン検証 | ✅ 実装済み |
| FR-003: リフレッシュトークン | ⚠️ 未実装 |
| API: 401 エラーレスポンス | ❌ 形式が仕様と異なる |

### 検証項目

- **機能要件の実装漏れ**: FR-xxx が実装されているか
- **API仕様との乖離**: リクエスト/レスポンス形式の差異
- **エラーハンドリング**: 仕様で定義されたエラーケースの対応
- **テストシナリオ**: spec.md の Test Scenarios との整合性

> **Note**: spec.md がない場合、`/audit` はコード品質のみを分析します。仕様駆動の検証には先に `/think` で spec.md を生成することを推奨。

---

## レビュー戦略: Quick / Standard / Deep

状況に応じて**レビューの深さ**を選択できます：

### Quick Review（2-3分）

```bash
/audit --quick
```

対象：セキュリティ、重大バグ、破壊的変更、アクセシビリティ違反

**使用場面**: PR前の簡易チェック、CI/CDパイプライン

### Standard Review（5-7分）

```bash
/audit
```

対象：Quick + パフォーマンス、型安全性、テストカバレッジ、コード構成

**使用場面**: 通常の開発フロー（デフォルト）

### Deep Review（10分以上）

```bash
/audit --deep
```

対象：Standard + 根本原因分析、技術的負債評価、リファクタリング機会、アーキテクチャ評価

**使用場面**: メジャーリリース前、複雑な機能の完成時

> **Note**: `/research`（Part 3）も Quick / Standard / Deep レベルがありますが、調査とレビューでは処理内容が異なるため所要時間は異なります。

### フォーカスレビュー

特定領域に集中する場合：

```bash
/audit --security      # セキュリティ集中
/audit --performance   # パフォーマンス集中
/audit --accessibility # アクセシビリティ集中
```

---

## 除外ルール: 誤検知を防ぐ

`/audit` は**誤検知（False Positive）**を減らすため、以下を自動除外します：

### 自動除外される指摘

| カテゴリ | 理由 |
|---------|------|
| スタイル問題 | Linter が処理（インデント、フォーマット） |
| 軽微な命名 | 著しく誤解を招く場合を除く |
| テストファイル | 本番コードに集中（明示的に要求された場合を除く） |
| 生成コード | ビルド出力、vendor ファイル |
| 理論的な問題 | 具体的な悪用パスがない場合 |
| マイクロ最適化 | 計測可能な影響がない場合 |

### コンテキスト依存の除外

- **フレームワーク固有パターン**: React/Angular/Vue のイディオム
- **プロジェクト規約**: 既存コードから検出された慣例
- **言語特性**: メモリ安全な言語での不要な警告
- **実行環境**: ブラウザ vs Node.js の差異

---

## 出力フォーマット

```markdown
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 Review Summary

- Files Reviewed: 12 files
- Total Issues: 3 Critical, 5 High, 8 Medium
- Review Coverage: 95%
- Overall Confidence: [✓] 0.85

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## ✓ Critical Issues 🚨
[Issue details with file:line, evidence, recommendation]

## ✓ High Priority ⚠️
[Issue details with confidence markers]

## → Medium Priority 💡
[Inferred issues with verification notes]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📈 Metrics

- Code Quality Score: B+ [✓]
- Technical Debt: ~4 hours [→]
- Test Coverage Gap: 15% [✓]
- Security Posture: Good [✓]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 Recommended Actions

1. **Immediate** [✓]: Critical セキュリティ修正
2. **Next Sprint** [✓/→]: High Priority 項目
3. **Backlog** [→]: 改善提案

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 使い方の具体例

### 例1: 基本レビュー

```bash
/audit
```

→ 変更されたファイルを Standard 深度でレビュー

### 例2: 対象指定レビュー

```bash
/audit "認証モジュール"
```

→ 認証関連のコードに絞ってレビュー

### 例3: セキュリティ監査

```bash
/audit --security --deep
```

→ セキュリティに特化した包括的分析

### 例4: PR前チェック

```bash
/audit --compare main
```

→ main ブランチとの差分をレビュー

---

## 自動タスク作成（TodoWrite連携）

`/audit` は進捗を自動的に TodoWrite に登録します：

**Code Review: [Target]**

| タスク | ステータス |
|--------|-----------|
| Context discovery and scope analysis | ✅ |
| Execute specialized review agents (parallel) | ✅ |
| Filter and validate findings (confidence > 0.7) | ⏳ |
| Consolidate and prioritize results | ⏳ |
| Generate actionable recommendations | ⏳ |

レビュー完了後、発見された問題も TodoWrite に追加され、修正の追跡が可能になります。

---

## Part 1-4 との連携: ワークフロー

```mermaid
flowchart TD
    A[/research] -.-> B[/think]
    B --> C[SOW + spec.md]
    C --> D[/code]
    D --> E[RGRC サイクル完了]
    E --> F[/audit]
    F --> G[spec.md 整合性検証]
    F --> H[11種エージェント並列レビュー]
    F --> I[信頼度フィルタリング]
    G & H & I --> J[指摘対応]
    J --> K[/validate]
```

**レビュー後のアクション**:

| 指摘の種類 | 推奨コマンド |
|-----------|-------------|
| Critical / バグ | `/fix` |
| リファクタリング | `/think` → `/code` |
| テスト不足 | `/test` |

---

## FAQ

### Q: レビューに時間がかかりすぎる場合は？

`--quick` オプションで簡易レビューを実行できます：

```bash
/audit --quick
```

Critical/High のみを検出し、2-3分で完了します。

### Q: 特定のエージェントだけ実行したい場合は？

フォーカスオプションで特定領域に絞れます：

```bash
/audit --security      # セキュリティのみ
/audit --performance   # パフォーマンスのみ
```

### Q: 誤検知が多い場合は？

プロジェクト固有のルールを以下のファイルで設定できます：

| ファイル | 用途 |
|---------|------|
| `.claude/audit-rules.md` | プロジェクト規約（命名ルール、アーキテクチャパターン） |
| `.claude/exclusions.md` | カスタム除外（特定ファイル、パターン） |
| `.claude/audit-focus.md` | 優先領域（重点的にレビューする領域） |

例（exclusions.md）:

```markdown
## Auto-generated files
- dist/**
- build/**

## Third-party libraries
- node_modules/**
```

### Q: CI/CD に組み込みたい場合は？

```yaml
# GitHub Actions 例
- name: Code Review
  run: claude review --security --performance
```

Pre-commit フックにも対応：

```bash
claude review --quick || exit 1
```

### Q: /validate とは何ですか？

`/validate` は `/audit` の後に実行し、**SOW（計画書）との適合性を検証**するコマンドです：

| 検証項目 | 内容 |
|---------|------|
| 受け入れ基準 | SOW で定義した完了条件を満たしているか |
| 機能要件 | spec.md の FR-xxx がすべて実装されているか |
| テストカバレッジ | 品質基準を満たしているか |

```bash
/validate  # SOW に対する実装の適合性を検証
```

> **Note**: `/audit` がコード品質を検証するのに対し、`/validate` は計画との整合性を検証します。

---

## 次回予告

**Part 6: 横断的関心事 - PRE_TASK_CHECK で理解確認する**

全コマンドに共通する「理解確認」の仕組み、95%ルール、Impact Simulation について紹介します。

---

## リポジトリ

設定ファイルの全体はこちらで公開しています。

**GitHub**: <https://github.com/thkt/claude-config>

---

*Claude Code 実践ワークフロー シリーズ*

- [Part 1: 三層設計](./part1-three-layer-architecture.md)
- [Part 2: 調査フェーズ（/research）](./part2-research-investigation.md)
- [Part 3: 計画フェーズ（/think）](./part3-think-sow-spec.md)
- [Part 4: 実装フェーズ（/code）](./part4-code-implementation.md)
- **Part 5: 品質フェーズ（/audit）** ← 今回
- [Part 6: 横断的関心事（PRE_TASK_CHECK）](./part6-pre-task-check.md)
