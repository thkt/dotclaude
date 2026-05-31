# Steps 9-10: Spec レビューとタスク分割

## Step 9: Spec レビュー

Spec 生成後、`reviewer-spec` を起動する。

Gate = Ready → 通過。Gate = NotReady → P0 ブロッカーを修正し再起動 (最大 3 ループ)。3 ループ後、残るブロッカーをユーザーに提示して進める。

## Step 10: タスク分割

### 原則

| 原則                     | ルール                                                     |
| ------------------------ | ---------------------------------------------------------- |
| アウトカム起点の Phase   | 1 AC = 1 Phase。各 Phase は 1 つの受け入れシグナルを届ける |
| 完了基準の必須化         | 各 Phase で完了を示す観察可能なシグナルを明示              |
| 並列グルーピング         | 並列化可能なら 1 Phase 1 タスクにしない                    |
| 最初の一手を明示         | どのタスクから始めるか、その理由を述べる                   |
| スコープ削減はリーフのみ | コア依存タスクは交渉不可                                   |
| 緊急パニックなし         | 反応的でなく構造的に分析する                               |

### TaskCreate

セッション横断: `export CLAUDE_CODE_TASK_LIST_ID="[feature]-tasks"` (タスク最大 10)

| ソース              | subject                         | description            | addBlockedBy     |
| ------------------- | ------------------------------- | ---------------------- | ---------------- |
| Implementation Plan | `Phase N (AC-M): [description]` | Steps + validates AC-M | [dependency IDs] |
| Test Plan (HIGH)    | `Test: [description]`           | (複雑な場合)           | [dependency IDs] |

### スコープ検証

<!-- canonical: rules/core/PREFLIGHT.md (decomposition thresholds) -->

各 Phase は 1 つの AC を届ける。AC を Phase にマップしたあと、Phase あたりのユニークファイル数を数える。Files ≥ 5 の Phase は独立 Unit に分割する (各 Unit が独自の SOW/Spec を持つ)。これで認知負荷を御せる範囲に保つ。すべての Phase が Files < 5 になるまで繰り返す。

ここでの分割は AC をより小さな outcome ユニット (それぞれ独自の観察可能なシグナルを持つ) に再分解することであり、実装をスライスすることではない。新しい AC をユーザーと確認する。これは contract の変更であり、内部の再構成だけではない。

### マイルストーンサマリ

```text
Phase 1 (AC-N): タスクリスト (完了基準: 観察可能なシグナル)
Phase 2 (AC-M): ...
```

### 最初の一手

```text
→ Task N: [根拠: なぜこれが下流の作業を最も解放するか]
```

### スコープ削減候補

リーフタスクのみ。コア依存は交渉不可。
