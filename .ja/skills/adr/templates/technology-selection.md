# 技術選定テンプレート

ライブラリ、フレームワーク、サービス、インフラコンポーネントの採用判断を記録するためのガイド。

## 使用場面

| シナリオ                             |
| ------------------------------------ |
| ライブラリやフレームワークの選択     |
| インフラコンポーネントの選定         |
| 新しいツールやサービスの導入         |

## 必須セクション (MADR コア)

| # | セクション                    | 目的                                                  |
| - | ----------------------------- | ----------------------------------------------------- |
| 1 | Title                         | アクション指向。例: `XをYに採用`                      |
| 2 | Status                        | `proposed` / `accepted` / `deprecated` / `superseded` |
| 3 | Context and Problem Statement | なぜ今この判断が必要か                                |
| 4 | Decision Drivers              | 判断に影響を与える要因                                |
| 5 | Considered Options            | 最低 3 つの選択肢。各々に Good / Bad の箇条書き       |
| 6 | Decision Outcome              | `Chosen option: X, because Y` 形式                    |
| 7 | Consequences                  | ポジティブ・ネガティブな影響                          |

メタデータ行: `- Confidence: {level}. {根拠}`。再評価は Consequences の後に任意の `## Reassessment Triggers` セクションで。

## テンプレート固有セクション

| セクション            | 目的                                             |
| --------------------- | ------------------------------------------------ |
| Implementation Plan   | 技術を導入する具体的なステップ                   |
| Migration Strategy    | 現状からの移行方法                               |
| Rollback Plan         | 導入失敗時の撤退方法                             |
| Success Criteria      | 判断を検証する測定可能な成果                     |

## 例

```markdown
# React Router v7 への移行

- Status: accepted
- Deciders: チーム全体
- Date: 2026-01-13
- Confidence: high. チームが React Router に習熟。移行パスが明文化済み。

## Context and Problem Statement

現在の React Router v6 は保守的なアップデートのみ提供されており、v7 では型安全なルーティングやデータローディングの改善が含まれる。

## Decision Drivers

- 型安全性の向上が開発速度に直結
- v6 のサポート期限が迫っている
- チームが既に React Router に習熟している

## Considered Options

### React Router v7

現行ルーターのメジャーアップグレード。

- Good: 移行コストが最小 (既存知識を活用)
- Good: 型安全なルーティング
- Bad: 一部 API の破壊的変更

### TanStack Router

型安全性に特化した新しいルーター。

- Good: TypeScript ファーストの設計
- Good: 検索パラメータの型安全性
- Bad: 学習コストが高い
- Bad: エコシステムが小さい

### Next.js App Router

フルスタックフレームワークへの移行。

- Good: SSR / SSG の統合
- Bad: アーキテクチャの大幅な変更が必要
- Bad: 現在の SPA 構成との互換性なし

## Decision Outcome

React Router v7 を採用。移行コストと得られる利益のバランスが最も良い。

### Positive Consequences

- 型安全なルーティングで実行時エラーが減少
- チームの既存知識を最大限活用

### Negative Consequences

- 破壊的変更への対応に一定の工数が必要

## Migration Strategy

Phase 1. 開発環境でのアップグレードと動作確認。
Phase 2. 破壊的変更の修正。
Phase 3. 本番デプロイ。

## Rollback Plan

package.json を v6 に戻し、変更した API 呼び出しを revert する。

## Reassessment Triggers

- TanStack Router が 1.0 stable に達し、型安全ルーティングの代替を再評価する場合
- React Router v7 がマイナーリリースで破壊的変更を導入した場合
```
