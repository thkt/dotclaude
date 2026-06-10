---
status: "accepted"
date: 2026-06-10
decision-makers: thkt
---

# ADR-0073: .ja を意図の正とするミラー運用への転換

## Context and Problem Statement

dotclaude は英語版 (Claude Code がロードする `agents/` `skills/` `rules/` `docs/`) と `.ja/` (日本語対訳) のペアを手動ミラーで維持してきた。従来の運用は EN canonical で、`.ja/` は「英語版の日本語翻訳ミラー」という位置付けだった。ただしこの運用はリポジトリ内に明文化されておらず、セッション横断の memory にのみ存在していた。

実際の編集起点はユーザーによる `.ja/` の直接修正であることが多く、正 (EN) と編集起点 (JA) が逆立ちしていた。JA 先行の変更が「ミラーの逸脱」なのか「EN へ反映すべき意図変更」なのか、判断の規範がなかった。また両者が食い違ったとき、どちらに合わせるかの規範もなかった。

## Decision Drivers

- ユーザーの編集起点は日本語版。規約やスキルの推敲は JA で行われる
- EN canonical の下では JA 先行変更の扱いが曖昧で、EN への反映根拠が弱い
- 片側更新による drift が実際に発生している (#55: ADR-0025 の /goal 移行が `.ja/` に未反映だった ralph-loop drift)
- ミラー運用が未明文化で、AI セッションの memory にのみ依存していた

## Considered Options

### Option 1: JA canonical (採用)

`.ja/` を意図の正とし、英語版を実行物 (ロード対象・配布物) とする。ユーザーは JA を編集し、AI が EN へ反映して同一コミットで両方更新する。

- Good: 編集起点と正が一致し、JA 修正の反映フローが明確になる
- Good: 衝突時の解決規範が定まる (JA に合わせて EN を直す)
- Bad: EN が実行物のため、JA→EN 翻訳の精度が実行品質に直結する
- Bad: JA→EN 反映忘れは Claude Code の挙動が変わらず静かに沈む

### Option 2: EN canonical 維持 (現状)

- Good: 実行物と正が同一ファイルで、反映忘れが挙動に現れる
- Bad: 編集起点 (JA) と正 (EN) の逆立ちが解消されない
- Bad: JA 先行変更の反映判断が曖昧なまま残る

### Option 3: 双方向対等 (編集した側が正)

- Good: どちらを編集してもよく、運用が軽い
- Bad: 衝突時にどちらへ合わせるかが決まらず、規範として機能しない

## Decision Outcome

Chosen: Option 1。`.ja/` を意図の正、英語版を実行物とする。

従来運用から変わるのは「衝突時の正」と「標準フロー」の 2 点のみ。以下の不変条件は維持する。

| 不変条件           | 内容                                                                             |
| ------------------ | -------------------------------------------------------------------------------- |
| 同一コミット規律   | JA と EN は同一コミットで両方更新する。反映忘れの防衛線                          |
| 構造的英語リテラル | example markdown ブロック、table ヘッダ、verdict/enum 値は `.ja/` でも英語のまま |
| ADR はミラー対象外 | `docs/decisions/` は単一ファイルに日本語本文で書く (`.ja/docs/decisions/` なし)  |

## Positive Consequences

- JA 修正が一級の意図変更として扱われ、EN への反映が標準フローになる
- 衝突時は JA に合わせて EN を直すという解決規範が定まる
- EN だけ調整した場合は JA への逆反映が義務になり、drift が双方向で塞がれる

## Negative Consequences

- JA→EN 翻訳の精度が実行品質に直結する。意訳のずれが Claude Code の挙動差になりうる
- JA→EN 反映忘れは挙動が変わらず静かに沈む。同一コミット規律と PR レビューで防ぐ

## Scope

適用対象:

- `agents/` `skills/` `rules/` `docs/` とその `.ja/` ミラー
- セッション横断 memory (project_dotclaude-ja-mirror) の運用記述

対象外:

- `docs/decisions/` (ミラーなし、日本語本文の単一ファイル)
- `workspace/` 配下 (planning/research は作業記録でミラー対象外)
- memory 自体の git 管理 (`.gitignore` で `/projects/` 除外済み)

## Reassessment Triggers

- JA→EN 反映漏れや翻訳ずれによる実行品質の問題が頻発した時
- 英語話者コラボレーターが増え、EN 起点の編集が主流になった時
- 自動翻訳・同期ツールを導入し、手動ミラーの前提が変わった時

## Related ADRs

ミラー運用を定義した既存 ADR はない (本 ADR が初出。従来運用は memory にのみ存在)。

- [ADR-0025: ralph-loop を退役しネイティブ /goal を採用](0025-retire-ralph-loop-adopt-native-goal.md) - 本文変更が `.ja/` に未反映のまま残った drift 事例 (#55)。本 ADR の Decision Driver

---

_Created: 2026-06-10_
_Author: thkt_
_ADR Number: 0073_
