# Design: Output Verification 自動化

Version: 1.0.0
Status: Design
Created: 2025-12-16
Based on: SOW AC-2.3, Spec FR-008

---

## 1. 概要

コマンド出力を Golden Master と比較し、構造・フォーマット・必須要素の検証を自動化する設計。

### 現状

- [✓] tests/README.md に手動検証チェックリスト存在
- [✓] Golden Master ファイルが golden-masters/ に存在
- [✓] 検証基準が3カテゴリ（構造/フォーマット/コンテンツ）で定義済み
- [→] 自動検証は未実装

### 目標

- [→] 構造比較の自動化（必須セクション存在確認）
- [→] Confidence Markers 使用率の自動検証
- [→] CI/CD（GitHub Actions）での自動実行

---

## 2. 検証アルゴリズム

### 2.1 構造比較ロジック

```typescript
interface StructureValidator {
  // 入力: Markdown文字列
  // 出力: 検証結果
  validate(content: string, schema: OutputSchema): ValidationResult;
}

interface OutputSchema {
  command: string;                    // /fix, /think, /code, etc.
  requiredSections: SectionRule[];    // 必須セクション
  optionalSections: SectionRule[];    // オプションセクション
  confidenceMarkersRequired: boolean; // ✓/→/? 必須か
}

interface SectionRule {
  name: string;          // "## Root Cause", "## Solution"
  pattern: RegExp;       // マッチングパターン
  minOccurrences: number; // 最小出現回数
  children?: SectionRule[]; // ネスト構造
}
```

### 2.2 処理フロー

```text
┌─────────────────────────────────────────────────────────────┐
│ Output Verification Flow                                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. コマンド出力取得                                         │
│       ↓                                                     │
│  2. Markdownパース（セクション抽出）                         │
│       ├─ H2見出し（## ）でセクション分割                    │
│       └─ ネスト構造（H3, H4）も解析                         │
│       ↓                                                     │
│  3. スキーマ検証                                            │
│       ├─ 必須セクション存在確認                             │
│       ├─ セクション順序確認                                  │
│       └─ Confidence Markers カウント                        │
│       ↓                                                     │
│  4. 結果レポート生成                                        │
│       ├─ PASS: 全検証項目クリア                             │
│       ├─ WARN: 非クリティカル項目のみ失敗                   │
│       └─ FAIL: クリティカル項目失敗                         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 2.3 セクション抽出アルゴリズム

```typescript
function extractSections(markdown: string): Section[] {
  const lines = markdown.split('\n');
  const sections: Section[] = [];
  let currentSection: Section | null = null;

  for (const line of lines) {
    // H2見出しを検出
    const h2Match = line.match(/^## (.+)$/);
    if (h2Match) {
      if (currentSection) sections.push(currentSection);
      currentSection = {
        level: 2,
        title: h2Match[1],
        content: [],
        children: []
      };
      continue;
    }

    // H3見出しを検出（子セクション）
    const h3Match = line.match(/^### (.+)$/);
    if (h3Match && currentSection) {
      currentSection.children.push({
        level: 3,
        title: h3Match[1],
        content: []
      });
      continue;
    }

    // コンテンツ追加
    if (currentSection) {
      currentSection.content.push(line);
    }
  }

  if (currentSection) sections.push(currentSection);
  return sections;
}
```

---

## 3. 実装方針

### 3.1 アプローチ選択

| アプローチ | メリット | デメリット | 採用 |
| --- | --- | --- | --- |
| **A: カスタムパーサー** | 軽量、依存少、柔軟 | 開発工数 | ✅ 採用 |
| B: JSON Schema | 標準的、ツール豊富 | Markdown→JSON変換必要 | ❌ |
| C: remark/unified | Markdownパース完備 | 依存追加、学習コスト | ❌ |

**採用理由**:

- 検証対象がMarkdownの構造レベル（セクション存在確認）であり、完全なAST解析は不要
- Node.js/TypeScript依存を避け、シェルスクリプト + grep でも実装可能
- 軽量実装で十分な検証精度を確保可能

### 3.2 実装言語

```text
推奨: TypeScript (Node.js)
理由:
- Claude Codeエコシステムとの親和性
- テスト容易性
- 型安全性

代替: Bash + grep/awk
理由:
- 依存ゼロ
- CI/CD環境での実行容易
```

---

## 4. 代替案検討

### 4.1 案A: カスタムパーサー（採用）

**概要**: 正規表現ベースでMarkdownのセクション構造を抽出・検証

```typescript
// 実装概念
const fixSchema: OutputSchema = {
  command: '/fix',
  requiredSections: [
    { name: 'Root Cause', pattern: /^## .*Root Cause/i },
    { name: 'Solution', pattern: /^## .*Solution/i },
    { name: 'Verification', pattern: /^## .*Verification/i }
  ],
  confidenceMarkersRequired: true
};
```

**メリット**:

- [✓] 軽量、高速
- [✓] カスタマイズ容易
- [✓] 依存関係最小

**デメリット**:

- [→] 複雑なMarkdown構造には対応困難
- [→] エッジケース処理が必要

### 4.2 案B: JSON Schema + Markdown変換（不採用）

**概要**: MarkdownをJSONに変換し、JSON Schemaで検証

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["sections"],
  "properties": {
    "sections": {
      "type": "array",
      "contains": {
        "properties": {
          "title": { "pattern": "Root Cause" }
        }
      }
    }
  }
}
```

**メリット**:

- 標準的な検証ツール（ajv等）使用可能
- スキーマの共有・再利用容易

**デメリット**:

- [?] Markdown→JSON変換の追加処理
- [?] スキーマ定義が複雑化

**不採用理由**: 変換コストに対して得られる利点が少ない

### 4.3 案C: unified/remark（不採用）

**概要**: Markdown ASTを生成し、プログラム的に検証

**メリット**:

- 完全なMarkdown解析
- エコシステム豊富

**デメリット**:

- [?] 依存パッケージ多数
- [?] 学習コスト

**不採用理由**: 過剰な機能、依存関係増加

---

## 5. CI/CD 統合

### 5.1 GitHub Actions 設定

```yaml
# .github/workflows/output-verification.yml
name: Output Verification

on:
  pull_request:
    paths:
      - 'commands/**'
      - 'golden-masters/**'

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Run output verification
        run: npm run verify:outputs

      - name: Upload report
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: verification-report
          path: verification-report.md
```

### 5.2 実行タイミング

| トリガー | 検証対象 | 目的 |
| --- | --- | --- |
| PR作成時 | 変更されたコマンド出力 | 品質ゲート |
| マージ後 | 全コマンド出力 | リグレッション検出 |
| 手動実行 | 指定コマンド | デバッグ |

---

## 6. エラーレポート

### 6.1 出力フォーマット

```markdown
# Output Verification Report

## Summary
- Command: /fix
- Status: ❌ FAIL
- Checked: 2025-12-16T10:30:00Z

## Results

### ✅ Passed (3)
- [✓] Section "Root Cause" exists
- [✓] Section "Solution" exists
- [✓] Markdown syntax valid

### ❌ Failed (2)
- [ ] Section "Verification" missing
  - Expected: ## Verification or ### Phase 3: Verification
  - Found: None

- [ ] Confidence markers insufficient
  - Expected: ≥3 markers (✓/→/?)
  - Found: 1 marker

## Recommendations
1. Add "## Verification" section with test results
2. Add confidence markers to Root Cause and Solution sections
```

### 6.2 エラーコード

| コード | 意味 | 重要度 |
| --- | --- | --- |
| E001 | 必須セクション欠落 | Critical |
| E002 | セクション順序不正 | Warning |
| E003 | Confidence Markers不足 | Warning |
| E004 | Markdown構文エラー | Critical |
| E005 | Golden Master構造不一致 | Warning |

---

## 7. 実装タイムライン

### 調査+設計フェーズ（2-3日）

| 日 | タスク | 成果物 |
| --- | --- | --- |
| 1 | 既存検証基準の詳細調査 | 要件整理ドキュメント |
| 1 | 検証アルゴリズム設計 | この設計ドキュメント |
| 2 | プロトタイプ実装 | verify-output.ts |
| 2 | /fix 出力での検証テスト | テスト結果 |
| 3 | CI/CD設定 | GitHub Actions workflow |
| 3 | ドキュメント更新 | tests/README.md更新 |

---

## 8. 技術的リスク

### 8.1 リスク評価

| リスク | 影響 | 確率 | 緩和策 |
| --- | --- | --- | --- |
| [→] 出力形式のバリエーション | 誤検出増加 | 中 | 柔軟なパターンマッチング |
| [?] パフォーマンス問題 | CI遅延 | 低 | 差分のみ検証 |
| [→] 保守コスト | スキーマ更新漏れ | 中 | コマンド変更時の自動チェック |

### 8.2 緩和策詳細

#### 出力形式バリエーション対応

```typescript
// 厳密マッチではなく、パターンマッチで対応
const sectionPatterns = {
  rootCause: [
    /^## Root Cause/i,
    /^## 根本原因/,
    /^### Phase \d+: Root Cause Analysis/i
  ],
  verification: [
    /^## Verification/i,
    /^## 検証/,
    /^### Phase \d+: Verification/i
  ]
};

function findSection(sections: Section[], patterns: RegExp[]): Section | null {
  for (const pattern of patterns) {
    const found = sections.find(s => pattern.test(s.title));
    if (found) return found;
  }
  return null;
}
```

#### 保守コスト軽減

- コマンドファイル変更時にスキーマ更新を促すPRチェック
- スキーマとコマンドの依存関係をドキュメント化

---

## 9. Success Conditions チェックリスト

Spec FR-008 に基づく:

- [✓] 検証アルゴリズム: 構造比較ロジックの詳細を記載 (Section 2)
- [✓] 実装方針: カスタムパーサー採用と理由 (Section 3)
- [✓] 代替案検討: 3つのアプローチ比較 (Section 4)
- [✓] CI/CD統合: GitHub Actions での実行方法 (Section 5)
- [✓] エラーレポート: 検証失敗時の出力フォーマット定義 (Section 6)
- [✓] 実装タイムライン: 調査+設計で2-3日の計画 (Section 7)
- [✓] 技術的リスク: 複雑さに対する緩和策 (Section 8)

---

## 10. 参照

- Test Strategy: ~/.claude/tests/README.md
- Golden Masters: ~/.claude/golden-masters/
- Verification Checklists: tests/README.md Section "Manual Verification Checklists"
- SOW: ~/.claude/workspace/planning/20251216-175410-workflow-consistency-improvement/sow.md
