# Design: Hookify 自動実行基盤

Version: 1.0.0
Status: Design
Created: 2025-12-16
Based on: SOW AC-2.2, Spec FR-007

---

## 1. 概要

Hookify ルールをコマンド実行時に自動的に評価し、パターン検出時に warn/block アクションを実行する基盤設計。

### 現状

- [✓] Hookify プラグインは Python フック処理を実装済み
- [✓] PreToolUse/PostToolUse/UserPromptSubmit フックが存在
- [✓] ルールエンジン（rule_engine.py）で評価ロジック実装済み
- [→] コマンド（/commit, /code）との自動統合は未実装

### 目標

- [→] /commit 実行時にコード品質ルールを自動評価
- [→] /code 実行時に危険パターンを自動検出
- [→] 既存のフック処理との seamless 統合

---

## 2. 実装方針

### 2.1 アーキテクチャ

```text
┌─────────────────────────────────────────────────────────────┐
│ コマンド実行フロー                                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  /commit or /code                                           │
│       ↓                                                     │
│  PreToolUse Hook (settings.json)                           │
│       ↓                                                     │
│  ┌─────────────────────────────────────────┐               │
│  │ Hookify Rule Engine                      │               │
│  │  ├─ load_rules(event='file'|'bash')     │               │
│  │  ├─ evaluate_rules(rules, tool_input)   │               │
│  │  └─ return {decision, message}          │               │
│  └─────────────────────────────────────────┘               │
│       ↓                                                     │
│  Tool Execution (if not blocked)                           │
│       ↓                                                     │
│  PostToolUse Hook                                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 統合ポイント

| コマンド | 統合方法 | トリガータイミング |
|----------|----------|-------------------|
| /commit | PreToolUse (git commit) | コミット前に差分をチェック |
| /code | PreToolUse (Edit/Write) | ファイル編集前にパターンチェック |
| /fix | PostToolUse (Edit) | 修正後のコード品質チェック |

---

## 3. 技術的決定

### 3.1 実装アプローチ選択

| アプローチ | メリット | デメリット | 採用 |
|-----------|---------|----------|------|
| **A: 既存Pythonフック拡張** | 実装済み基盤活用、一貫性 | Python依存 | ✅ 採用 |
| B: Bashスクリプト | シンプル、ポータブル | パターンマッチング制限 | ❌ |
| C: Node.js組み込み | パフォーマンス最適 | Claude Code内部変更必要 | ❌ |

**採用理由**: 既存の hookify プラグインが Python で実装済み（pretooluse.py, rule_engine.py）であり、追加コードなしで設定のみで統合可能。

### 3.2 設定方法

settings.json での PreToolUse フック設定:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Edit|Write|MultiEdit|Bash",
        "hooks": [
          {
            "type": "command",
            "command": "python3 ~/.claude/plugins/.../hookify/hooks/pretooluse.py"
          }
        ]
      }
    ]
  }
}
```

---

## 4. 代替案検討

### 4.1 案A: 既存フック拡張（採用）

**概要**: 既存の hookify プラグインのフック処理をそのまま活用

**メリット**:

- [✓] 実装済み、テスト済み
- [✓] ルールエンジン完備（regex_match, contains等）
- [✓] エラー時は操作を許可（安全設計）

**デメリット**:

- [→] Python 3 必須
- [→] CLAUDE_PLUGIN_ROOT 環境変数設定必要

### 4.2 案B: コマンド内直接評価（不採用）

**概要**: 各コマンド（/commit, /code）内で直接 Glob + Grep でルール評価

**メリット**:

- ツール依存なし
- コマンドごとにカスタマイズ可能

**デメリット**:

- [?] 重複実装
- [?] 保守コスト増
- [?] 一貫性低下

**不採用理由**: DRY原則違反、既存実装との二重管理発生

---

## 5. リスク評価

### 5.1 技術的リスク

| リスク | 影響 | 確率 | 緩和策 |
|--------|------|------|--------|
| [→] Python未インストール環境 | フック不動作 | 低 | エラー時は操作許可（既存実装済み） |
| [→] ルール評価エラー | 誤ブロック | 低 | try-except + exit(0)（既存実装済み） |
| [?] パス解決エラー | インポート失敗 | 中 | PLUGIN_ROOT環境変数確認ガイド |

### 5.2 緩和策詳細

```python
# 既存実装: pretooluse.py line 61-70
except Exception as e:
    # On any error, allow the operation and log
    error_output = {
        "systemMessage": f"Hookify error: {str(e)}"
    }
    print(json.dumps(error_output), file=sys.stdout)

finally:
    # ALWAYS exit 0 - never block operations due to hook errors
    sys.exit(0)
```

**設計原則**: フック処理エラーは操作をブロックしない（安全優先）

---

## 6. パフォーマンス影響

### 6.1 オーバーヘッド見積もり

| 処理 | 予想時間 | 根拠 |
|------|---------|------|
| Python起動 | ~50ms | Python 3インタプリタ初期化 |
| ルールファイル読込 | ~10ms | 5-10ファイル × Glob + Read |
| パターンマッチング | ~5ms | Python re モジュール |
| **合計** | **~65ms** | ツール実行ごと |

### 6.2 許容範囲評価

- [✓] NFR-003 要件: < 100ms
- [✓] 現在のツール実行時間（数秒）に対して影響軽微
- [→] 体感上の遅延なし

### 6.3 最適化オプション（将来検討）

- ルールファイルのキャッシュ
- Python起動済みプロセス再利用（daemon化）

---

## 7. 実装タイムライン

### Phase 2 期間内（3-5日）

| 日 | タスク | 成果物 |
|----|--------|--------|
| 1 | 設計レビュー、既存実装確認 | この設計ドキュメント |
| 2 | settings.json フック設定 | 動作確認済み設定 |
| 3 | /commit 統合テスト | テストルール + 動作確認 |
| 4 | /code 統合テスト | テストルール + 動作確認 |
| 5 | ドキュメント更新 | SKILL.md + COMMANDS.md更新 |

---

## 8. 検証方法

### 8.1 単体テスト

```bash
# ルールファイル作成
cat > .claude/hookify.test-console.local.md << 'EOF'
---
name: test-console-log
enabled: true
event: file
pattern: console\.log\(
action: warn
---

⚠️ Test: console.log detected
EOF

# Edit ツール実行でwarning表示を確認
```

### 8.2 統合テスト

1. /commit 実行 → PreToolUse フック発火確認
2. console.log を含むコード編集 → warning 表示確認
3. block ルール発火 → 操作ブロック確認

---

## 9. Success Conditions チェックリスト

Spec FR-007 に基づく:

- [✓] 実装方針: フック処理のアーキテクチャを記載 (Section 2)
- [✓] 技術的決定: Python フック採用と理由 (Section 3)
- [✓] 代替案検討: 2つのアプローチ比較 (Section 4)
- [✓] リスク評価: 技術的リスクと緩和策 (Section 5)
- [✓] パフォーマンス影響: オーバーヘッド見積もり ~65ms (Section 6)
- [✓] 実装タイムライン: 5日計画 (Section 7)

---

## 10. 参照

- Hookify SKILL: ~/.claude/skills/creating-hooks/SKILL.md
- PreToolUse Hook: ~/.claude/plugins/.../hookify/hooks/pretooluse.py
- Rule Engine: ~/.claude/plugins/.../hookify/core/rule_engine.py
- SOW: ~/.claude/workspace/planning/20251216-175410-workflow-consistency-improvement/sow.md
