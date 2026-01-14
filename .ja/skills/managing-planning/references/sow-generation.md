# SOW生成ワークフロー

構造化されたセクションでのStatement of Work作成プロセス。

## 入力解決

```text
/sow 実行
    │
    ├─ 引数あり? ─YES──→ タスク説明として使用
    │
    └─ 引数なし
           │
           ├─ リサーチコンテキストあり? ─YES──→ リサーチ結果を使用
           │
           └─ なし ──→ ユーザーにタスク説明を質問
```

## リサーチコンテキスト検出

```bash
# 最近のリサーチを確認
ls -t .claude/workspace/research/*.md 2>/dev/null | head -1

# 見つかった場合、表示:
📄 Using research context: [filename]
```

## 必須セクション

| セクション             | 目的                     |
| ---------------------- | ------------------------ |
| エグゼクティブサマリー | 高レベル概要             |
| 問題分析               | 現状、課題               |
| 前提条件               | 事実、仮定、未知         |
| ソリューション設計     | アプローチ、代替案       |
| テスト計画             | Unit/Integration/E2E     |
| 受け入れ基準           | フェーズ別               |
| 実装計画               | フェーズ、マイルストーン |
| 成功メトリクス         | 測定可能なアウトカム     |
| リスクと軽減策         | 特定されたリスク         |
| 検証チェックリスト     | 実装前チェック           |

## 信頼度マーカー

| マーカー | 意味     | エビデンス              |
| -------- | -------- | ----------------------- |
| [✓]      | 検証済み | file:line、コマンド出力 |
| [→]      | 推論     | 理由を記載              |
| [?]      | 不確実   | 調査が必要              |

## コードベース分析（オプション）

既存プロジェクトの場合、分析:

```typescript
Task({
  subagent_type: "Plan",
  model: "haiku",
  prompt: `Feature: "${feature}"
Investigate: existing patterns, affected modules.
Return with confidence markers.`,
});
```

## 出力

```text
保存先: .claude/workspace/planning/YYYY-MM-DD-[feature]/sow.md

✅ SOW saved to: .claude/workspace/planning/[path]/sow.md
```

## テンプレート

構造参照: `~/.claude/templates/sow/template.md`

- ✅ コピー: セクション構造、ID命名 (I-001, AC-001, R-001)
- ❌ コピーしない: 実際のコンテンツ

## 関連

- Spec生成: [@./spec-generation.md](./spec-generation.md)
- Thinkワークフロー: [@./think-workflow.md](./think-workflow.md)
