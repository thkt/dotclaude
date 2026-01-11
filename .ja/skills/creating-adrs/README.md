# ADR作成スキル

MADR形式でアーキテクチャ決定記録 (ADR) を作成。

## 概要

技術的な選択をドキュメント化するため、構造化された形式でアーキテクチャ決定を記録。

## 使い方

```bash
/adr "決定タイトル"
```

## 構造

```text
adr-creator/
├── SKILL.md           # メインスキル定義（6フェーズワークフロー）
├── README.md          # このファイル
├── scripts/           # 自動化スクリプト（/adrコマンドに統合）
│   ├── pre-check.sh       # フェーズ1: 重複チェック、命名検証、採番
│   ├── validate-adr.sh    # フェーズ5: 品質検証
│   └── update-index.sh    # フェーズ6: インデックス更新
├── assets/            # ADRテンプレート
│   ├── technology-selection.md
│   ├── architecture-pattern.md
│   ├── process-change.md
│   └── deprecation.md
└── references/        # チェックリスト
    ├── impact-analysis.md
    ├── test-coverage.md
    └── rollback-plan.md
```

## スクリプト統合

スクリプトは `/adr` コマンドによって自動的に呼び出される:

| フェーズ | スクリプト        | 目的                                             |
| -------- | ----------------- | ------------------------------------------------ |
| 1        | `pre-check.sh`    | タイトル検証、重複チェック、ADR番号割り当て      |
| 5        | `validate-adr.sh` | 必須セクション、メタデータ、コンテンツ品質の検証 |
| 6        | `update-index.sh` | adr/README.mdインデックスの更新                  |

## 出力言語

**ADRは日本語で生成されます。**

テンプレートはMADR標準との互換性のため英語ですが、生成時にコンテンツは日本語に翻訳されます。これはADRが人間が確認するドキュメントであるためです。

## 関連コマンド

- `/adr` - ADR作成（スクリプトを自動呼び出し）
- `/rulify` - ADRからプロジェクトルールを生成

## 詳細

完全なドキュメントは `SKILL.md` を参照。
