---
paths: "**/*.{ts,tsx,js,jsx}"
---

# テスト駆動開発 - t_wada風

## コア哲学

新機能を実装またはバグを修正するとき、t_wadaのように考え行動する - 厳格なRed-Green-Refactor-Commit（RGRC）サイクルを使用し、各ステップがなぜ重要かを深く理解する。

**究極の目標**: 「動くきれいなコード」 - Ron Jeffries

## TDDプロセス概要

1. **テストシナリオリストを作成** - 小さなテスト可能なユニットに分解、TodoWriteで追跡
2. **RGRCサイクルを実行** - 一度に1シナリオ、最小ステップ、迅速に反復

## ベビーステップ

TDDの基礎。例付きの詳細:

[@~/.claude/skills/generating-tdd-tests/SKILL.md#baby-steps---the-foundation](~/.claude/skills/generating-tdd-tests/SKILL.md#baby-steps---the-foundation)

**クイックリファレンス:**

| ステップ | 時間 | アクション |
| --- | --- | --- |
| 1 | 30秒 | 最小の失敗するテストを書く |
| 2 | 1分 | 最小限で通す |
| 3 | 10秒 | テストを実行 |
| 4 | 30秒 | 必要なら小さなリファクタ |
| 5 | 20秒 | グリーンならコミット |

## RGRCサイクル

| フェーズ | コマンド | フォーカス |
| --- | --- | --- |
| [Red] | `npm test` | テストを書く → 正しく失敗することを確認 |
| [Green] | `npm test` | 通すための最小限のコード → 「罪を犯してもよい」 |
| [Refactor] | `npm test` | 重複を除去 → テストをグリーンに保つ |
| [Commit] | `git commit` | テスト＋実装を含める |

終了基準付きの詳細なフェーズガイダンス:
[@~/.claude/skills/generating-tdd-tests/SKILL.md#rgrc-cycle](~/.claude/skills/generating-tdd-tests/SKILL.md#rgrc-cycle)

## t_wadaのように考える

- **小さなステップ**: 「なぜステップを小さくする？」 - 各ステップが特定のことを教える
- **高速反復**: 「このサイクルをもっと速くできる？」 - 速度は設計問題を早期に明らかにする
- **テスト失敗の理由**: 「正しい理由で失敗している？」 - 間違った失敗は間違った理解を意味する
- **実践を通じた学習**: 「このサイクルから何を学んだ？」 - 各サイクルは学習機会

## TodoWriteとの統合

```markdown
# テストシナリオリスト
1. [pending] ユーザーはメールとパスワードで登録できる
2. [pending] 無効なメールでは登録が失敗する

# 現在のRGRCサイクル（シナリオ1用）
1.1 [in_progress] Red: 失敗するテストを書く
1.2 [pending] Green: 最小限のロジックを実装
1.3 [pending] Refactor: バリデーションを抽出
1.4 [pending] Commit: 実装を保存
```

## TDDをスキップする場合

スキップ対象: プロトタイプ、外部API（モックを使用）、使い捨てスクリプト

## テスト設計技法

体系的なテスト設計（同値分割、境界値、決定表）:

[@~/.claude/skills/generating-tdd-tests/SKILL.md#test-design-techniques](~/.claude/skills/generating-tdd-tests/SKILL.md#test-design-techniques)

**クイックステップ:**

1. パーティション（同値クラス）を特定
2. 境界（エッジ）を見つける
3. 3つ以上の条件には決定表を使用

## 関連原則

参照: [@../PRINCIPLE_RELATIONSHIPS.md](../PRINCIPLE_RELATIONSHIPS.md)
