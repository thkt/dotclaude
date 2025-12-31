---
description: すべてのhookifyルールを一覧表示
dependencies: [creating-hooks]
---

# /hookify:list - フックルール表示

`/hookify`で作成されたすべてのカスタムフックルールを表示。

## プロセス

1. 両方の場所でhookifyルールファイルを**検索**:
   - プロジェクトローカル: `.claude/hookify.*.local.md`
   - グローバル: `~/.claude/hookify.*.local.md`
2. 各ファイルからYAMLフロントマターを**解析**
3. スコープインジケーター付きでルールをテーブル形式で**表示**

## 出力フォーマット

```markdown
🔧 Hookifyルール

| # | 名前 | イベント | アクション | 有効 | パターン |
| --- | --- | --- | --- | --- | --- |
| 1 | block-dangerous | bash | block | ✅ | rm -rf |
| 2 | warn-console-log | file | warn | ✅ | console |
| 3 | require-tests | stop | block | ❌ | test |
```

## 手順

1. Globを使用してすべての`.claude/hookify.*.local.md`ファイルを検索
2. 各ファイルを読み込みYAMLフロントマターを抽出
3. ルール情報のフォーマットされたテーブルを表示
4. 有効なら✅、無効なら❌を表示
