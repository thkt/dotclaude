# TDD/RGRCサイクル実装詳細

このモジュールはSpec駆動アプローチによる機能開発のための詳細なTDD実装ガイダンスを提供します。

## TDD基礎リファレンス

コアTDD原則、Baby Steps、RGRCサイクルの基礎:

- [@../../../../skills/generating-tdd-tests/SKILL.md](~/.claude/skills/generating-tdd-tests/SKILL.md) - TDD哲学と原則
- [@../../../../skills/generating-tdd-tests/references/feature-driven.md](~/.claude/skills/generating-tdd-tests/references/feature-driven.md) - 機能駆動TDDパターン
- [@../../../../references/commands/shared/tdd-cycle.md](~/.claude/references/commands/shared/tdd-cycle.md) - RGRC実装詳細

## 機能駆動TDDコンテキスト

このモジュールはインタラクティブなテストアクティベーションによる**Spec駆動機能開発**に焦点を当てています。

**主な特徴**:

- spec.mdからテスト生成（フェーズ0）
- 全テストがスキップ状態で開始
- ユーザーが一度に1つのテストをアクティベート
- 各テストに対してフルRGRCサイクル

**参照**: [@./test-preparation.md](./test-preparation.md) フェーズ0の詳細

### 計画からのテスト生成（Pre-Red）

RGRCサイクルに入る前に、spec.mdから自動的にテストを生成。

**詳細なテスト生成パターン**:
[@../../../../references/commands/shared/test-generation.md](~/.claude/references/commands/shared/test-generation.md)

**Spec駆動生成**（フェーズ0）:
インタラクティブなテストアクティベーションワークフローは[@./test-preparation.md](./test-preparation.md)を参照。

**クイックリファレンス**:

```bash
# 1. テストシナリオ付きspecを確認
.claude/workspace/planning/[feature-name]/spec.md

# 2. スキップモードでテスト生成（フェーズ0）
# 詳細はtest-preparation.mdを参照

# 3. 一度に1つのテストをアクティベート（インタラクティブ）
```

**生成タイミング:**

- spec.mdにFR-xxx要件またはGiven-When-Thenシナリオが含まれている
- 計画された機能の既存テストがない
- ユーザーがテスト生成を要求

**スキップ条件:**

- テストがすでに存在
- spec.mdが定義されていない
- クイックフィックスモード（代わりに`/fix`を使用）

### リアルタイムフィードバック付き拡張RGRCサイクル

詳細なフェーズガイダンス（Red/Green/Refactorステップ、終了基準、タイミング）:
[@../../../../references/commands/shared/tdd-cycle.md](~/.claude/references/commands/shared/tdd-cycle.md)

**機能固有の適応**:

| フェーズ | 機能コンテキスト |
| --- | --- |
| Red | spec.mdから生成されたテストを使用、または新規作成 |
| Green | **Ralph-loop自動反復** テストが通るまで |
| Refactor | SOLID適用、パターン抽出 |
| Commit | ユーザーがgitコマンドを実行 |

## Ralph-loop統合（Greenフェーズ）

Greenフェーズでは、テストが通るまで自動的に反復実装を行います。

### 自動反復の仕組み

```markdown
1. テスト失敗を確認（Redフェーズ完了）
2. Ralph-loopが自動発動
3. 実装 → テスト実行 → 失敗なら再試行
4. 全テストパスで <promise>GREEN</promise> を出力
5. Refactorフェーズへ移行
```

### 内部動作

```bash
# /codeコマンド実行時、Greenフェーズで以下が自動実行:
/ralph-loop "
現在のテストを通す最小限の実装を行う。
テストが全てパスしたら <promise>GREEN</promise> を出力。
" --completion-promise "GREEN" --max-iterations 10
```

### 完了条件

| 条件 | 動作 |
| --- | --- |
| テスト全パス | `<promise>GREEN</promise>` を出力して終了 |
| 最大反復到達 | 停止してユーザーに報告 |
| 重大エラー | 即時停止、手動介入を要求 |

### Baby Stepsとの統合

Ralph-loopは各イテレーションで**最小限の変更**を試みます：

- 1つのテストを1つずつ通す
- 過去の失敗から学習（ファイル履歴を参照）
- 複雑な実装は分割して段階的に

## 進捗表示

### RGRCサイクル進捗ビジュアライゼーション

リアルタイム更新でTDDサイクル進捗を表示:

```markdown
実装タスク: ユーザー認証機能
Red -> Green -> Refactor -> Commit

現在のサイクル: シナリオ 2/5
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Redフェーズ    [████████████] 完了
Greenフェーズ  [████████░░░░] 70%
Refactor     [░░░░░░░░░░░░] 待機中
Commit       [░░░░░░░░░░░░] 待機中
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

現在: テストが通るまで最小限の実装中...
経過: 8分 | 残りシナリオ: 3
```

### 実装モードインジケータ

#### TDDモード（デフォルト）

```markdown
TDD進捗:
サイクル 3/8: Greenフェーズ
[ACTIVE] 現在のテスト: エッジケースを処理すべき
書いた行数: 125 | テスト: 18/20
```

#### クイック実装モード

```markdown
[FAST] クイック実装中... [████████░░] 80%
スピードのため一部の品質チェックをスキップ
```

## TodoWrite統合

信頼度スコア付きリアルタイムトラッキング:

```markdown
# 実装: [機能名]
## シナリオ (総信頼度: 0.85)
1. [PENDING] 有効なメールでのユーザー登録 [C: 0.9]
2. [PENDING] 無効なメールでの登録失敗 [C: 0.8]
3. [PENDING] 重複メール防止 [C: 0.85]

## 現在のRGRCサイクル - シナリオ 1
### Redフェーズ (開始: 14:23)
1.1 [DONE] 失敗するテストを書く [C: 0.95] 2分
1.2 [DONE] 正しい失敗を確認 [C: 0.9] 30秒

### Greenフェーズ (アクティブ: 14:26)
1.3 [FAIL] 登録ロジックを実装 [C: 0.7] 3分
1.4 [PENDING] テストが一貫して通る [C: 保留]

### Refactorフェーズ (保留)
1.5 [PENDING] SOLID原則を適用 [C: 保留]
1.6 [PENDING] バリデーションロジックを抽出 [C: 保留]

### 品質ゲート
- テスト: 12/14 合格
- カバレッジ: 78% (目標: 80%)
- リント: 2警告
- 型: 全合格
```
