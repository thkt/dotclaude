# 検証基準

SOW受け入れ基準の検証プロセス。

## 目的

実装がSOW受け入れ基準と一致することを検証し、IDRを更新。

## 検証フロー

```text
/validate
    │
    ├─ SOWとIDRを検出
    │
    ├─ 受け入れ基準を読み込み
    │
    ├─ 各ACについて:
    │     ├─ 実装エビデンスを確認
    │     ├─ テスト存在を確認
    │     └─ PASS/FAILを判定
    │
    ├─ 検証レポートを生成
    │
    └─ IDRに /validate セクションを追加
```

## AC検証チェックリスト

各受け入れ基準について:

| チェック     | 質問                            |
| ------------ | ------------------------------- |
| 実装済み     | コードがこのACを実装しているか? |
| テスト済み   | テストがこのACを検証しているか? |
| 文書化済み   | 動作が文書化されているか?       |
| レビュー済み | /auditでレビューされたか?       |

## 信頼度評価

| 結果     | 信頼度       | アクション       |
| -------- | ------------ | ---------------- |
| 全てPASS | [C: 0.9+]    | リリース準備完了 |
| 一部WARN | [C: 0.7-0.9] | 警告をレビュー   |
| FAILあり | [C: <0.7]    | リリース前に修正 |

## 検証レポート形式

```markdown
## /validate - [タイムスタンプ]

### SOW受け入れ基準検証

| AC     | 説明               | ステータス | エビデンス           |
| ------ | ------------------ | ---------- | -------------------- |
| AC-001 | 機能が動作         | ✅ PASS    | test:auth.test.ts:45 |
| AC-002 | パフォーマンスOK   | ⚠️ WARN    | 95ms (目標: 100ms)   |
| AC-003 | エラーハンドリング | ❌ FAIL    | テストカバレッジなし |

### 特定されたギャップ

- AC-003: エラーハンドリングテストが不足
- NFR-002: パフォーマンス未検証

### サインオフ

検証信頼度: [C: 0.85]
推奨: リリース前にFAIL項目に対処
```

## IDR統合

IDRに検証セクションを追加:

**参照**: [@../../orchestrating-workflows/references/shared/idr-generation.md](../../orchestrating-workflows/references/shared/idr-generation.md)

## 合否基準

| スコア | ステータス | アクション         |
| ------ | ---------- | ------------------ |
| 100%   | PASS       | 出荷準備完了       |
| 90-99% | WARN       | ギャップをレビュー |
| <90%   | FAIL       | リリース前に対処   |

## 関連

- SOW生成: [@./sow-generation.md](./sow-generation.md)
- IDR生成: [@../../orchestrating-workflows/references/shared/idr-generation.md](../../orchestrating-workflows/references/shared/idr-generation.md)
