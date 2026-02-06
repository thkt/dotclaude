---
name: web-design-guidelines
description: >
  Web Interface Guidelinesへの準拠をUIコードでレビューする。
  "UIをレビューして", "アクセシビリティチェック", "デザイン監査", "UXレビュー",
  "ベストプラクティスに照らしてチェック" と依頼された時に使用。
allowed-tools: [Read, Glob, WebFetch]
user-invocable: false
---

# Web Interface Guidelines

Web Interface Guidelinesへのファイル準拠をレビューする。

## 仕組み

1. 以下のソースURLから最新のガイドラインを取得
2. 指定されたファイルを読み込む（またはユーザーにファイル/パターンを確認）
3. 取得したガイドラインの全ルールに照らしてチェック
4. 簡潔な `file:line` 形式で検出結果を出力

## ガイドラインソース

各レビュー前に最新のガイドラインを取得:

```text
https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md
```

WebFetchを使用して最新ルールを取得する。取得したコンテンツには全ルールと出力形式の指示が含まれている。

## 使用方法

ユーザーがファイルまたはパターン引数を提供した場合:

1. 上記ソースURLからガイドラインを取得
2. 指定されたファイルを読み込む
3. 取得したガイドラインの全ルールを適用
4. ガイドラインで指定された形式で検出結果を出力

ファイルが指定されていない場合、レビュー対象のファイルをユーザーに確認する。
