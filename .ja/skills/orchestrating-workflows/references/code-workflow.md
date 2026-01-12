# /code ワークフロー - TDD機能開発

spec駆動テスト生成とTDD/RGRCサイクルによる機能実装ワークフロー。

## ワークフロー概要

```text
フェーズ0: テスト準備 (spec.md → スキップテスト)
    ↓
フェーズ1-N: RGRCサイクル (1テストずつ)
    ├─ Red: テストを有効化、失敗を確認
    ├─ Green: 最小限の実装 (Ralph-loop)
    ├─ Refactor: 原則を適用
    └─ Commit: 状態を保存
    ↓
完了: 品質ゲート → IDR生成
```

## フェーズ0: 仕様コンテキスト

### Spec自動検出

```text
検索場所:
- .claude/workspace/planning/**/spec.md
- ~/.claude/workspace/planning/**/spec.md

見つかった場合:
- FR-xxx要件をパース
- Given-When-Thenシナリオを抽出
- 実装ガイドとして使用

見つからない場合:
- まず /think の実行を検討
- 仮定をインラインで文書化
```

### テスト生成 (スキップモード)

全テストをスキップ状態でテストスキャフォールドを生成。

**パターン参照**: [@./shared/test-generation.md#pattern-1-spec-driven-feature-development](./shared/test-generation.md#pattern-1-spec-driven-feature-development)

### テストキュー表示

```markdown
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
テストキュー (Baby Steps順)

| #   | テスト名         | 状態 | 元     |
| --- | ---------------- | ---- | ------ |
| 1   | ゼロ入力を処理   | SKIP | FR-001 |
| 2   | 基本ケースを計算 | SKIP | FR-002 |

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## フェーズ1-N: RGRCサイクル

**完全なTDD参照**: [@./shared/tdd-cycle.md](./shared/tdd-cycle.md)

### インタラクティブ有効化

各テストでユーザーにプロンプト:

```text
[Y] 有効化してRedフェーズへ
[S] 次のテストへスキップ
[Q] テスト生成を終了
```

### Redフェーズ

1. `.skip`マーカーを削除
2. テスト実行 → 正しい理由で失敗することを確認
3. 失敗メッセージが意図と一致することを確認

### Greenフェーズ (Ralph-loop自動反復)

```text
1. テスト失敗を確認
2. Ralph-loopが自動起動
3. 実装 → 実行 → 失敗時は再試行
4. 通過時に <promise>GREEN</promise> を出力
5. Refactorへ移行
```

**完了**: 全テスト通過 OR 最大反復到達。

### Refactorフェーズ

テストをグリーンに保ちながら原則を適用:

- 構造にはSOLID
- 重複にはDRY
- 簡素化にはオッカムの剃刀

### Commitフェーズ

コミット前に全チェックをパス。

## 品質ゲート

### 並列実行

```bash
npm run lint &
npm run type-check &
npm test -- --findRelatedTests &
wait
```

### ゲート閾値

| チェック   | 目標             | アクション |
| ---------- | ---------------- | ---------- |
| テスト     | 全て通過         | 必須       |
| リント     | エラー 0         | 必須       |
| 型         | エラーなし       | 必須       |
| カバレッジ | C0 ≥90%, C1 ≥80% | 推奨       |

### 進捗表示

```text
├─ Tests      [████████████] PASS 45/45
├─ Coverage   [████████░░░░] WARN 78%
├─ Lint       [████████████] PASS 0 errors
└─ TypeCheck  [████████████] PASS
```

## Storybook統合 (オプション)

### トリガー条件

- spec.md に `### 4.x Component API:` セクションが含まれる

### プロセス

1. specからComponentSpecをパース
2. 既存Storiesファイルを確認
3. オプション: 上書き / スキップ / マージ / 差分のみ
4. CSF3形式のStoriesを生成

## 完了基準

**共通基準**: [@../../../rules/development/COMPLETION_CRITERIA.md](../../../rules/development/COMPLETION_CRITERIA.md)

### /code 固有

- [x] 全RGRCサイクル完了
- [x] 機能が仕様通りに動作
- [x] エッジケース処理済み
- [x] 品質ゲート通過

### 信頼度ベースの判断

| 信頼度 | アクション              |
| ------ | ----------------------- |
| ≥80%   | 実装を進める            |
| 50-79% | 防御的チェックを追加    |
| <50%   | → まず /research を実行 |

## IDR生成

実装後、IDRを生成。

**完全ロジック**: [@./shared/idr-generation.md](./shared/idr-generation.md)

## 関連

- TDDサイクル: [@./shared/tdd-cycle.md](./shared/tdd-cycle.md)
- テスト生成: [@./shared/test-generation.md](./shared/test-generation.md)
- IDR生成: [@./shared/idr-generation.md](./shared/idr-generation.md)
- 完了基準: [@../../../rules/development/COMPLETION_CRITERIA.md](../../../rules/development/COMPLETION_CRITERIA.md)
