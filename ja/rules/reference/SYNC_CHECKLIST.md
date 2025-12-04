# Rules/Reference 同期チェックリスト

## rules/reference/ を更新した場合

### 必須更新

- [ ] 同ファイルの日本語版（ja/rules/reference/）を更新
- [ ] skills/code-principles/SKILL.md の該当セクションを確認

### 確認項目

| Reference File | SKILL.md Section | 確認事項 |
|----------------|------------------|----------|
| SOLID.md | "1. SOLID Principles" | サマリーが一致 |
| DRY.md | "2. DRY" | コア概念が一致 |
| OCCAMS_RAZOR.md | "3. Occam's Razor" | 決定基準が一致 |
| MILLERS_LAW.md | "4. Miller's Law" | 数値制限が一致 |
| YAGNI.md | "5. YAGNI" | 判断基準が一致 |

### 更新手順

1. reference/ファイルを更新
2. ja/reference/を同期
3. SKILL.mdのサマリーを確認
4. 矛盾があれば調整（referenceが正典）

### DRY原則との整合性

**意図的な構造**:

- `rules/reference/`: 詳細な正典（単一真実源）
- `SKILL.md`: 統合サマリー（参照リンク付き）

この階層構造はDRY違反ではなく、
異なる抽象度レベルでの知識表現として設計されています。

## 関連ドキュメント

- [DOCUMENTATION_RULES.md](../../docs/DOCUMENTATION_RULES.md) - ドキュメント管理ルール
- [code-principles SKILL](../../skills/code-principles/SKILL.md) - 原則スキル
