---
description: 開発環境で小さなバグやマイナーな改善を迅速に修正
allowed-tools: Bash(git diff:*), Bash(git ls-files:*), Bash(npm test:*), Bash(npm run), Bash(npm run:*), Bash(yarn run:*), Bash(pnpm run:*), Bash(bun run:*), Bash(ls:*), Edit, MultiEdit, Read, Grep, Glob, Task
model: inherit
argument-hint: "[バグまたは問題の説明]"
dependencies: [Explore, test-generator, generating-tdd-tests]
---

# /fix - クイックバグ修正

## 目的

根本原因分析と信頼度ベースの検証で小さなバグを迅速に修正。

## 使用タイミング

| `/fix` を使用                 | 他のコマンドを使用                     |
| ----------------------------- | -------------------------------------- |
| 小さく、よく理解された問題    | 根本原因不明 → `/research`             |
| 単一ファイルまたは2-3ファイル | 複数ファイルリファクタリング → `/code` |
| 信頼度 ≥80%                   | 新機能 → `/think`                      |

## 修正プロセス概要

`/fix` コマンドは構造化された6フェーズアプローチに従う:

```text
フェーズ1: 根本原因分析
  ↓ 症状ではなく真の原因を特定
フェーズ1.5: 回帰テスト先行（推奨）
  ↓ 失敗するテストを書く（TDDアプローチ）
フェーズ2: 実装
  ↓ 信頼度ベースの修正
フェーズ3: 検証
  ↓ 品質チェック
フェーズ3.5: テスト生成（オプション）
  ↓ 追加の回帰テスト
完了定義
  ↓ 出力＆学び
```

## プロセスモジュール

各フェーズには専用モジュールで詳細なガイダンスがある:

### フェーズ1: 根本原因分析

[@~/.claude/references/commands/fix/root-cause-analysis.md](~/.claude/references/commands/fix/root-cause-analysis.md)

- 動的コンテキスト（git diff、テストステータス）
- 5 Whysのための Explore エージェント
- パターン認識（孤立/パターン/体系的）
- 信頼度マーカー（[✓/→/?]）

**出力**: 信頼度スコア付きで根本原因を特定

### フェーズ1.5: 回帰テスト先行（推奨）

[@~/.claude/references/commands/fix/regression-test.md](~/.claude/references/commands/fix/regression-test.md)

- バグ修正へのTDDアプローチ
- バグを再現する失敗テストを書く
- 正しい失敗を確認
- 参照: [@~/.claude/skills/generating-tdd-tests/SKILL.md](~/.claude/skills/generating-tdd-tests/SKILL.md)

**スキップする場合**:

- ドキュメントのみの変更
- 設定変更
- ロジックなしのUIのみの修正
- 信頼度 > 0.95 かつ簡単な修正

**出力**: バグを再現する失敗テスト

### フェーズ2: 実装

[@~/.claude/references/commands/fix/implementation.md](~/.claude/references/commands/fix/implementation.md)

- 信頼度ベースのアプローチ:
  - 高 (>0.9): 直接修正
  - 中 (0.7-0.9): 防御的修正
  - 低 (<0.7): `/research` にエスカレーション
- オッカムの剃刀を適用（最もシンプルな解決策）
- UI問題にはCSS優先
- 周囲のコードを再構築しない

**出力**: 最小限の修正を適用

### フェーズ3: 検証

[@~/.claude/references/commands/fix/verification.md](~/.claude/references/commands/fix/verification.md)

- 品質チェックを並行実行:
  - テスト（回帰 + すべて）
  - リント（自動修正）
  - 型チェック
- 手動スポットチェック
- リグレッションなし

**出力**: すべてのチェック合格

### フェーズ3.5: テスト生成（オプション）

[@~/.claude/references/commands/fix/test-generation.md](~/.claude/references/commands/fix/test-generation.md)

- エッジケース用にtest-generatorを使用
- 参照: [@~/.claude/references/commands/shared/test-generation.md](~/.claude/references/commands/shared/test-generation.md)
- 必要に応じて統合テスト

**スキップする場合**:

- テスト不可能な変更
- 包括的なテストが既に存在

**出力**: 追加の回帰テスト

### 完了定義

[@~/.claude/references/commands/fix/completion.md](~/.claude/references/commands/fix/completion.md)

- 完了基準
- 出力フォーマット
- エスカレーションガイドライン
- 適用した原則のドキュメント

**信頼度目標**: ≥0.9

## 信頼度マーカー

すべての出力で使用:

- **[✓]** 高 (>0.8) - コード/ファイルから直接検証
- **[→]** 中 (0.5-0.8) - 証拠からの妥当な推論
- **[?]** 低 (<0.5) - 検証が必要な仮定

## エスカレーション

いずれかのフェーズで信頼度が0.7を下回った場合:

```text
⚠️ 低信頼度 - エスカレーションを推奨:
- /research - より深く調査
- /think - 包括的な解決策を計画
- /code - 完全なTDDで実装
```

## IDR（意図的にスキップ）

`/fix` はIDRを**生成しません**。理由:

- 小さなバグ修正に詳細な判断ドキュメントは不要
- IDRはSOW追跡を伴う複雑な機能向けに設計
- ドキュメントのオーバーヘッドより迅速な反復を優先

**IDRを使用する場合**: 判断追跡が必要な機能には `/code` を使用。

## 適用した原則

- **オッカムの剃刀**: 機能する最もシンプルな解決策
- **TIDYINGS**: 触れたものだけをクリーンに
- **プログレッシブエンハンスメント**: UI問題にはCSS優先
- **TDD**: バグ修正はテスト先行

## 修正後の次のステップ

- **成功**: 学びを記録、変更をコミット
- **部分的**: フォローアップの `/fix` または `/research`
- **エスカレーション**: `/think` → `/code` で包括的な解決策

## TDDとの統合

TDDの基礎とパターン:

- [@~/.claude/skills/generating-tdd-tests/SKILL.md](~/.claude/skills/generating-tdd-tests/SKILL.md) - TDD哲学
- [@~/.claude/skills/generating-tdd-tests/references/bug-driven.md](~/.claude/skills/generating-tdd-tests/references/bug-driven.md) - バグ駆動TDDパターン
- [@~/.claude/references/commands/shared/tdd-cycle.md](~/.claude/references/commands/shared/tdd-cycle.md) - RGRCサイクル詳細
