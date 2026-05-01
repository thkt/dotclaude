---
name: use-context-reviewer-security
description: OWASP Top 10 のセキュリティ レビュー。可読性は use-context-reviewer-readability、型エラーは use-context-reviewer-strictness、テスト設計は use-context-reviewer-testability に使う。
when_to_use: security, OWASP, XSS, SQL injection, セキュリティ, 脆弱性, cloud security, AWS, IAM, Terraform, クラウドセキュリティ, インフラ
allowed-tools: Read Grep Glob Task
agent: reviewer-security
context: fork
user-invocable: false
---

# セキュリティ レビュー

## 検出 (OWASP Top 10)

| ID  | カテゴリ                  | パターン                                                | 修正                                   |
| --- | ------------------------- | ------------------------------------------------------- | -------------------------------------- |
| A01 | Broken Access Control     | 認証なし、IDOR、path traversal                          | 認証ミドルウェア、所有権チェック       |
| A02 | Cryptographic Failures    | `password: 'plaintext'`                                 | bcrypt/argon2 ハッシュ化               |
| A03 | Injection                 | `db.query(\`SELECT...${id}\`)`                          | パラメータ化クエリ、ORM                |
| A03 | Injection                 | `exec(\`ping ${host}\`)`                                | 入力バリデーション、ライブラリで代替   |
| A03 | XSS                       | `dangerouslySetInnerHTML` (静的に存在)                  | デフォルト エスケープ、DOMPurify       |
| A05 | Security Misconfiguration | `cors({ origin: '*' })`                                 | 明示的な origin 許可リスト             |
| A05 | Security Misconfiguration | `cookie: {}` (オプションなし)                           | secure, httpOnly, sameSite: 'strict'   |
| A05 | Security Misconfiguration | エラー応答の `err.stack` で `NODE_ENV` ガードなし       | 本番では汎用メッセージ、内部だけにログ |
| A09 | Logging Failures          | `logger.info({ password })`                             | センシティブ フィールドを除外          |
| A10 | SSRF                      | `fetch(userInputUrl)`                                   | URL バリデーション、許可リスト         |
| A03 | XSS (Taint)               | サニタイザなしの `dangerouslySetInnerHTML={{ __html }}` | 境界で DOMPurify.sanitize() を呼ぶ     |
| A03 | XSS (Taint)               | 関数引数, `innerHTML` でサニタイズなし                  | 関数境界でサニタイズ                   |
| A03 | XSS (Taint)               | ユーザー制御 URL を持つ `<a href={variable}>`           | プロトコル許可リスト (https/http のみ) |
| A01 | Open Redirect (Taint)     | URL パラメータ, `location.href` でバリデーションなし    | ドメイン許可リストまたは相対のみ       |
| A04 | Insecure Design           | origin チェックなしの `postMessage` ハンドラ            | `event.origin` の厳密比較              |
| A02 | Sensitive Data Exposure   | localStorage/sessionStorage に保存された JWT            | httpOnly cookie に置き換える           |

## 信頼度しきい値

confidence >=0.60 の発見事項を報告する。0.60-0.80: verification_hint を含める。>=0.80: 完全な悪用シナリオと修正推奨を含める。常に file:line を含める。

## 参照ファイル

| トピック  | 範囲             | ファイル                                                   |
| --------- | ---------------- | ---------------------------------------------------------- |
| Basic     | A01, A02, A07    | ${CLAUDE_SKILL_DIR}/references/owasp-basic.md              |
| Injection | A03              | ${CLAUDE_SKILL_DIR}/references/owasp-injection.md          |
| Advanced  | A04-A06, A08-A10 | ${CLAUDE_SKILL_DIR}/references/owasp-advanced.md           |
| Cloud     | IAM, IaC, CI/CD  | ${CLAUDE_SKILL_DIR}/references/cloud-infrastructure.md     |
| Frontend  | Taint analysis   | ${CLAUDE_SKILL_DIR}/references/frontend-taint-checklist.md |
