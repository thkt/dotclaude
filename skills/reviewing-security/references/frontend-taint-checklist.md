# Frontend Taint Checklist

Taint analysis patterns for frontend code review. These require data flow understanding beyond regex pattern matching and complement the guardrails static rules.

## Taint Patterns

### 1. dangerouslySetInnerHTML without Sanitizer

**Source**: User input, API response, URL parameter
**Sink**: `dangerouslySetInnerHTML={{ __html: value }}`

| Check              | Question                                                                         |
| ------------------ | -------------------------------------------------------------------------------- |
| Sanitizer present? | Is `DOMPurify.sanitize()` or equivalent called before assignment?                |
| Sanitizer config?  | Does sanitizer config allow dangerous tags (`<script>`, `<iframe>`, `<object>`)? |
| Bypass possible?   | Can the sanitizer be skipped via conditional logic or error handling?            |

```tsx
// VULNERABLE: unsanitized API response
<div dangerouslySetInnerHTML={{ __html: apiResponse.body }} />

// SAFE: sanitized before use
<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(apiResponse.body) }} />
```

### 2. postMessage Origin Verification

**Source**: `window.addEventListener('message', handler)`
**Sink**: DOM manipulation, state update, navigation within handler

| Check           | Question                                                             |
| --------------- | -------------------------------------------------------------------- |
| Origin checked? | Does the handler verify `event.origin` against an allowlist?         |
| Origin strict?  | Is origin compared with `===`, not `.includes()` or `.startsWith()`? |
| Data validated? | Is `event.data` validated/typed before use?                          |

```ts
// VULNERABLE: no origin check
window.addEventListener("message", (e) => {
  setState(e.data); // any origin can inject data
});

// SAFE: strict origin verification
window.addEventListener("message", (e) => {
  if (e.origin !== "https://trusted.example.com") return;
  const data = schema.parse(e.data);
  setState(data);
});
```

### 3. URL Parameter to Redirect Flow

**Source**: `URLSearchParams`, `location.search`, `location.hash`, route params
**Sink**: `location.href`, `location.replace()`, `location.assign()`, `window.open()`

| Check           | Question                                                                  |
| --------------- | ------------------------------------------------------------------------- |
| Allowlist?      | Is the redirect target validated against an allowlist of allowed domains? |
| Relative only?  | Is the URL forced to be relative (no protocol, no `//`)?                  |
| Protocol check? | Are `javascript:` and `data:` protocols blocked?                          |

```ts
// VULNERABLE: URL param used directly for redirect
const next = new URLSearchParams(location.search).get("next");
location.href = next; // open redirect

// SAFE: parse URL and validate origin + pathname
const next = new URLSearchParams(location.search).get("next");
if (next) {
  const url = new URL(next, location.origin);
  if (url.origin === location.origin && ALLOWED_PATHS.some((p) => url.pathname.startsWith(p))) {
    location.href = url.pathname;
  }
}
```

### 4. Function Argument to DOM Method

**Source**: Function parameter, callback argument
**Sink**: `innerHTML`, `outerHTML`, `insertAdjacentHTML()`, `document.write()`

| Check                  | Question                                                                     |
| ---------------------- | ---------------------------------------------------------------------------- |
| Caller audited?        | Are all call sites passing safe (sanitized or literal) values?               |
| Type enforced?         | Does the function signature restrict input type (e.g., branded type)?        |
| Sanitizer at boundary? | Is sanitization applied at the function boundary, not caller responsibility? |

```ts
// VULNERABLE: function trusts caller to sanitize
function renderContent(html: string) {
  container.innerHTML = html; // any caller can pass unsanitized input
}

// SAFE: sanitization at boundary
function renderContent(html: string) {
  container.innerHTML = DOMPurify.sanitize(html);
}
```

### 5. JWT in localStorage

**Source**: Authentication response, token refresh
**Sink**: `localStorage.setItem('token', jwt)`, `sessionStorage.setItem('auth', jwt)`

| Check         | Question                                                                          |
| ------------- | --------------------------------------------------------------------------------- |
| Storage type? | Is `httpOnly` cookie used instead of localStorage/sessionStorage?                 |
| XSS exposure? | Does the app have XSS mitigations (CSP, sanitization) to reduce token theft risk? |
| Token scope?  | Does the token contain sensitive claims that would be exposed via XSS?            |

```ts
// VULNERABLE: JWT accessible to any XSS
localStorage.setItem("token", response.jwt);
// Any XSS can steal: document.cookie won't work, but localStorage.getItem('token') will

// SAFE: httpOnly cookie set by server
// Server response: Set-Cookie: token=jwt; HttpOnly; Secure; SameSite=Strict
// Client: no token handling needed, cookie sent automatically
```

### 6. href Variable with javascript: URL

**Source**: User input, database value, API response
**Sink**: `<a href={variable}>`, `location.href = variable`

| Check                | Question                                                        |
| -------------------- | --------------------------------------------------------------- |
| Protocol validated?  | Is the URL checked to start with `https://`, `http://`, or `/`? |
| javascript: blocked? | Is `javascript:` protocol explicitly blocked?                   |
| data: blocked?       | Is `data:` protocol explicitly blocked?                         |

```tsx
// VULNERABLE: user-controlled href
<a href={userProfile.website}>Visit</a>; // could be "javascript:alert(1)"

// SAFE: protocol allowlist
function safeHref(url: string): string {
  const parsed = new URL(url, location.origin);
  if (!["https:", "http:"].includes(parsed.protocol)) return "#";
  return parsed.href;
}
<a href={safeHref(userProfile.website)}>Visit</a>;
```

## Review Workflow

1. Identify taint sources (user input, API responses, URL parameters)
2. Trace data flow to sinks (DOM manipulation, navigation, storage)
3. Verify sanitization/validation exists at every source-to-sink path
4. Check that sanitization cannot be bypassed (error paths, conditional logic)
