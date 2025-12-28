# SOW: 「エセSpec Kit」統合によるワークフロー改善

Version: 1.0.0
Status: Draft
Created: 2025-12-23

---

## Executive Summary

[→] Zenn記事「Spec駆動開発とカスタムスラッシュコマンドの実践ガイド」の7つのプラクティスを既存Claude Codeワークフローに統合し、コンテキスト効率化とプロンプト品質向上を実現する。現状スコア57/100を80/100以上に改善することを目標とする。

**主要改善領域**:

1. **コンテキスト最小化** (Priority: 🔴 高) - 必須機能を維持しながら冗長な説明を削減
2. **Golden Masters蓄積** (Priority: 🔴 高) - 22ファイル → 50+ファイル
3. **コマンド簡素化** (Priority: 🟡 中) - 機能をサブモジュールに委譲し、コマンド本体をThin Wrapper化
4. **単一責任原則** (Priority: 🟡 中) - `/think`分割、1コマンド1成果物
5. **ツール非依存化** (Priority: 🟢 低) - 長期的な知識ベース移行

**重要な方針**: 行数は「検証指標」であり「目標」ではない。機能を担保した上で冗長性を削減し、結果として行数が減る。

**既存投資の活用**: 85%の既存実装を維持しながら、段階的に改善

---

## Problem Analysis

### Current State [✓]

| カテゴリ | 現在値 | 問題 | 証拠 |
| --- | --- | --- | --- |
| **総合スコア** | 57/100 | 改善余地大 | 7プラクティス評価結果 |
| **コンテキストサイズ** | 2,827行 | S/N比低下 | `/code`参照コンテキスト計測 |
| **最大コマンド行数** | 809行 (`/think`) | 複雑すぎる | `wc -l commands/think.md` |
| **500行超コマンド** | 4個 | 保守性低下 | `/think`, `/research`, `/rulify`, `/fix` |
| **単一責任違反** | 3個 | 責務不明確 | `/think`=2成果物、`/fix`=複雑 |
| **Golden Masters** | 22ファイル | 実例不足 | `find golden-masters/` |

Evidence: 調査結果 (2025-12-16-spec-driven-workflow-improvement.md)

### Verified Issues [✓]

**コンテキスト肥大化**:

- [✓] `/code`の参照コンテキスト: 2,827行 - Evidence: skills/+ rules/+ code/サブモジュール合計
- [✓] `applying-code-principles`スキル: 430行（基礎説明含む） - Evidence: SKILL.md計測
- [✓] 全ルールファイル: 4,161行 - Evidence: `wc -l rules/**/*.md`

**コマンド複雑性**:

- [✓] `/think`: 809行、2成果物同時生成（sow.md + spec.md） - Evidence: commands/think.md
- [✓] `/fix`: 546行、責務多重 - Evidence: commands/fix.md
- [✓] `/research`: 660行 - Evidence: commands/research.md

**Golden Master不足**:

- [✓] 現在22ファイル（基本テンプレートのみ） - Evidence: `find golden-masters/`
- [✓] プロジェクト実例なし - Evidence: ディレクトリ確認

### Inferred Problems [→]

**パフォーマンス影響**:

- [→] 過剰なコンテキストがLLM応答速度を低下させる
- [→] 不要な情報がトークンコストを増加させる（約40-50%の無駄）
- [→] Context ConfusionによりS/N比が低下

**保守性の問題**:

- [→] 809行のコマンドは理解・修正が困難
- [→] 技術的負債が蓄積し、将来の変更コストが増加
- [→] 新規メンバーの学習コストが高い

**品質の不安定性**:

- [→] Golden Master不足により、出力品質が定量化できない
- [→] ベストプラクティスの共有が困難

### Suspected Issues [?]

- [?] コンテキストサイズがLLM性能に影響する具体的な閾値
- [?] コマンド行数の理想的なガイドライン（50行？100行？200行？）
- [?] ツール非依存化のROI（投資対効果）
- [?] チーム導入時の障壁と学習コスト

---

## Assumptions & Prerequisites

### Verified Facts (✓)

**既存実装の強み**:

- [✓] `/code`は既にモジュール分割済み（ADR 0001） - Evidence: commands/code/（6サブモジュール）
- [✓] Golden Masters構造は既に存在 - Evidence: `golden-masters/documents/`
- [✓] TodoWrite統合による進捗管理機能 - Evidence: `/full-cycle.md`、`/test.md`
- [✓] `/validate`によるSOW検証機能 - Evidence: commands/validate.md

**現在の構成**:

- [✓] コマンド総数: 28ファイル - Evidence: `find ~/.claude/commands/`
- [✓] ファイルベースの成果物管理 - Evidence: `workspace/planning/`
- [✓] 優先度ルール（P0-P4）による統制 - Evidence: CLAUDE.md:1-50

### Working Assumptions (→)

**統合可能性**:

- [→] 7つのプラクティスは既存構造と親和性が高い（90%）
- [→] 段階的な改善により既存ワークフローを破壊しない
- [→] コンテキスト削減により応答速度とコストが改善される
- [→] Golden Master手法でプロンプト品質を定量化できる

**実装方針**:

- [→] Phase 1（即効性高）から開始し、効果を検証しながら進める
- [→] 既存のsow.md + spec.md分離は維持（利点あり）
- [→] `/code`のモジュール化パターンを他のコマンドに適用可能

### Unknown/Needs Verification (?)

**測定・評価**:

- [?] コンテキスト削減の効果を測定する具体的な方法
- [?] プロンプト品質改善の定量的指標
- [?] Golden Masterの最適な蓄積数（50？100？）

**実装の詳細**:

- [?] 最適なコマンド行数のガイドライン
- [?] テンプレート外部化のベストプラクティス
- [?] ツール非依存化の実現可能性とコスト

**チーム運用**:

- [?] 新しいワークフローの学習コスト
- [?] 既存プロジェクトへの適用難易度
- [?] チームメンバーの受容性

---

## Solution Design

### Proposed Approach [→]

3段階の段階的改善アプローチを採用。各フェーズで効果を検証し、必要に応じて調整。

#### Phase 1: Quick Wins（即効性が高い）

**工数**: 中（2-3日）| **効果**: 高 | **リスク**: 低 | **Priority**: 🔴 高

**1. コンテキスト最小化**

```markdown
現状: 2,827行
目標: 1,500行以下（40-50%削減）

実装:
- applying-code-principlesから基礎説明を削除
- SOLID、DRY、Occam's Razor等はrules/reference/への参照リンクに置き換え
- CLAUDE.mdで必須原則と参照原則を明確に分離
```

**期待効果**:

- トークン使用量削減 → コスト削減（月間約40-50%）
- 応答速度向上（Context Confusionの軽減）
- プロンプト理解の高速化

**2. Golden Masters蓄積**

```markdown
現状: 22ファイル（基本テンプレートのみ）
目標: 50+ファイル（プロジェクト実例含む）

実装:
- 過去の優れたsow.md/spec.mdを選定してgolden-masters/に追加
- 品質基準ドキュメント（QUALITY_CRITERIA.md）作成
- Anti-patterns集も追加（悪い例から学ぶ）
```

#### Phase 2: Structural Improvements（構造的改善）

**工数**: 高（1-2週間）| **効果**: 中 | **リスク**: 低 | **Priority**: 🟡 中

**3. `/think`コマンドの再設計**

```markdown
現状: 809行、2成果物同時生成
目標: 100行以下のThin Wrapper

オプションA（推奨）: Thin Wrapper化
- /think を /sow → /spec の自動実行に変更
- SlashCommand toolで順次実行
- 既存の809行の詳細はサブモジュールに移行

オプションB（段階的）: 非推奨化
- /think を deprecated としてマーク
- /sow → /spec の順序実行を推奨
- 互換性のため既存 /think は残す
```

**4. コマンド行数の削減**

| コマンド | 現状 | 目標 | アプローチ |
| --- | --- | --- | --- |
| `/fix` | 546行 | 200-300行 | `/code`パターンでサブモジュール分割 |
| `/research` | 660行 | 150-200行 | 詳細をgolden-masters/に移行 |
| `/think` | 809行 | 100行以下 | Thin wrapper化 |
| `/rulify` | 600行 | 200行以下 | テンプレート外部化 |

#### Phase 3: Long-term Improvements（長期的整備）

**工数**: 高（1ヶ月以上）| **効果**: 低 | **リスク**: 中 | **Priority**: 🟢 低

**5. ツール非依存化**

```markdown
現状: プロジェクト知識が .claude/ に集約
目標: docs/principles/ への移行

移行計画:
1. docs/principles/ ディレクトリ作成
2. rules/reference/ の内容をコピー
3. CLAUDE.md を設定ファイルのみに（107行 → 50行以下）
4. プロジェクト固有の知識は docs/ 配下に
```

**注意**: 長期的な目標であり、現時点での優先度は低い。Phase 1-2の効果を見てから判断。

### Alternatives Considered

| Option | Pros | Cons | 評価 |
| --- | --- | --- | --- |
| [→] A: 段階的改善（採用） | 低リスク、互換性維持、効果検証可能 | 時間がかかる | **採用** |
| [→] B: 完全リファクタリング | 一貫性確保、クリーンな構造 | 高リスク、ダウンタイム発生 | 却下 |
| [→] C: 「1仕様=1ファイル」完全採用 | シンプル | 既存の分離設計の利点を失う | 却下 |
| [→] D: 現状維持 | ゼロコスト | 問題が継続 | 却下 |

### Recommendation

**Option A: 段階的改善** - Confidence: [→] 90%

**根拠**:

1. **既存投資の活用**: 85%の実装を再利用
2. **低リスク**: 各フェーズで効果検証、容易なロールバック
3. **互換性維持**: 既存ワークフローを破壊しない
4. **実証主義**: Phase 1の効果を見てPhase 2-3を調整可能

**重要な洞察**:

記事の「1仕様=1ファイル」を完全採用する必要は**ない**。既存のsow.md + spec.md分離には以下の利点がある:

- 責務分離（計画 vs 実装詳細）
- 検証独立性（`/validate`がSOWのみを検証）
- チーム協働（異なる役割が異なるファイルに注目）

記事の核心は「**プロンプトの簡素化**」であり、ファイル統合ではない。

---

## Test Plan

### Unit Tests (Priority: High)

**Golden Master比較**:

- [ ] [✓] Golden Masterとの出力比較テスト
  - 対象: 新規生成されたsow.md、spec.md
  - 基準: sow-spec-reviewer score 80/100以上
  - Evidence: `commands/think.md` 実行結果

**コンテキスト削減後の動作**:

- [ ] [→] コンテキスト削減後の`/code`コマンド動作テスト
  - 検証項目: TDD/RGRCサイクル正常動作
  - 検証項目: 品質ゲート通過
  - Evidence: `/code`実行ログ

**コマンド分割後の動作**:

- [ ] [→] `/sow`単独動作テスト
  - 検証項目: sow.md生成、TodoWrite統合
  - Evidence: 生成ファイル確認
- [ ] [→] `/spec`単独動作テスト
  - 検証項目: spec.md生成、sow.md参照
  - Evidence: 生成ファイル確認

### Integration Tests (Priority: Medium)

**エンドツーエンドフロー**:

- [ ] [→] `/research` → `/sow` → `/spec` → `/code` フロー
  - 検証項目: コンテキストファイル自動ロード
  - 検証項目: 成果物の整合性
  - Evidence: workspace/planning/構造確認

**レビュー統合**:

- [ ] [→] sow-spec-reviewer統合テスト
  - 検証項目: 品質スコアリング正常動作
  - Evidence: レビュー結果ログ

### E2E Tests (Priority: Low)

**完全ワークフロー**:

- [ ] [?] `/full-cycle`での完全フロー
  - 検証項目: すべてのコマンドが正常動作
  - Evidence: 最終成果物確認

**新規プロジェクトセットアップ**:

- [ ] [?] ゼロからのプロジェクト立ち上げ
  - 検証項目: 初期設定の容易さ
  - Evidence: セットアップ時間計測

---

## Acceptance Criteria

### Phase 1-A: コンテキスト最小化

**機能担保の定義**:

`applying-code-principles`の**必須機能**（削除禁止）:

- Quick Decision Questions（4つの判断基準）
- Project Priority Order（原則の優先順位）
- 参照リンク（詳細はrules/reference/へ誘導）

**削減可能な冗長性**:

- SOLID、DRY、Occam's Razor等の詳細説明（Claudeは既にこれらを知っている）
- 重複する概念説明
- 過度な例示

**完了条件**:

- [ ] [✓] `applying-code-principles`が必須機能を100%維持している
  - 検証: Quick Decision Questions、Priority Order、参照リンクの存在確認
- [ ] [→] 冗長な詳細説明が参照リンクに置き換えられている
  - 検証: `rules/reference/`へのリンクが適切に配置されている
- [ ] [→] CLAUDE.mdで必須/参照原則を明確に分離
  - 検証: ドキュメント構造確認
- [ ] [→] `/code`実行時に機能低下がない
  - 検証: TDD/RGRCサイクル、品質ゲートが正常動作

**検証指標**（目標ではなく結果の確認）:

- [→] 行数削減: 機能維持の結果として40-50%程度の削減が見込まれる
- [→] トークン使用量: 冗長性削減の結果として削減が見込まれる
- [?] 応答速度: Context Confusion軽減により改善が見込まれる

### Phase 1-B: Golden Masters蓄積

**完了条件**:

- [ ] [✓] golden-masters/に50+ファイル蓄積（現状: 22ファイル）
  - 内訳: SOW 15+、Spec 15+、Summary 10+、その他 10+
  - 測定: ファイル数
- [ ] [✓] QUALITY_CRITERIA.md作成
  - 内容: スコアリング基準、ベストプラクティス、Anti-patterns
  - 検証: ドキュメント存在確認
- [ ] [→] sow-spec-reviewerでの評価基準確立
  - 基準: 80/100以上を合格ライン
  - 検証: レビュー結果の一貫性

### Phase 2-A: `/think`再設計

**機能担保の定義**:

`/think`の**必須機能**（維持必須）:

- sow.md + spec.mdの両方を生成する
- 研究コンテキストの自動検出
- TodoWrite統合
- 既存の`/think "feature"`という呼び出し方との互換性

**委譲可能な詳細**:

- SOW生成の詳細手順 → `/sow`サブコマンドへ
- Spec生成の詳細手順 → `/spec`サブコマンドへ
- テンプレート → Golden Mastersへの参照

**完了条件**:

- [ ] [✓] `/think`が必須機能を100%維持している
  - 検証: sow.md + spec.md生成、コンテキスト自動検出、TodoWrite統合
- [ ] [→] `/sow`と`/spec`が各々単一成果物を生成
  - 検証: 実行結果確認
- [ ] [→] `/think`本体が詳細をサブコマンドに委譲している
  - 検証: Thin Wrapperとしてオーケストレーションのみ担当
- [ ] [✓] 既存ワークフローとの互換性維持
  - テスト: `/think`実行が同じ成果物を生成
  - 検証: 既存プロジェクトでの動作確認

**検証指標**（目標ではなく結果の確認）:

- [→] `/think`本体の行数: 詳細委譲の結果として大幅削減が見込まれる

### Phase 2-B: コマンド簡素化

**機能担保の定義**:

各コマンドの**必須機能**:

| コマンド | 必須機能（維持必須） |
| --- | --- |
| `/fix` | バグ調査→修正→テストの一連フロー、開発環境での迅速な修正 |
| `/research` | 調査結果の永続化、コンテキスト生成、実装なしの探索 |
| `/rulify` | ADRからルール生成、CLAUDE.md統合 |

**委譲可能な詳細**:

- 詳細な手順説明 → サブモジュール（`/fix/`等）へ
- テンプレート → `golden-masters/`への参照
- 長い例示 → 外部ファイルへ

**完了条件**:

- [ ] [✓] 各コマンドが必須機能を100%維持している
  - 検証: 上記表の機能が正常動作
- [ ] [→] 詳細がサブモジュールまたはgolden-masters/に委譲されている
  - 検証: テンプレートファイル存在確認
- [ ] [→] コマンド本体がオーケストレーション（何をするか）に集中している
  - 検証: 詳細手順（どうやるか）が外部化されている
- [ ] [→] 可読性と保守性の向上
  - 検証: 新規開発者がコマンドの目的を1分以内に理解できる

**検証指標**（目標ではなく結果の確認）:

- [→] 行数: 機能委譲の結果として大幅削減が見込まれる（500行超→適正サイズ）

### Phase 3: ツール非依存化（低優先度）

**完了条件**:

- [ ] [?] docs/principles/ディレクトリ作成
- [ ] [?] rules/reference/の内容をdocs/principles/に移行
- [ ] [?] CLAUDE.mdを50行以下に削減（現状: 107行）

**注意**: Phase 1-2の効果を見てから実施を判断

---

## Implementation Plan

### Phase 1-A: コンテキスト最小化（Day 1-2）

**Day 1: 必須機能の特定と設計**

```markdown
1. applying-code-principlesの機能分析
   - 必須機能の特定:
     ✓ Quick Decision Questions（4つの判断基準）
     ✓ Project Priority Order（原則の優先順位）
     ✓ 参照リンク構造
   - 冗長性の特定:
     → SOLID、DRY、Occam's Razor等の詳細説明（Claudeは既に知っている）
     → 重複する概念説明
2. 参照リンク設計
   - rules/reference/への適切なリンク先確認
   - リンク形式の統一
3. CLAUDE.md改修設計
   - 必須原則（P2 DEFAULT）の明確化
   - 参照原則（P3 CONTEXTUAL）の分離
```

**Day 2: 実装と機能検証**

```markdown
1. applying-code-principles/SKILL.md編集
   - 必須機能を維持（Quick Decision Questions、Priority Order）
   - 冗長な詳細説明を参照リンクに置き換え
2. 機能検証（最重要）
   - /code実行でTDD/RGRCサイクルが正常動作するか確認
   - 品質ゲートが正常に機能するか確認
   - 機能低下がないことを確認
3. 結果確認（参考値）
   - 行数変化を記録（結果の確認として）
   - トークン使用量を記録（結果の確認として）
```

### Phase 1-B: Golden Masters蓄積（Day 2-3）

**Day 2: 既存成果物レビュー**

```markdown
1. 過去のsow.md/spec.mdから優秀な例を選定
   - workspace/planning/配下を検索
   - sow-spec-reviewerで評価（80/100以上）
2. 選定基準の確立
   - 構造の一貫性
   - ✓/→/?マーカーの適切な使用
   - 定量的な現状分析
   - 具体的なAcceptance Criteria
```

**Day 3: 蓄積と文書化**

```markdown
1. golden-masters/への追加
   - documents/sow/に15+ファイル
   - documents/spec/に15+ファイル
   - documents/summary/に10+ファイル
2. QUALITY_CRITERIA.md作成
   - スコアリング基準（構造、マーカー、具体性）
   - ベストプラクティス集
   - Anti-patterns集（悪い例）
```

### Phase 2-A: `/think`再設計（Day 4-6）

**Day 4: `/sow`コマンド独立化**

```markdown
1. 必須機能の抽出
   - /thinkからSOW生成に必要な機能を特定
   - TodoWrite統合機能を維持
   - 研究コンテキスト自動検出を維持
2. commands/sow.md作成
   - 単一成果物（sow.md）生成に特化
   - 必須機能を全て含む
3. 機能検証
   - 単独動作確認
   - 生成ファイルが必須セクションを含むか確認
```

**Day 5: `/spec`コマンド独立化**

```markdown
1. 必須機能の抽出
   - /thinkからSpec生成に必要な機能を特定
   - sow.md自動検出機能を維持
   - Golden Master参照機能を維持
2. commands/spec.md作成
   - 単一成果物（spec.md）生成に特化
   - 必須機能を全て含む
3. 機能検証
   - sow.md → spec.mdフロー確認
   - 成果物の整合性確認
```

**Day 6: `/think`オーケストレーション化**

```markdown
1. commands/think.md改修
   - 必須機能を維持: sow.md + spec.md両方の生成
   - 詳細を/sow → /specに委譲（SlashCommand tool使用）
   - 既存の呼び出し方との互換性維持
2. 機能検証（最重要）
   - /think実行が同じ成果物（sow.md + spec.md）を生成
   - 既存プロジェクトでの動作確認
   - 研究コンテキスト自動検出が機能するか確認
3. 結果確認（参考値）
   - /think本体の行数変化を記録
```

### Phase 2-B: コマンド簡素化（Day 7-10）

**Day 7-8: `/fix`のモジュール分割**

```markdown
1. 必須機能の確認
   - バグ調査→修正→テストの一連フロー
   - 開発環境での迅速な修正
   - 既存の/fix使用方法との互換性
2. /codeパターンの適用
   - fix/ディレクトリ作成
   - 責務別サブモジュール: investigation.md、repair.md、testing.md
   - 各サブモジュールに必要な詳細を移行
3. 機能検証
   - /fix実行でバグ修正フローが正常動作
   - 既存プロジェクトでの動作確認
```

**Day 9: `/research`の簡素化**

```markdown
1. 必須機能の確認
   - 調査結果の永続化
   - コンテキスト生成
   - 実装なしの探索
2. 詳細をgolden-masters/に移行
   - テンプレートを golden-masters/documents/research/ に
   - コマンド本体は手順のオーケストレーションに集中
3. 機能検証
   - /research実行で調査結果が適切に保存される
```

**Day 10: `/rulify`の簡素化**

```markdown
1. 必須機能の確認
   - ADRからルール生成
   - CLAUDE.md統合
2. テンプレート外部化
   - テンプレートを外部ファイルに移行
   - コマンド本体は手順のオーケストレーションに集中
3. 機能検証
   - /rulify実行でルールが正常生成・統合される
```

### Phase 3: ツール非依存化（検討中）

```markdown
Phase 1-2の効果を測定後、実施を判断:
- 効果が十分（トークン40-50%削減、品質維持） → Phase 3は低優先度
- 効果が不十分 → Phase 3を前倒し検討
```

---

## Success Metrics

**Phase 1完了時（Day 3）**:

**機能担保の確認**:

- [✓] `applying-code-principles`の必須機能が維持されている - 検証: Quick Decision Questions、Priority Order存在確認
- [✓] `/code`のTDD/RGRCサイクルが正常動作 - 検証: テスト実行

**品質指標**:

- [✓] Golden Masters 50+ファイル - 測定: `find golden-masters/ -name "*.md" | wc -l`
- [→] 冗長性削減の結果としてコンテキストサイズが減少 - 測定: `wc -l`（結果確認用）
- [→] トークン使用量削減 - 測定: API使用量ログ比較（結果確認用）

**Phase 2完了時（Day 10）**:

**機能担保の確認**:

- [✓] `/think`がsow.md + spec.mdを正常生成 - 検証: 実行テスト
- [✓] `/fix`がバグ修正フローを正常実行 - 検証: 実行テスト
- [✓] 既存ワークフロー互換性維持 - 測定: 既存プロジェクトでのテスト

**品質指標**:

- [→] 詳細委譲の結果としてコマンドサイズが適正化 - 測定: `wc -l commands/*.md`（結果確認用）
- [?] プロンプト品質スコア80/100以上 - 測定: sow-spec-reviewer評価

**総合目標**:

- [→] 現状スコア57/100 → 80/100以上 - 測定: 7プラクティス再評価
- [→] トークンコスト削減 - 測定: 月次コスト比較（機能維持の結果として）
- [?] 新規メンバーの学習時間短縮 - 測定: オンボーディング時間

---

## Risks & Mitigations

### High Confidence Risks (✓)

| Risk | Impact | Probability | Mitigation |
| --- | --- | --- | --- |
| [✓] 既存ワークフロー破壊 | 高 | 中 | 段階的移行、互換性レイヤー、十分なテスト |
| [✓] コンテキスト削減による機能低下 | 中 | 中 | 慎重な必須原則選定、A/Bテスト |
| [✓] Golden Master選定基準の曖昧さ | 低 | 高 | QUALITY_CRITERIA.md作成、sow-spec-reviewer統合 |

**詳細な対策**:

1. **既存ワークフロー破壊の防止**:
   - すべての変更で既存テストを実行
   - `/think`の旧版を`/think-legacy`として残す
   - ロールバック手順を事前に文書化

2. **機能低下の防止**:
   - 削減前後でA/Bテスト実施
   - 品質スコア（sow-spec-reviewer）を継続監視
   - 必須原則の選定は保守的に（削除しすぎない）

3. **品質基準の確立**:
   - QUALITY_CRITERIA.mdで定量的基準を設定
   - sow-spec-reviewerを80/100基準で運用
   - Anti-patterns集で悪い例も明示

### Potential Risks (→)

| Risk | Impact | Probability | Mitigation |
| --- | --- | --- | --- |
| [→] 改善効果の測定困難 | 中 | 中 | Golden Master比較、トークン使用量計測 |
| [→] 学習コスト増加 | 低 | 中 | ドキュメント改善、段階的導入 |
| [→] Phase 2でのSlashCommand tool不具合 | 中 | 低 | 手動フォールバック実装 |

### Unknown Risks (?)

| Risk | Monitoring | Preparation |
| --- | --- | --- |
| [?] LLMバージョン依存性 | 新バージョンでテスト | ロールバック手順 |
| [?] 大規模プロジェクトでのスケーラビリティ | 実運用での監視 | 段階的適用 |
| [?] チーム受容性 | フィードバック収集 | トレーニング資料準備 |

---

## Verification Checklist

**実装開始前の確認**:

- [x] 調査結果レビュー完了
- [ ] 既存ワークフローのバックアップ取得
  - commands/のGitコミット
  - workspace/planning/のバックアップ
- [ ] 各フェーズの成功基準に合意
  - Phase 1: コンテキスト1,500行以下
  - Phase 2: 500行超コマンドゼロ
- [ ] ロールバック手順の確認
  - Gitリバート手順
  - 既存コマンドの復元方法

**Phase 1開始前**:

- [ ] applying-code-principles/SKILL.mdのバックアップ
- [ ] /code実行前のトークン使用量ベースライン取得
- [ ] テストケース準備（入力と期待出力）

**Phase 2開始前**:

- [ ] Phase 1の効果測定完了
  - トークン削減率確認（目標: 40-50%）
  - 品質スコア確認（目標: 低下なし）
- [ ] /sow、/spec実装の承認
- [ ] 既存プロジェクトでの互換性テスト準備

**各Phase完了時**:

- [ ] 成功基準の達成確認
- [ ] ドキュメント更新
- [ ] チームへのフィードバック収集

---

## References

**調査結果**:

- 詳細分析: `~/.claude/workspace/research/2025-12-16-spec-driven-workflow-improvement.md`
- コンテキスト: `~/.claude/workspace/research/2025-12-16-spec-driven-workflow-improvement-context.md`

**元記事**:

- Zenn記事: <https://zenn.dev/mk668a/articles/9ddbb21461a120>

**関連ADR**:

- ADR 0001: `/code`モジュール分割の決定

**既存ドキュメント**:

- CLAUDE.md: 優先度ルール（P0-P4）
- COMMANDS.md: コマンド一覧と使い方
- PRINCIPLES_GUIDE.md: 原則の適用ガイド

**Golden Masters**:

- SOW構造: `~/.claude/golden-masters/documents/sow/example-workflow-improvement.md`
- Spec構造: `~/.claude/golden-masters/documents/spec/example-workflow-improvement.md`
- Summary構造: `~/.claude/golden-masters/documents/summary/example-workflow-improvement.md`
