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

[@../../../../skills/lib/sow-resolution.md]

### テスト生成

前提: spec.md に FR-xxx 項目が含まれていること。

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

パッケージマネージャーで lint, type-check, test を実行（lockfile から検出）。独立コマンドは並列実行。

## 信頼度ベースの判断

| 信頼度 | アクション         |
| ------ | ------------------ |
| ≥80%   | 進行               |
| 50-79% | 防御的チェック追加 |
| <50%   | → まず/research    |

## IDR生成

完了後:

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
> - **不採用**: {棄却した代替案} — {棄却理由}

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
- ファイル順序: リンク見出し → diff → `[!NOTE]` 変更内容 → `[!TIP]` 設計意図（棄却した代替案がある場合は含める）
- 出力: `$IDR_DIR/idr-{NN}.md` (自動採番)、`$IDR_DIR` = `.claude/workspace/planning/YYYY-MM-DD-[feature]/`
- 言語: `settings.json` の `language` に従う
