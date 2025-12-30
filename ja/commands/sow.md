---
description: 複雑なタスクの計画のためにStatement of Work（SOW）を生成
allowed-tools: Bash(git log:*), Bash(git diff:*), Read, Write, Glob, Grep, LS, Task
model: inherit
argument-hint: "[タスク説明] (リサーチコンテキストがあればオプション)"
dependencies: [formatting-audits]
---

# /sow - SOWジェネレーター

## 目的

sow.mdのみを生成（単一成果物）、計画と分析のため。

## 入力解決

```text
/sow 実行
    │
    ├─ 引数あり? ─YES──→ 引数をタスク説明として使用
    │
    └─ 引数なし
           │
           ├─ リサーチコンテキストあり? ─YES──→ コンテキストからトピックを抽出、発見事項を反映
           │
           └─ なし ──→ ユーザーに質問:
                       「何を計画しますか？タスク説明を入力してください。」
```

### リサーチコンテキスト検出

```bash
!`ls -t .claude/workspace/research/*-context.md 2>/dev/null | head -1 || ls -t ~/.claude/workspace/research/*-context.md 2>/dev/null | head -1 || echo "(リサーチコンテキストなし)"`
```

見つかった場合:

- コンテキストファイルからトピックを抽出
- リサーチ発見事項をSOWに反映
- 表示: `📄 リサーチコンテキストを使用: [ファイル名]`

## テンプレート参照

**構造とセクション順序のみ**を参考にする:
[@~/.claude/templates/sow/workflow-improvement.md]

**重要**:

- ✅ コピー可: セクション構造、テーブル形式、ID命名（I-001, AC-001, R-001）
- ❌ コピー不可: 実際のコンテンツ、具体的な値
- ユーザーの機能説明に基づいて新しいコンテンツを生成

## 信頼度マーカー

数値形式 `[C: X.X]` をドキュメント全体で使用:

| 範囲 | 意味 | 必要な証拠 |
| --- | --- | --- |
| [C: 0.9+] | 検証済み | file:line、コマンド出力、ログ |
| [C: 0.7-0.9] | 推論 | 推論根拠を記載 |
| [C: <0.7] | 不確実 | 調査が必要 |

**YAMLフロントマター**: ドキュメントレベルのスコアとして `confidence.overall` を含める。

## コードベース分析（オプション）

新規プロジェクトでない場合、Plan agentを呼び出し:

```typescript
Task({
  subagent_type: "Plan",
  model: "haiku",
  description: "機能コンテキストのためのコードベース分析",
  prompt: `機能: "${featureDescription}"
調査: 既存パターン、影響を受けるモジュール、技術スタック。
マーカー付きで返却: [C: 0.9+] 検証済み, [C: 0.7-0.9] 推論, [C: <0.7] 不確実。`
})
```

## 必須セクション

テンプレート構造に従う:

1. **Executive Summary** - 概要 [C: 0.7]
2. **Problem Analysis** - 現状 [C: 0.9+]、信頼度別の問題
3. **Assumptions & Prerequisites** - 事実 [C: 0.9+]、仮定 [C: 0.7]、不明 [C: <0.5]
4. **Solution Design** - アプローチ、代替案、推奨
5. **Test Plan** - 優先度付きのUnit/Integration/E2E
6. **Acceptance Criteria** - フェーズ別、信頼度マーカー付き
7. **Implementation Plan** - ステップ付きフェーズ、**Progress Matrix含む**
8. **Success Metrics** - 測定可能な成果
9. **Risks & Mitigations** - 信頼度レベル別
10. **Verification Checklist** - 実装前チェック
11. **References** - 関連ドキュメント

## Progress Matrix（PDD統合）- オプション

Implementation Planセクションに含める。進捗駆動開発の追跡を可能にする。

> **参照**: [進捗駆動開発（PDD）](https://zenn.dev/pipipi_dev/articles/20251224-progress-driven-development)
> PDD = 機能ごとの進捗を5段階ステップで可視化し、人間とAIが協調して効率的に開発を進める手法

### フォーマット

```markdown
### Progress Matrix

| Feature | spec | design | impl | test | review | Progress |
| --- |:---:|:---:|:---:|:---:|:---:|:---:|
| Feature A | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | 0% |
| Feature B | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | 0% |

**Legend**: ⬜ none | 🔄 started | 📝 draft | 👀 reviewed | ✅ done
```

### ステップ（5列）

| Step | 説明 | 完了基準 |
| --- | --- | --- |
| spec | 要件定義 | SOW/Specセクション完了 |
| design | アーキテクチャ決定 | Solution Design承認 |
| impl | コード実装 | コア機能動作 |
| test | テスト合格 | Unit/Integrationテストグリーン |
| review | 品質検証 | /audit + /validate合格 |

### 進捗計算

- 各ステップ = 20%（5ステップ合計）
- ステータス重み: ⬜=0%, 🔄=25%, 📝=50%, 👀=75%, ✅=100%
- 機能進捗 = (Σ ステップ重み) / 5

### 使用方法

1. **初期**: 全機能が全列で⬜から開始
2. **/code中**: 進捗に応じてステータス更新
3. **/validateでレビュー**: マトリクスが実際の状態を反映しているか確認

## 出力

保存先: `.claude/workspace/planning/[timestamp]-[feature]/sow.md`

```bash
# 出力場所を検出
!`ls -d .claude/ 2>/dev/null && echo "プロジェクトローカル" || echo "グローバル: ~/.claude/"`
```

保存後に表示:

```text
✅ SOW保存先: .claude/workspace/planning/[path]/sow.md
```

## 使用例

```bash
# 明示的な引数付き
/sow "OAuthでユーザー認証を追加"

# /research後（コンテキストを自動検出）
/research "ユーザー認証オプション"
/sow  # リサーチコンテキストを自動的に使用

# コンテキストなし、引数なし → 入力を要求
/sow
# → 「何を計画しますか？タスク説明を入力してください。」
```

## 次のステップ

SOWが作成された後:

- `/spec` - 実装仕様を生成
- `/plans` - 作成されたドキュメントを表示
