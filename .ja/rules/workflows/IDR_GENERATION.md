# IDR (Implementation Decision Record) 生成

開発ライフサイクル全体を通じて実装決定を追跡します。

## 記録レイヤー

| レイヤー    | トリガー         | 記録内容               | 自動 |
| ----------- | ---------------- | ---------------------- | ---- |
| session-end | セッション終了時 | 実装内容、設計決定     | Yes  |
| /code       | 実装完了時       | 設計決定、トレードオフ | 任意 |
| /audit      | レビュー時       | 問題点、改善提案       | 任意 |
| /polish     | 整理時           | 削除・簡略化内容       | 任意 |
| /validate   | 検証時           | SOW適合性、ギャップ    | 任意 |

## 自動記録 (session-end hook)

セッション終了時に自動的に以下を記録：

| セクション | 内容                               |
| ---------- | ---------------------------------- |
| 実装内容   | Claudeが変更内容を要約             |
| 設計決定   | 主要な設計決定とその理由（あれば） |

## 確認ゲート (pre-commit hook)

コミット前の確認ゲート（IDRへの記録はしない）：

| ファイル          | 用途                       |
| ----------------- | -------------------------- |
| `.idr-confirm.md` | 確認質問（一時的、作業用） |

## 手動記録 (スラッシュコマンド)

より詳細な記録が必要な場合にスラッシュコマンドを使用：

| コマンド  | 使用タイミング         | 記録内容             |
| --------- | ---------------------- | -------------------- |
| /code     | 重要な設計決定をした時 | 決定理由、代替案     |
| /audit    | コードレビュー後       | 問題点、修正提案     |
| /polish   | リファクタリング後     | 削除内容、簡略化理由 |
| /validate | 実装完了時             | SOW適合性、残タスク  |

## IDRファイルの場所

| シナリオ | 検出方法                                        | パス                         |
| -------- | ----------------------------------------------- | ---------------------------- |
| SOWあり  | `~/.claude/workspace/planning/**/sow.md` を検索 | `[SOWディレクトリ]/idr.md`   |
| SOWなし  | 日付ベースのディレクトリ                        | `planning/YYYY-MM-DD/idr.md` |

## 統合

```mermaid
flowchart LR
    subgraph Auto["自動記録"]
        W[Write/Edit] --> L[idr-log.sh]
        L --> P[.pending-idr.log]
        P --> C[git commit]
        C --> H[pre-commit hook]
        H --> IDR[idr.md]
    end

    subgraph Manual["手動記録"]
        CODE["/code"] --> IDR
        AUDIT["/audit"] --> IDR
        POLISH["/polish"] --> IDR
        VAL["/validate"] --> IDR
    end
```

## 関連

- Hook: `~/.claude/hooks/lifecycle/idr-log.sh`
- Hook: `~/.claude/hooks/lifecycle/idr-pre-commit.sh`
- SOWテンプレート: `~/.claude/templates/sow/template.md`
