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

<!-- Phase 2-3 の出力を Phase 5 のソースパスを通したもの。すべての発見事項を Priority 昇順で記載。 -->

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

<!-- Phase 5 の出力。Phase 3 を実施したときは `Covered by Phase 3 elimination` と書く。Phase 3 を省略したときは Phase 2 の scratch から実行コマンドと生の出力を verbatim で引用する。0 件の結果は「不在」と断じる前に「ツール誤用の可能性」とみなす。 -->

コマンド: `ugrep -n 'rateLimit|throttle' middleware/auth.ts tests/auth.test.ts`

生の出力は以下のとおり。

```
(no matches)
```

結果: 該当なし。`grep -E 'rateLimit|throttle'` (同結果)、および `yomu search "rate limit auth refresh"` (ヒットなし) でクロスチェック済み。並行 refresh シナリオは未網羅、不在を確認した。

## References

<!-- Findings や Evidence で引用された外部ドキュメント、Issue、過去調査ファイル。 -->

| パス                                     | 説明                                         |
| ---------------------------------------- | -------------------------------------------- |
| `2026-04-15-auth-research.md`            | 過去調査、引き継ぎ済み発見事項のベースライン |
| `https://www.rfc-editor.org/rfc/rfc6749` | OAuth 2.0 spec                               |
| `github.com/org/repo/issues/1234`        | トラッキング Issue                           |

## カバレッジ注記

<!-- Phase 5 のカバレッジチェック出力。unknown と注記した Phase 1 の質問と、それを解消する調査方法を列挙する。Phase 2 の cross-method 検証で見つかったツール不一致を記録。Phase 4 の advisor 結果 (または省略理由) を注記する。 -->

- Refresh-token のストレージバックエンド: Key Findings で unknown と注記。次セッションで `config/storage.ts` を読んで解決。
- ツール不一致 (Phase 2): yomu search "ratelimit" は 2 件ヒット、ugrep は 0 件。調査の結果、ugrep の alternation 構文が誤りだった。`grep -E` で訂正済み。
- Advisor (Phase 4): 見落とし領域なし。(または: 省略、理由: Phase 0 の引き継ぎのみ、Intent = Understanding、repo を跨ぐ主張なし)

## Next Steps

| Intent             | Next Command |
| ------------------ | ------------ |
| Feature planning   | `/think`     |
| Bug investigation  | `/fix`       |
| Understanding only | complete     |
