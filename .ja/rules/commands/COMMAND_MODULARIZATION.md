# コマンドモジュール化

認知的シンプルさと保守性を維持するためのコマンドファイルモジュール化ルール。

## ルール

1. **ミラーの法則 (7±2)**: コマンドの責任は7±2以内に収める
2. **薄いラッパーパターン**: メインコマンドファイルは参照のみ、ロジックを持たない
3. **3層アーキテクチャ**: Skills（教育）→ Shared（実装）→ Commands（実行）
4. **参照ベースモジュール化**: 詳細は `references/commands/[command]/` または `skills/*/references/` に配置

## 根拠

ADR 0001/0002から抽出。これらのパターンは認知負荷を軽減し保守性を向上:

- **認知負荷**: 人間のワーキングメモリは7±2項目のみ処理可能（ミラーの法則）
- **保守性**: 単一責任の小さなファイルは更新が容易
- **再利用性**: 共有モジュール（TDD、品質ゲート）を複数コマンドから参照可能
- **テスタビリティ**: 個別モジュールを独立してテスト可能

## 適用タイミング

| 条件                       | アクション                    |
| -------------------------- | ----------------------------- |
| コマンドファイル > 100行   | モジュール化を検討            |
| 責任 > 7                   | **モジュール化必須**          |
| マルチフェーズワークフロー | フェーズモジュールに分割      |
| 共有ロジックが存在         | shared/ または skills/ に抽出 |

## 構造

```text
commands/
└── [command].md              # 薄いラッパー (< 200行)

references/commands/[command]/
├── phase-1.md               # フェーズ固有の詳細
├── phase-2.md
└── completion.md

または

skills/[skill-name]/
├── SKILL.md                 # 教育的コンテンツ
└── references/
    └── [topic].md           # 実装詳細
```

## 例

### Good

**commands/code.md** (89行、薄いラッパー):

```markdown
# /code

...概要...

## フェーズ参照

- Phase 0: [@../skills/generating-tdd-tests/SKILL.md]
- RGRC Cycle: [@../skills/orchestrating-workflows/references/code-workflow.md]
```

**責任数**: 6 (7±2以内)

### Bad

**commands/code.md** (900行、モノリシック):

```markdown
# /code

## すべてを1ファイルに

- 10以上の責任
- TDD知識の重複
- 保守困難
```

**問題点**:

- ミラーの法則違反（10以上の責任）
- DRY違反（重複コンテンツ）
- 個別機能のテストが困難

## チェックリスト

コマンド作成/修正前に:

- [ ] 責任数 ≤ 7
- [ ] メインファイル ≤ 200行
- [ ] 詳細は references/ または skills/ に配置
- [ ] 既存スキルを再利用（DRY）
- [ ] 知識の重複なし

## メトリクス

| メトリクス         | 閾値    | アクション       |
| ------------------ | ------- | ---------------- |
| 責任数             | ≤ 7     | OK               |
|                    | 8-9     | 警告、分割を検討 |
|                    | > 9     | **分割必須**     |
| メインファイル行数 | ≤ 200   | OK               |
|                    | 201-300 | 警告             |
|                    | > 300   | **分割必須**     |

## 関連ADR

- [ADR 0001](../../adr/0001-code-command-responsibility-separation.md) - /code モジュール化決定
- [ADR 0002](../../adr/0002-fix-modularization-and-tdd-commonization.md) - /fix モジュール化とTDD共通化

## 関連原則

- [@../PRINCIPLES_GUIDE.md](../PRINCIPLES_GUIDE.md) - ミラーの法則、SOLID原則
- [@../../skills/applying-code-principles/SKILL.md](../../skills/applying-code-principles/SKILL.md) - コード原則
