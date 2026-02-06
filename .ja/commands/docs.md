---
description: コードベース分析からドキュメントを生成
allowed-tools: Read, Write, Task, AskUserQuestion
model: opus
argument-hint: "[architecture|api|domain|setup]"
---

# /docs - ドキュメント生成

コードベースを分析してドキュメントを生成。

## 入力

- ドキュメントタイプ: `$1`（必須）
  - `architecture` - Mermaid図付きアーキテクチャ概要
  - `api` - API仕様
  - `domain` - ドメイン用語と関係
  - `setup` - 環境セットアップガイド
- `$1`が空の場合 → AskUserQuestionでタイプを選択

### タイプ選択

| 質問             | 選択肢                              |
| ---------------- | ----------------------------------- |
| ドキュメント種別 | architecture / api / domain / setup |

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

## フロー

```text
[analyzer YAML] → [template] → [markdown output]
```

## 出力

テンプレート構造でフォーマットされたMarkdown。変数: `{field}`、`{object.property}`、`{array[].property}`

## 検証

| チェック項目                           | 必須 |
| -------------------------------------- | ---- |
| 正しいアナライザー `Task` を呼んだか？ | Yes  |
| テンプレートを出力に適用したか？       | Yes  |
