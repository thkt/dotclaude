---
description: MADR形式でArchitecture Decision Recordを作成（自動採番、docs/adr/に保存）
allowed-tools: Read, Write, Bash(ls:*), Bash(find:*), Bash(cat:*), Grep, Glob
model: inherit
argument-hint: "[決定タイトル]"
---

# /adr - Architecture Decision Record 作成

## 目的

ADR Creator Skillを使用した高品質なArchitecture Decision Record作成コマンド。

**詳細プロセス**: [@~/.claude/ja/skills/creating-adrs/SKILL.md]

## 使用方法

```bash
/adr "決定タイトル"
```

**例:**

```bash
/adr "TypeScript strict modeの採用"
/adr "認証にAuth.jsを使用"
/adr "モノレポにTurborepoを導入"
```

## 実行フロー（6フェーズ）

```text
Phase 1: Pre-Check（作成前検証）
  ├─ 重複チェック、命名規則、ADR番号採番
  ↓
Phase 2: テンプレート選択
  ├─ 1. 技術選定 / 2. アーキテクチャパターン / 3. プロセス変更 / 4. デフォルト
  ↓
Phase 3: 情報収集
  ├─ 背景、オプション、決定内容、影響
  ↓
Phase 4: ADR生成
  ├─ MADR形式で生成、日本語見出し
  ↓
Phase 5: 検証
  ├─ 必須セクション、形式、品質チェック
  ↓
Phase 6: 索引更新
  └─ docs/adr/README.md 自動更新
```

## 出力

```text
docs/adr/
├── README.md              (自動更新)
├── 0001-initial-tech.md
├── 0002-adopt-react.md
└── 0023-your-new-adr.md   (新規作成)
```

## 設定

環境変数でカスタマイズ可能:

```bash
ADR_DIRECTORY="docs/adr"           # ADR保存先
ADR_DUPLICATE_THRESHOLD="0.7"      # 重複判定閾値
ADR_AUTO_VALIDATE="true"           # 自動検証
ADR_AUTO_INDEX="true"              # 自動索引更新
```

## ベストプラクティス

### タイトルの付け方

```text
✅ 良い例: "状態管理にZustandを採用"
✅ 良い例: "ユーザーデータにPostgreSQLへ移行"
❌ 悪い例: "状態管理"  (抽象的すぎる)
❌ 悪い例: "バグ修正"  (ADRの対象外)
```

### ステータス管理

- `proposed` → 検討中
- `accepted` → 承認済み
- `deprecated` → 非推奨
- `superseded` → 別ADRに置き換え

## 関連コマンド

- `/adr:rule <番号>` - ADRからプロジェクトルールを生成
- `/research` - ADR作成前の技術調査
- `/think` - 重大な決定の前の計画策定

## エラー処理

### Skillが見つからない場合

```text
⚠️  ADR Creator Skillが見つかりません
通常モード（対話形式）で続行します
```

### Pre-Check失敗時

```text
❌ Pre-Checkで問題が検出されました
対処: タイトル変更 / 類似ADR確認 / 統合検討
```

## 参照

- [ADR Creator Skill](~/.claude/ja/skills/creating-adrs/SKILL.md) - 詳細ドキュメント
- [MADR公式サイト](https://adr.github.io/madr/)
