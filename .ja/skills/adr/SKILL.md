---
name: adr
description: MADR形式でアーキテクチャ決定記録（ADR）を自動採番で作成。Use when: ADR作成, 技術決定, アーキテクチャ決定, decision record.
allowed-tools: Read, Write, Edit, Grep, Glob, LS, Bash(mkdir:*), Bash($HOME/.claude/skills/adr/scripts/*), AskUserQuestion
model: opus
argument-hint: "[決定タイトル]"
user-invocable: true
---

# /adr - アーキテクチャ決定記録作成

## 入力

- 決定タイトル: `$1`（「XをYに採用」のような具体的アクション）
- `$1` が空の場合 → AskUserQuestion で選択
- 前提条件: `adr/` ディレクトリ（なければ作成）

### タイトルプロンプト

| 質問     | 選択肢                |
| -------- | --------------------- |
| 決定種別 | 新規決定 / 既存を更新 |

「既存を更新」→ `adr/` 内の最近の ADR を AskUserQuestion で一覧表示。

## 6フェーズプロセス

| フェーズ        | アクション                                                                 |
| --------------- | -------------------------------------------------------------------------- |
| 1. 事前チェック | `./scripts/pre-check.sh "$TITLE"` を実行                                   |
| 2. テンプレート | `./scripts/select-adr-template.sh "$TITLE"` を実行                         |
| 3. 参照         | プロジェクトドキュメント、Issue、外部リソースを収集                        |
| 4. 検証         | ADR 書き出し後に `./scripts/validate-adr.sh "$ADR_FILE"` を実行            |
| 5. インデックス | `./scripts/update-index.sh` で `adr/README.md` を再生成                    |
| 6. リカバリー   | 欠落ディレクトリ、重複、欠落セクションを処理                               |

## テンプレート選択

スクリプトで自動選択:

```bash
TEMPLATE=$(./scripts/select-adr-template.sh "$TITLE")
```

| テンプレート         | ユースケース             | 必須セクション                   |
| -------------------- | ------------------------ | -------------------------------- |
| technology-selection | ライブラリ、FW選択       | オプション（最低3つ）、Pros/Cons |
| architecture-pattern | 構造、設計ポリシー       | コンテキスト、結果               |
| process-change       | ワークフロー、ルール変更 | Before/After比較                 |
| deprecation          | 技術の廃止               | 移行計画、タイムライン           |

## ディレクトリ構造

```text
adr/
├── README.md   # 自動生成インデックス
├── 0001-*.md   # 連番
└── 0002-*.md   # (次の ADR)
```

## ルール

| ルール | 詳細                                                                              |
| ------ | --------------------------------------------------------------------------------- |
| 不変性 | accepted 後は修正禁止。変更したい場合は新しい ADR で superseded にする             |
| 簡潔さ | 目安 ~80 行。Context: 3 行。Options: 各 3-5 行。Consequences: 各 2-3 個の箇条書き |
| 確信度 | メタデータに `- Confidence: {level}. {根拠}` を1行で記載                          |
| 再評価 | 任意で `## 再評価トリガー` セクションを Consequences の後に追加                   |

### 確信度レベル

| レベル | 使用場面                                       |
| ------ | ---------------------------------------------- |
| high   | 全選択肢を評価済み、明確な優位、チーム合意あり |
| medium | 未知の要素あり、本番実績が限定的               |
| low    | 制約下でのベスト推測、重大な不確実性あり       |

## 出力

- `adr/XXXX-slug.md`（ADR ファイル）
- `adr/README.md`（自動生成インデックス）

## 参照

| トピック     | リソース                             |
| ------------ | ------------------------------------ |
| MADR         | `./references/madr-format.md`        |
| Fowler       | `./references/fowler-adr.md`         |
| テンプレート | `./templates/`                       |
| スクリプト   | `./scripts/`                         |
