---
name: find-docs
description: 公式ドキュメントURLから最新の技術ドキュメント、APIリファレンス、設定詳細、
  コード例を取得する。外部技術を扱う技術的な質問やコード作成時に使用する。
  対象はライブラリ、フレームワーク、プログラミング言語、SDK、API、CLIツール、
  クラウドサービス、インフラツール、開発プラットフォーム。
  主なシナリオはAPIエンドポイント、クラス、関数、メソッドパラメータの参照、
  設定オプションやCLIコマンドの確認、
  「どうやって」系の技術質問への回答、
  特定のライブラリやサービスを使うコード生成、
  フレームワーク、SDK、APIに関するデバッグ、
  セットアップ手順、例、移行ガイドの取得、
  バージョン固有の動作や破壊的変更の確認。
  ドキュメントの正確性が重要な場合やモデルの知識が古い可能性がある場合に
  優先して使用する。
allowed-tools: Bash(scout:*)
argument-hint: "[ライブラリ/フレームワーク] [トピックや質問]"
user-invocable: true
---

# ドキュメント検索

`scout research` または `scout fetch` を使用して最新のドキュメントを取得する。ネットワークに送信されるのはURLのみ — クエリ文字列やコード内容は外部に送信されない。

## 基本: scout research

検索、取得、コンパイルを1コマンドで実行:

```bash
scout research "<ライブラリ> <トピック>"
```

例:

```bash
scout research "react useEffect cleanup async"
scout research "next.js app router middleware authentication"
scout research "prisma one-to-many relations cascade delete"
scout research "vitest mock module dependencies"
```

デフォルトはこのパスを使用する。ライブラリの発見とページ取得を1ステップで処理する。

## 代替: scout fetch

### 使用する場面

- ユーザーが特定のドキュメントURLを提供した場合
- 同じ会話内の以前のfetchで正確なページがわかっている場合

```bash
scout fetch "https://react.dev/reference/react/useEffect"
scout fetch "https://nextjs.org/docs/app/building-your-application/routing"
```

## ガイドライン

- 1つの質問につき3ページまで
- ブログや個人チュートリアルより公式ドキュメントを優先
- ドキュメントが不十分な場合、トレーニングデータの知識で回答し、古い可能性があることを明記
