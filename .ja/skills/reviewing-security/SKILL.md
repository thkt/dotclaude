---
name: reviewing-security
description: OWASP Top 10に基づくセキュリティレビューと脆弱性検出。
allowed-tools: [Read, Grep, Glob, Task]
agent: security-reviewer
user-invocable: false
---

# セキュリティレビュー - OWASP Top 10

OWASP Top 10に基づく脆弱性検出とセキュアな実装ガイダンス。

## セクションベースのロード

| セクション       | ファイル                        | フォーカス                 |
| ---------------- | ------------------------------- | -------------------------- |
| 基本セキュリティ | `references/owasp-basic.md`     | アクセス制御、暗号化、認証 |
| インジェクション | `references/owasp-injection.md` | SQL/XSS/CSRF               |
| 上級             | `references/owasp-advanced.md`  | 設計、設定、SSRF           |

## クイックチェックリスト

### 入力バリデーション

- [ ] すべてのユーザー入力がサニタイズされている
- [ ] SQLがパラメータ化ステートメントを使用
- [ ] コマンドインジェクションなし
- [ ] XSS防御が適用されている

### 認証とセッション

- [ ] パスワードがハッシュ化（bcrypt）
- [ ] HttpOnly, Secure, SameSite cookies
- [ ] JWT有効期限が設定
- [ ] すべてのエンドポイントで認可チェック

### データ保護

- [ ] 機密データがログに記録されていない
- [ ] HTTPSが強制されている
- [ ] APIキーがハードコードされていない

### 依存関係

- [ ] `npm audit` / `yarn audit` クリーン

## 主要原則

| 原則             | 説明                   |
| ---------------- | ---------------------- |
| 多層防御         | 単一の対策に依存しない |
| 最小権限         | 最小限の権限           |
| 安全に失敗       | 失敗時も安全           |
| デフォルトで安全 | デフォルトでセキュア   |
