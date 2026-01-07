---
description: MADR形式でアーキテクチャ決定記録（ADR）を自動採番で作成
allowed-tools: Read, Write, Bash(ls:*), Bash(cat:*), Bash(~/.claude/skills/creating-adrs/scripts/*), Grep, Glob
model: inherit
argument-hint: "[決定タイトル]"
dependencies: [creating-adrs]
---

# /adr - アーキテクチャ決定記録作成

## 目的

ADR Creator Skillを使用した高品質なアーキテクチャ決定記録の作成コマンド。

**詳細プロセス**: [@../../skills/creating-adrs/SKILL.md]

## 使い方

```bash
/adr "決定タイトル"
```

**例:**

```bash
/adr "TypeScript strictモードを採用"
/adr "認証にAuth.jsを使用"
/adr "モノレポにTurborepoを導入"
```

## 実行フロー（6フェーズ）

### フェーズ1: 事前チェック（自動化）

**スクリプト実行**: `~/.claude/skills/creating-adrs/scripts/pre-check.sh "TITLE"`

```bash
# タイトル検証、重複チェック、ADR番号割り当て
~/.claude/skills/creating-adrs/scripts/pre-check.sh "決定タイトル"
```

スクリプトは後続フェーズ用に `number`、`filename`、`slug`、`date` を含むJSONを出力。
スクリプト失敗時 → 停止してユーザーに問題を報告。

### フェーズ2: テンプレート選択

1. 技術選定 / 2. アーキテクチャパターン / 3. プロセス変更 / 4. デフォルト

決定タイプに基づいて選択。テンプレートは `~/.claude/skills/creating-adrs/assets/` に配置。

### フェーズ3: 情報収集

ユーザーから収集: コンテキスト、オプション、決定結果、影響

### フェーズ4: ADR生成

収集した情報を使用してMADR形式でADRを生成。

### フェーズ5: 検証（自動化）

**スクリプト実行**: `~/.claude/skills/creating-adrs/scripts/validate-adr.sh FILE`

```bash
# 必須セクション、メタデータ、コンテンツ品質を検証
~/.claude/skills/creating-adrs/scripts/validate-adr.sh docs/adr/XXXX-slug.md
```

検証失敗時 → 問題を表示し修正を許可。

### フェーズ6: インデックス更新（自動化）

**スクリプト実行**: `~/.claude/skills/creating-adrs/scripts/update-index.sh`

```bash
# docs/adr/README.mdをすべてのADRで更新
~/.claude/skills/creating-adrs/scripts/update-index.sh docs/adr
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
ADR_DIRECTORY="docs/adr"           # ADR保存場所
ADR_DUPLICATE_THRESHOLD="0.7"      # 重複検出閾値
ADR_AUTO_VALIDATE="true"           # 自動検証
ADR_AUTO_INDEX="true"              # 自動インデックス更新
```

## ベストプラクティス

### タイトルガイドライン

```text
✅ 良い: "状態管理にZustandを採用"
✅ 良い: "ユーザーデータにPostgreSQLへ移行"
❌ 悪い: "状態管理"  (抽象的すぎる)
❌ 悪い: "バグ修正"  (ADRの範囲外)
```

### ステータス管理

- `proposed` → 検討中
- `accepted` → 承認済み
- `deprecated` → 非推奨
- `superseded` → 別のADRに置き換え

## 関連コマンド

- `/rulify <number>` - ADRからプロジェクトルールを生成
- `/research` - ADR作成前の技術調査
- `/think` - 重要な決定前の計画

## エラーハンドリング

### スキルが見つからない場合

```text
⚠️  ADR Creator Skillが見つかりません
通常モード（インタラクティブ）で続行します
```

### 事前チェック失敗

```text
❌ 事前チェックで問題が検出されました
アクション: タイトル変更 / 類似ADRを確認 / 統合を検討
```

## 参照

- [ADR Creator Skill](../skills/creating-adrs/SKILL.md) - 詳細ドキュメント
- [MADR公式サイト](https://adr.github.io/madr/)
