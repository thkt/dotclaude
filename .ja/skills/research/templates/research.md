# Research: <slug>

Generated: YYYY-MM-DD
Session: <session-id>
Intent: Feature planning | Bug investigation | Understanding
Domain: Data model | API | Infrastructure | General
Prior research: <slug of inherited file, or "none found">


## 目的

<!-- Phase 1 の入力。1-2 文でこの調査のゴールを記述する。 -->

... を ... のために調査する。

## Key Findings

<!-- Phase 2-3 の出力を Phase 4 のソースパスを通したもの。すべての発見事項を Priority 昇順で記載。 -->

| Priority | 発見事項                                          | ソース                                             | 次のアクション               |
| -------- | ------------------------------------------------- | -------------------------------------------------- | ---------------------------- |
| 1        | Auth handler が JWT を 24h 有効期限で使用         | `api/auth.ts:42`                                   | refresh フローを検証         |
| 2        | Token refresh はおそらく rate-limit を欠いている  | inferred from `middleware/auth.ts:18` (no limiter) | 負荷試験で確認               |
| 3        | Refresh-token のストレージバックエンド            | unknown, requires reading `config/storage.ts`      | 次セッションで config を読む |
| 4        | ドメインエンティティの境界 (過去調査から引き継ぎ) | from `2026-04-15-auth-research.md`, re-verified    | -                            |

## 利用可能なデータ

<!-- Phase 2 の出力。`Type` は自由記述 (例: File, Tech, Convention, Env, Config)。空ならこのセクションを省略。 -->

| Type       | 項目          | メモ                                          |
| ---------- | ------------- | --------------------------------------------- |
| File       | `api/auth.ts` | JWT の発行 / 検証エントリポイント             |
| Tech       | `jose v5.2`   | JWT ライブラリ、key rotation 対応             |
| Convention | error format  | `{ code, message, traceId }` を `api/` 全体で |

## 制約

<!-- Phase 0 の引き継ぎ + Phase 2 の発見。該当なしのカテゴリの行は省略。すべて空ならセクション全体を省略。 -->

| カテゴリ    | 制約                                  |
| ----------- | ------------------------------------- |
| Security    | トークンを平文ログに残してはならない  |
| Performance | Auth handler の p95 レイテンシ < 50ms |

## 仮説ログ

<!-- Phase 3 の Strong Inference 出力。Intent = Bug investigation のときのみ含める。それ以外は省略。 -->

| #   | 仮説                                             | 識別可能なテスト                     | 結果       |
| --- | ------------------------------------------------ | ------------------------------------ | ---------- |
| 1   | Token expiry が誤ったタイムゾーンを使っている    | `auth.ts` を `Date.now\|UTC` で grep | Eliminated |
| 2   | Middleware が OPTIONS preflight でスキップされる | `curl -X OPTIONS`、ログ確認          | Confirmed  |
| 3   | 並行 refresh の競合                              | 10 並行 refresh リクエストをリプレイ | Eliminated |

## Disconfirmation チェック

<!-- Phase 4 の出力。Phase 3 を実施したときは `Covered by Phase 3 elimination` と書く。Phase 3 を省略したときは、主要な仮説に反する根拠を 1 つ探し、found / not found を記録。 -->

検索: `middleware/auth.ts` と `tests/auth.test.ts` で、token refresh が rate-limit なしに成功するケース。
結果: 該当なし。テストは並行 refresh シナリオを網羅していない。

## References

<!-- Findings や Evidence で引用された外部ドキュメント、Issue、過去調査ファイル。 -->

| パス                                     | 説明                                         |
| ---------------------------------------- | -------------------------------------------- |
| `2026-04-15-auth-research.md`            | 過去調査、引き継ぎ済み発見事項のベースライン |
| `https://www.rfc-editor.org/rfc/rfc6749` | OAuth 2.0 spec                               |
| `github.com/org/repo/issues/1234`        | トラッキング Issue                           |

## カバレッジ注記

<!-- Phase 4 のカバレッジチェック出力。unknown と注記した Phase 1 の質問と、それを解消する調査方法を列挙する。 -->

- Refresh-token のストレージバックエンド: Key Findings で unknown と注記。次セッションで `config/storage.ts` を読んで解決。

## Next Steps

| Intent             | Next Command |
| ------------------ | ------------ |
| Feature planning   | `/think`     |
| Bug investigation  | `/fix`       |
| Understanding only | complete     |
