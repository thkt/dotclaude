# Claude Code コマンドテスト戦略

## 概要

ゴールデンマスター手法を用いたコマンド出力の品質検証基盤。

## ゴールデンマスター手法とは

期待される出力のサンプル（ゴールデンマスター）と実際の出力を比較し、構造・必須セクション・フォーマットの整合性を検証する手法。

### メリット

- **再現性**: 期待出力が明確に定義される
- **回帰検出**: 変更による品質低下を検出
- **文書化**: 期待動作がサンプルとして残る

### 制限事項

- 動的コンテンツ（タイムスタンプ、ファイルパス等）は検証困難
- 完全一致ではなく構造・セクション単位での検証が現実的

## ディレクトリ構造

```text
~/.claude/tests/
├── README.md                 # このファイル
├── golden-masters/           # 期待出力サンプル
│   ├── fix-output.md         # /fix の期待出力例
│   ├── think-sow.md          # /think の SOW 出力例
│   └── think-spec.md         # /think の Spec 出力例
└── scenarios/                # テストシナリオ
    ├── fix-simple-bug.md     # シンプルなバグ修正シナリオ
    └── code-new-feature.md   # 新機能実装シナリオ
```

## 検証観点

### 1. 構造検証

- [ ] 必須セクションがすべて存在するか
- [ ] セクション順序が正しいか
- [ ] ネスト構造が適切か

### 2. フォーマット検証

- [ ] Markdown 構文が正しいか
- [ ] コードブロックが適切に閉じられているか
- [ ] リンクが有効か

### 3. 内容検証

- [ ] 信頼度マーカー（✓/→/?）が適切に使用されているか
- [ ] 具体的な値（ファイルパス、行番号）が含まれているか
- [ ] 推奨アクションが明確か

## 手動検証チェックリスト

### /fix 出力検証

```markdown
□ Specification Context セクションが存在（新規追加）
□ Phase 0.5: Deep Root Cause Analysis が存在
□ Root Cause が特定されている
□ Fix が実装されている
□ Test が実行されている
□ 信頼度マーカー（✓/→/?）が適切
```

### /hotfix 出力検証

```markdown
□ Safety Checks セクションが存在
□ Specification Reference (Quick Check) が存在（新規追加）
□ Triage (5 min) が実行されている
□ Fix (15 min) が実行されている
□ Test (10 min) が実行されている
□ 緊急対応の観点が維持されている
```

### /think 出力検証

```markdown
□ SOW と Spec が両方生成される
□ Executive Summary が明確
□ Problem Analysis に信頼度マーカーがある
□ Assumptions & Prerequisites セクションがある
□ Acceptance Criteria が明確
□ Implementation Plan が具体的
□ Risks & Mitigations が記載されている
```

### /code 出力検証

```markdown
□ Specification Context が参照されている
□ RGRC サイクルが実行されている
□ Quality Check Results が表示されている
□ Definition of Done が満たされている
```

## 将来の自動化方針

### Phase 1: 構造検証の自動化

- JSON Schema ベースのセクション検証
- 必須セクションの存在チェック
- ネスト構造の検証

```typescript
// 将来の実装イメージ
interface SectionValidator {
  requiredSections: string[];
  optionalSections: string[];
  validateStructure(content: string): ValidationResult;
}
```

### Phase 2: フォーマット検証の自動化

- markdownlint によるフォーマットチェック
- コードブロック検証
- リンク検証

### Phase 3: CI/CD 統合

- GitHub Actions でのコマンド出力検証
- Pull Request での自動チェック
- レポート生成

## 関連ドキュメント

- [SOW/Spec テンプレート](../workspace/sow/)
- [コマンドリファレンス](../docs/COMMANDS.md)
- [ドキュメントルール](../docs/DOCUMENTATION_RULES.md)

---

*Last updated: 2025-12-16*
