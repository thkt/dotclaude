# 検出パターン

## 検索コマンド

| パターン                  | コマンド                                                      |
| ------------------------- | ------------------------------------------------------------- |
| 空のcatch                 | `rg "catch\s*\([^)]*\)\s*\{\s*\}" --glob "*.{ts,tsx,js,jsx}"` |
| コメントのみのcatch       | `rg "catch\s*\([^)]*\)\s*\{\s*//.*\s*\}" --glob "*.{ts,tsx}"` |
| catchのないPromise        | `rg "\.then\([^)]+\)$" --glob "*.{ts,tsx,js,jsx}"`            |
| Consoleのみのハンドリング | `rg "catch.*console\.(log\|error\|warn)" --glob "*.{ts,tsx}"` |
| Fire and forget           | `rg "(fetch\|axios\|api)\([^)]+\)$" --glob "*.{ts,tsx}"`      |

## パターン例

| Badパターン                           | 問題                   | Good代替案                          |
| ------------------------------------- | ---------------------- | ----------------------------------- |
| `catch (e) { }`                       | サイレント障害         | ログ + 再スローまたはハンドル       |
| `catch (error) { // TODO }`           | TODOは永遠に完了しない | 今ハンドルまたはcatch削除           |
| `catch (_) { }`                       | アンダースコアは無意味 | 上記と同様                          |
| `catch (e) { console.log(e) }`        | ログのみで未処理       | ユーザーフィードバック + 適切な処理 |
| `fetchUser(id).then(u => setUser(u))` | エラーハンドリングなし | `.catch(handleError)` を追加        |

## 重大度分類

| パターン           | 重大度       | アクション                 |
| ------------------ | ------------ | -------------------------- |
| 空のcatchブロック  | クリティカル | 即座に修正                 |
| catchのないPromise | クリティカル | エラーハンドリング追加     |
| Console.logのみ    | 高           | ユーザーフィードバック追加 |
| Fire and forget    | 高           | awaitまたは.catch追加      |
| Error Boundary欠落 | 高           | 主要セクションをラップ     |

## ESLintルール

```json
{
  "rules": {
    "no-empty": ["error", { "allowEmptyCatch": false }],
    "@typescript-eslint/no-floating-promises": "error",
    "@typescript-eslint/no-misused-promises": "error"
  }
}
```
