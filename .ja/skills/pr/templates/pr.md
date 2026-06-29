# PR テンプレート

/pr がリポジトリに PR テンプレートを見つけられないとき、この骨格で本文を生成する。

## テンプレート

`{...}` は生成時に内容へ置き換える。`(任意)` のセクションは、書くことがなければ見出しごと省略する。`Preview URL:` は UI 変更がある PR にのみ記載する (`use-workflow-pageshot` が読む)。

```markdown
Preview URL: http://localhost:3000

## What & Why

{この PR が何をするか - 1-2 文}
{Why - どの問題を解決するか、何を可能にするか}

## Changes

- {変更 1: 何を行いなぜか}
- {変更 2: 何を行いなぜか}

## Scope (任意)

- Not included: {この PR が意図的に行わないもの}

## Design Decisions (任意)

- {このアプローチを代替肢より選んだ理由}

## How to Test

1. {Step}
2. {Expected result}

## Related

- Closes #{issue}
```

## ガイドライン

| フィールド       | OK                                                   | NG                                       |
| ---------------- | ---------------------------------------------------- | ---------------------------------------- |
| What & Why       | オフライン分析を解除するため CSV エクスポートを追加  | CSV エクスポート機能を追加 (Why なし)    |
| Changes          | ExportButton を追加。1-click のためメニューより選択  | ファイルを追加 (理由なし)                |
| Scope            | 認証トークンのリフレッシュは含めない (別 PR)         | 大きな PR で省略 (reviewer が境界を推測) |
| Design Decisions | 大規模データセットの OOM 回避にストリーミングを採用  | 省略 (reviewer が理由推測を強いられる)   |
| How to Test      | Export をクリック → .csv が 3 行でダウンロードを確認 | 機能をテスト (曖昧)                      |
| Preview URL      | Preview URL: http://localhost:3000/dashboard         | UI 変更があるのに欠落                    |
