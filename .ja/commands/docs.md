---
description: コードベース分析からドキュメントを生成
allowed-tools: [Task, Read, Write, Bash]
model: opus
argument-hint: "<architecture|api|domain|setup>"
dependencies:
  [architecture-analyzer, api-analyzer, domain-analyzer, setup-analyzer]
---

# /docs - ドキュメント生成

コードベースを分析してドキュメントを生成。

## 入力

- 引数: ドキュメントタイプ（必須）
  - `architecture` - Mermaid図付きアーキテクチャ概要
  - `api` - API仕様
  - `domain` - ドメイン用語と関係
  - `setup` - 環境セットアップガイド

## 実行

1. タイプに応じたアナライザーを呼び出し:
   - `architecture` → `architecture-analyzer`
   - `api` → `api-analyzer`
   - `domain` → `domain-analyzer`
   - `setup` → `setup-analyzer`
2. アナライザーが構造化YAMLを返す
3. 対応するテンプレートを読み込み:
   - [@../templates/docs/architecture.md](../templates/docs/architecture.md)
   - [@../templates/docs/api.md](../templates/docs/api.md)
   - [@../templates/docs/domain.md](../templates/docs/domain.md)
   - [@../templates/docs/setup.md](../templates/docs/setup.md)
4. テンプレート構造でYAML出力をフォーマット
5. ユーザーに提示

## 出力

Markdown形式のドキュメント。
