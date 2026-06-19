---
name: prototype
description: 問いに答える使い捨てプロトタイプを作る。ロジック/状態の問いには runnable なターミナルアプリ、見た目の問いには 1 ルート上の複数 UI variant。ユーザー起動専用。
when_to_use: プロトタイプ, 試作, prototype, throwaway, UI variant を試したい
allowed-tools: Read Write Edit LS Bash(ugrep:*) Bash(bfs:*) AskUserQuestion
model: opus
argument-hint: "[プロトタイプで答えたい設計上の問い]"
---

# /prototype - 使い捨て設計プロトタイプ

プロトタイプは問いに答える使い捨てコード。問いが形を決める。

## 入力

- 設計上の問い: `$ARGUMENTS`
- `$ARGUMENTS` が空なら AskUserQuestion で問いを取得

## 起動方針

ユーザー起動専用。モデルが実装作業の途中で勝手にプロトタイプを始めない。明示的な依頼 (`/prototype` 起動、または when_to_use の trigger 語) でのみ動く。

## 分岐選択

答える問いの種類で分岐を決める。ユーザーのプロンプト、周辺コード、またはユーザー在席なら確認で判定する。

| 問い                            | 分岐  | 参照                |
| ------------------------------- | ----- | ------------------- |
| このロジック/状態モデルは妥当か | LOGIC | references/logic.md |
| これはどう見えるべきか          | UI    | references/ui.md    |

2 つの分岐は全く異なる成果物を生む。誤ると prototype 全体が無駄になる。問いが本当に曖昧でユーザーが不在なら、周辺コードで既定する (backend module なら logic、page/component なら UI)。その前提を prototype の冒頭に明記する。

## 両分岐の共通ルール

| ルール             | 指示                                                                                                                                                                     |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 初日から使い捨て   | 実際に使う場所の近くに置く。だが prototype と一目で分かる命名にして production と区別する。throwaway UI route は既存の routing 規約に従い、新規 top-level 構造を作らない |
| 1 コマンドで起動   | 既存の task runner (`pnpm <name>` / `python <path>` / `bun <path>` など) に登録する。ユーザーが何も考えず起動できる状態にする                                            |
| 既定で永続化しない | 状態はメモリ上に持つ。永続化は prototype が検証する対象であって、依存先ではない。問いが DB を含むなら scratch DB か "PROTOTYPE wipe me" 名のローカルファイルに当てる     |
| 磨きを省く         | テストなし。runnable にする以上の error handling なし。抽象化なし。速く学んで消すのが目的                                                                                |
| 状態を露出する     | アクション後 (logic) または variant 切替時 (UI) に、関連する状態を全部表示する                                                                                           |
| 完了時に削除か吸収 | 問いに答えたら、削除するか、検証済みの決定を本番コードに畳み込む。repo に腐らせて残さない                                                                                |

## 完了時

prototype から残す価値があるのは問いへの答えだけ。問いと答えを durable な場所 (commit message、ADR、issue、または prototype 隣の `NOTES.md`) に記録する。ユーザー在席ならその記録は短い会話で済む。不在なら placeholder を残し、次のパスで verdict を埋めてから prototype を削除する。
