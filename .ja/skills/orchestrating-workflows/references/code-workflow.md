# /codeワークフロー

## フロー

```text
フェーズ0: SOWコンテキスト + テスト生成
フェーズ1-N: RGRC (1テストずつ)
  Red → Green (Ralph-loop) → Refactor → Commit
完了: 品質ゲート → IDR
```

## フェーズ0: SOWコンテキスト + テスト生成

### SOW/Spec自動検出

[@../../lib/sow-resolution.md]

### テスト生成

前提: spec.md に FR-xxx（機能要件）項目が含まれていること。

1. specからFR-xxx要件をパース
2. 全テストを**スキップ状態**で生成
3. 順序: 単純 → 複雑 (Baby Steps)

## フェーズ1-N: RGRCサイクル

各テストで:

| ステップ | アクション                              |
| -------- | --------------------------------------- |
| Red      | `.skip`削除、正しい失敗を確認           |
| Green    | 最小実装 (Ralph-loop自動リトライ、任意) |
| Refactor | SOLID, DRY, オッカム適用                |
| Commit   | 全チェック通過                          |

## 品質ゲート

プロジェクトのパッケージマネージャーを使用して lint, type-check, test を実行（lockfile から検出）。独立したコマンドは並列実行し、個別の終了コードを取得。

## 信頼度ベースの判断

| 信頼度 | アクション         |
| ------ | ------------------ |
| ≥80%   | 進行               |
| 50-79% | 防御的チェック追加 |
| <50%   | → まず/research    |

## IDR生成

完了後、IDRを生成:

````markdown
# IDR: {要約タイトル}

> {YYYY-MM-DD}

## Summary

{変更内容と目的を2-3文で要約}

## Changes

### [{ファイルパス}](file:///{絶対パス})

```diff
@@ -{old_start},{old_count} +{new_start},{new_count} @@
-削除行
+追加行
```

> [!NOTE]
> - {変更点 — 箇条書き}

> [!TIP]
> - **{判断}**: {その判断をした理由}

---

### git diff --stat
```
 {file} | {count} {++++----}
 N files changed, M insertions(+), D deletions(-)
```
````

ルール:

- ファイルリンク: `file:///` + 絶対パス (VS Codeでクリック可能)
- Diff: `@@` hunkヘッダーで行番号を含める
- ファイルごとの順序: リンク見出し → diff → `[!NOTE]` 変更内容 → `[!TIP]` 設計意図
- 出力パス: `$IDR_DIR/idr-{NN}.md` (自動採番)
- 出力言語: `settings.json` の `language` 設定に従う
