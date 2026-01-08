# TDDサイクル実装詳細

RGRCサイクルのクイックリファレンス。詳細はスキルファイルを参照。

## 完全リファレンス

[@../../../skills/generating-tdd-tests/SKILL.md#rgrc-cycle](../../../skills/generating-tdd-tests/SKILL.md#rgrc-cycle)

## クイックリファレンス

| フェーズ | 目標                         | 信頼度 | 最大時間 |
| -------- | ---------------------------- | ------ | -------- |
| Red      | 期待通りの理由でテストが失敗 | 0.9    | 2分      |
| Green    | 通過させる最小限のコード     | 0.7    | 5分      |
| Refactor | 動作を変えずにクリーンアップ | 0.95   | 3分      |
| Commit   | すべてのチェックが通過       | 1.0    | 1分      |

## 主要コマンド

```bash
# Red: 特定のテストを実行
npm test -- --testNamePattern="[test]"

# Green: ウォッチモード
npm test -- --watch --testNamePattern="[test]"

# Commit: すべてのチェック
npm run lint && npm test && npm run type-check
```

## 統合ポイント

| コマンド | TDD使用方法                                          |
| -------- | ---------------------------------------------------- |
| `/code`  | spec.mdを使った機能駆動（Phase 0: skipモード）       |
| `/fix`   | リグレッションテストを使ったバグ駆動（activeモード） |

## よくある間違い

| フェーズ | 間違い                 | 修正方法                                   |
| -------- | ---------------------- | ------------------------------------------ |
| Red      | テストがすぐに通過する | テストが実際の動作をチェックしているか確認 |
| Green    | 過剰実装               | テストが要求するものだけを書く             |
| Refactor | 動作の変更             | 構造変更のみ                               |

## 参考文献

- [@../../../../skills/generating-tdd-tests/SKILL.md](../../../../skills/generating-tdd-tests/SKILL.md) - 完全なTDDガイド
