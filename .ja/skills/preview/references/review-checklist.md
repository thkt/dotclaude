# レビューチェックリスト

## SOW/Spec 整合性

ファイルごとレビューの前に実行する。

### Step 1: SOW/Spec の特定

${CLAUDE_SKILL_DIR}/../../workspace/planning/ で、ブランチ名や PR タイトルの語を含むディレクトリを探す。そのディレクトリ内で `sow.md` と `spec.md` を探す。

SOW/Spec が見つからない場合、PR 説明 + commit messages を意図のソースとしてフォールバックし、AC/FR の行はスキップする。

### Step 2: チェック

| チェック    | ソース                             | 条件      | フラグ       |
| ----------- | ---------------------------------- | --------- | ------------ |
| AC coverage | `sow.md` の未チェック `- [ ]` 項目 | SOW あり  | missing      |
| FR coverage | `spec.md` の FR テーブル行         | Spec あり | missing      |
| Scope creep | diff vs 全意図ソース               | 常時      | out-of-scope |
| Impl-wrong  | diff の振る舞い vs spec AC/FR      | 常時      | wrong        |

各フラグの根拠となる意図の行を引用する。引用 AC/FR 行を欠く `wrong` / `missing` は印象判定なので drop する。このスクリーニングは reviewer-conformance と同じ 3 適合性カテゴリを覆う。任意のブランチで深い standalone パスが要るときはそのエージェントを起動する。

### 出力形式

```
SOW/Spec Alignment: [CLEAN | MISSING <N> | OUT-OF-SCOPE <N> | WRONG <N> | MIXED]
Intent source: <sow.md + spec.md path | PR description | commit messages>
Missing (AC): AC-N - <description> (spec: "<quoted line>")
Missing (FR): FR-NNN - <description> (spec: "<quoted line>")
Out-of-scope: <file or area> - not traceable to stated intent
Wrong: <AC-N/FR-NNN> - implemented but <gap> (spec: "<quoted line>")
```

意図ソースが何もない場合は silently スキップする。

## ファイル別レビュー

| チェック     | 何を見るか                                       |
| ------------ | ------------------------------------------------ |
| PR alignment | 変更が記載目的に資するか                         |
| Code style   | 周囲のコードベースと一貫しているか               |
| Security     | injection, XSS, auth bypass, secret 漏洩         |
| Side effects | 既存機能への意図しない振る舞い変更               |
| Performance  | 不要な API/DB 呼び出し、メモリリーク、N+1 クエリ |
| Code smells  | 重複、深いネスト、god 関数                       |

## 依存影響

| チェック            | 方法                                        |
| ------------------- | ------------------------------------------- |
| Import dependents   | 変更ファイル/exports の import を ugrep     |
| Interface contracts | 関数シグネチャが不変か検証                  |
| Shared state        | グローバル/モジュール状態の mutation を確認 |
| Test coverage       | 既存テストが変更パスに対し有効か            |

## コメントセクション

| セクション      | 内容                                 |
| --------------- | ------------------------------------ |
| Requires action | `[must]`, `[want]` findings          |
| Awareness only  | `[imo]`, `[ask]`, `[nits]`, `[info]` |

## テスト評価

### "テスト追加" を提案する前に

1. プロジェクトにテストインフラがあるか確認
2. 類似コードにテストがあるか確認
3. プロジェクト規約がテストを期待する場合のみ提案する
