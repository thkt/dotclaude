---
name: reviewing-security
description: >
  OWASP Top 10に基づくセキュリティレビューと脆弱性検出。トリガー:
  セキュリティ, 脆弱性, XSS, SQL injection, SQLインジェクション, CSRF,
  認証, 認可, 暗号化, OWASP, SSRF, パスワード, セッション, rate limiting,
  brute force, command injection, security misconfiguration.
allowed-tools: Read, Grep, Glob, Task
---

# セキュリティレビュー - OWASP Top 10ベース

OWASP Top 10に基づく脆弱性検出とセキュアな実装ガイダンス。

## セクションベースのロード

| セクション | ファイル | フォーカス | トリガー |
| --- | --- | --- | --- |
| 基本セキュリティ | `references/owasp-basic.md` | OWASP 1,2,7: アクセス制御、暗号化、認証 | auth, password, session |
| インジェクション | `references/owasp-injection.md` | OWASP 3: SQL/NoSQL/Command, XSS, CSRF | injection, XSS, CSRF |
| 上級 | `references/owasp-advanced.md` | OWASP 4-6,8-10: 設計、設定、監視、SSRF | rate limiting, SSRF, logging |

## セキュリティレビューチェックリスト

### ステップ1: 入力バリデーション

- [ ] すべてのユーザー入力がサニタイズされている
- [ ] SQLクエリがパラメータ化ステートメントを使用
- [ ] ユーザー入力がコマンド実行で直接使用されていない
- [ ] XSS防御（エスケープ）が適用されている

### ステップ2: 認証と認可

- [ ] パスワードが適切にハッシュ化（bcrypt推奨）
- [ ] セキュアなセッション管理（HttpOnly, Secure, SameSite）
- [ ] JWT有効期限が適切に設定
- [ ] すべてのエンドポイントで認可チェック

### ステップ3: データ保護

- [ ] 機密データがログに記録されていない
- [ ] HTTPSが強制されている
- [ ] APIキーがハードコードされていない

### ステップ4: エラーハンドリング

- [ ] 詳細なエラーメッセージが本番環境で非表示
- [ ] スタックトレースがユーザーに露出されていない

### ステップ5: 依存関係

```bash
npm audit  # または yarn audit
```

- [ ] 既知の脆弱性なし

## 主要原則

| 原則 | 説明 |
| --- | --- |
| 多層防御 | 単一の対策に依存しない |
| 最小権限 | 最小限の権限 |
| 安全に失敗 | 失敗時も安全 |
| デフォルトでセキュア | デフォルトで安全 |

## 参照

- [@./references/owasp-basic.md](./references/owasp-basic.md) - アクセス制御、暗号化、認証
- [@./references/owasp-injection.md](./references/owasp-injection.md) - SQL/XSS/CSRF
- [@./references/owasp-advanced.md](./references/owasp-advanced.md) - 設計、設定、監視
