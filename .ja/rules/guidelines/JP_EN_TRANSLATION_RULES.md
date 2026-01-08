# JP/EN翻訳ファイルの取り扱い

英語ソースと日本語翻訳を持つバイリンガルドキュメントのレビューガイドライン。

## 翻訳ファイルの認識

`.ja/`ディレクトリ配下のファイルは、対応する英語ファイルの**日本語翻訳**です。コンテンツの一貫性を比較すべきではありません。

| パスパターン        | タイプ   | 取り扱い         |
| ------------------- | -------- | ---------------- |
| `commands/*.md`     | ENソース | 主要レビュー対象 |
| `.ja/commands/*.md` | JP翻訳   | 構造のみレビュー |
| `docs/*.md`         | ENソース | 主要レビュー対象 |
| `.ja/docs/*.md`     | JP翻訳   | 構造のみレビュー |

## 翻訳ファイルのレビュールール

**レビューすること**:

- 構造の一貫性（同じセクションが存在する）
- YAMLフロントマターフィールドの一致
- Mermaidダイアグラムが同等
- リンク/参照が有効

**問題としてフラグを立てないこと**:

- 例での異なるキーワード（例: `Navigate to` vs `に移動`）
- 翻訳されたコンテンツ（説明、解説）
- ローカライズされた日付/数値形式
- 異なる自然言語表現

## 実装

ドキュメントファイルをレビューする際:

```yaml
review_strategy:
  en_files:
    path_pattern: "!.ja/**/*.md"
    review_mode: full

  ja_files:
    path_pattern: ".ja/**/*.md"
    review_mode: structure_only
    skip_content_comparison: true

  comparison_rules:
    - ENコンテンツとJPコンテンツを比較しない
    - セクション見出しが存在することを確認（構造一致）
    - 両方のバージョンでリンクが有効であることを確認
```

## 例: 有効なEN/JP差異

これは**問題ではありません**:

| EN (`commands/workflow/create.md`) | JP (`.ja/commands/workflow/create.md`) |
| ---------------------------------- | -------------------------------------- |
| `Navigate to https://example.com`  | `https://example.com に移動`           |
| `Click element (uid: abc)`         | `要素をクリック（uid: abc）`           |

両方とも同じアクションをそれぞれの言語で表現しています。

## 関連

- [@./DOCUMENTATION_RULES.md](./DOCUMENTATION_RULES.md) - 一般的なドキュメントガイドライン
