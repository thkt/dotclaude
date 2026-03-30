# Trust Score アルゴリズム

Trust Scoreはpost-integratorのreconciled evidenceから検証信頼度を定量化する（0-100整数）。

## コンポーネント

| コンポーネント       | 最大 | ソース                       |
| -------------------- | ---- | ---------------------------- |
| Build                | 20   | Phase 1c outcome evidence    |
| Tests                | 20   | Phase 1c outcome evidence    |
| Reconciled findings  | 30   | Phase 3 integrator出力       |
| Adversarial survival | 30   | Phase 2.5 intent検証済み結果 |

Total = Build + Tests + Findings + Adversarial。[0, 100]にクランプ。

## Build（0 または 20）

| 条件                   | スコア |
| ---------------------- | ------ |
| ビルド成功（exit 0）   | 20     |
| ビルド失敗（exit > 0） | 0      |
| ブートストラップ失敗   | 10     |

| ブートストラップ失敗時 | 理由                     |
| ---------------------- | ------------------------ |
| 0ではなく10            | 静的レビューアは実行済み |
| 20ではなく10           | outcome evidenceが欠如   |

## Tests（0 または 20）

| 条件                 | スコア |
| -------------------- | ------ |
| 全テスト通過         | 20     |
| テスト失敗あり       | 0      |
| テストランナー未検出 | 10     |
| ブートストラップ失敗 | 10     |

Buildと同じ理由で部分スコア。

## Reconciled Findings（0-30）

reconciled（post-integrator）findingsのseverity加重カウントに基づく。

```
weight = (high_count * 3) + (medium_count * 1)
score  = max(0, 30 - (weight * 3))
```

| Severity加重カウント | スコア |
| -------------------- | ------ |
| 0                    | 30     |
| 1-2                  | 27-24  |
| 3-5                  | 21-15  |
| 6-9                  | 12-3   |
| 10+                  | 0      |

reconciled findingsのみカウント。disputed（インテグレーターが除外済み）は
スコアに影響しない。

## Adversarial Survival（0-30）

intent検証済みadversarialテストのpass rateに基づく。

```
survival_rate = passed_tests / total_tests
score = round(30 * survival_rate)
```

| 条件                             | スコア |
| -------------------------------- | ------ |
| 全エッジケーステスト通過         | 30     |
| 80% 通過                         | 24     |
| 50% 通過                         | 15     |
| 0% 通過                          | 0      |
| adversarialテスト未実行          | 15     |
| ブートストラップ失敗（スキップ） | 15     |

adversarial testingスキップ時はデフォルト15（中立）。0（懲罰的）ではない:
証拠の不在は不在の証拠ではないため。

## マージゲート

Zero-tolerance: reconciled finding 1件でもあればマージブロック。

| 条件                                         | 判定           |
| -------------------------------------------- | -------------- |
| Reconciled findings = 0 かつ score >= 90     | マージへ進む   |
| Reconciled findings > 0                      | マージブロック |
| Score < 90（build/test/adversarialギャップ） | マージブロック |

## 解釈

スコアは重大度の指標。マージ判定はマージゲートが決定する。

| 範囲   | 意味                                             |
| ------ | ------------------------------------------------ |
| 90-100 | 高信頼度。findingsなし、エビデンス完全           |
| 70-89  | 部分的なエビデンスギャップまたは adversarial失敗 |
| 50-69  | 重大な問題またはエビデンス不足                   |
| 0-49   | 危険。build/test失敗または多数のfindings         |

## レポート形式

```markdown
Trust Score: NN/100

| コンポーネント       | スコア | 詳細                             |
| -------------------- | ------ | -------------------------------- |
| Build                | /20    | pass / fail                      |
| Tests                | /20    | pass / fail (N passed, M failed) |
| Reconciled findings  | /30    | N findings (H high, M medium)    |
| Adversarial survival | /30    | N/M エッジケーステスト通過       |
```
