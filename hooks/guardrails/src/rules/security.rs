use super::{find_non_comment_match, Rule, Severity, Violation, RE_JS_FILE};
use once_cell::sync::Lazy;
use regex::Regex;

static RE_HTML_FILE: Lazy<Regex> = Lazy::new(|| Regex::new(r"\.(jsx?|tsx?|html?)$").unwrap());

static RE_EVAL: Lazy<Regex> = Lazy::new(|| Regex::new(r"\beval\s*\(").unwrap());
static RE_NEW_FUNC: Lazy<Regex> = Lazy::new(|| Regex::new(r"new\s+Function\s*\(").unwrap());
static RE_DANGEROUS_HTML: Lazy<Regex> = Lazy::new(|| Regex::new(r"dangerouslySetInnerHTML").unwrap());
static RE_DOC_WRITE: Lazy<Regex> = Lazy::new(|| Regex::new(r"document\.write\s*\(").unwrap());
static RE_INNER_HTML: Lazy<Regex> = Lazy::new(|| Regex::new(r"\.innerHTML\s*=").unwrap());
static RE_SET_TIMEOUT_STR: Lazy<Regex> = Lazy::new(|| Regex::new(r#"setTimeout\s*\(\s*['"`]"#).unwrap());
static RE_SET_INTERVAL_STR: Lazy<Regex> = Lazy::new(|| Regex::new(r#"setInterval\s*\(\s*['"`]"#).unwrap());
static RE_POST_MESSAGE_STAR: Lazy<Regex> = Lazy::new(|| Regex::new(r#"\.postMessage\s*\([^,]+,\s*['"`]\*['"`]\s*\)"#).unwrap());
static RE_OUTER_HTML: Lazy<Regex> = Lazy::new(|| Regex::new(r"\.outerHTML\s*=").unwrap());
static RE_LOCAL_STORAGE_SENSITIVE: Lazy<Regex> = Lazy::new(|| Regex::new(r#"localStorage\.(setItem|getItem)\s*\(\s*['"`](token|password|secret|key|auth|credential)"#).unwrap());
static RE_SESSION_STORAGE_SENSITIVE: Lazy<Regex> = Lazy::new(|| Regex::new(r#"sessionStorage\.(setItem|getItem)\s*\(\s*['"`](token|password|secret|key|auth|credential)"#).unwrap());

struct SecurityIssue {
    pattern: &'static Lazy<Regex>,
    file_pattern: &'static Lazy<Regex>,
    what: &'static str,
    why: &'static str,
    failure: &'static str,
    severity: Severity,
}

static SECURITY_ISSUES: [SecurityIssue; 11] = [
    SecurityIssue {
        pattern: &RE_EVAL,
        file_pattern: &RE_JS_FILE,
        what: "eval() を検出",
        why: "任意コード実行の脆弱性",
        failure: "JSON.parse() または安全な代替手段を使用",
        severity: Severity::Critical,
    },
    SecurityIssue {
        pattern: &RE_NEW_FUNC,
        file_pattern: &RE_JS_FILE,
        what: "new Function() を検出",
        why: "任意コード実行の脆弱性",
        failure: "動的コード実行を避け、安全な代替手段を使用",
        severity: Severity::Critical,
    },
    SecurityIssue {
        pattern: &RE_DANGEROUS_HTML,
        file_pattern: &RE_JS_FILE,
        what: "dangerouslySetInnerHTML を検出",
        why: "XSS 脆弱性のリスク",
        failure: "DOMPurify でサニタイズ、または innerHTML を避ける",
        severity: Severity::High,
    },
    SecurityIssue {
        pattern: &RE_DOC_WRITE,
        file_pattern: &RE_HTML_FILE,
        what: "document.write() を検出",
        why: "XSS 脆弱性のリスク",
        failure: "createElement/appendChild を使用",
        severity: Severity::High,
    },
    SecurityIssue {
        pattern: &RE_INNER_HTML,
        file_pattern: &RE_HTML_FILE,
        what: "innerHTML 代入を検出",
        why: "XSS 脆弱性のリスク",
        failure: "textContent または DOMPurify を使用",
        severity: Severity::High,
    },
    SecurityIssue {
        pattern: &RE_SET_TIMEOUT_STR,
        file_pattern: &RE_JS_FILE,
        what: "setTimeout に文字列引数を検出",
        why: "任意コード実行の脆弱性",
        failure: "関数参照を使用: setTimeout(() => { ... }, delay)",
        severity: Severity::High,
    },
    SecurityIssue {
        pattern: &RE_SET_INTERVAL_STR,
        file_pattern: &RE_JS_FILE,
        what: "setInterval に文字列引数を検出",
        why: "任意コード実行の脆弱性",
        failure: "関数参照を使用: setInterval(() => { ... }, delay)",
        severity: Severity::High,
    },
    SecurityIssue {
        pattern: &RE_POST_MESSAGE_STAR,
        file_pattern: &RE_JS_FILE,
        what: "postMessage で '*' targetOrigin を検出",
        why: "データ漏洩のリスク",
        failure: "具体的なオリジンを指定",
        severity: Severity::High,
    },
    SecurityIssue {
        pattern: &RE_OUTER_HTML,
        file_pattern: &RE_HTML_FILE,
        what: "outerHTML 代入を検出",
        why: "XSS 脆弱性のリスク",
        failure: "DOM メソッドを使用",
        severity: Severity::Medium,
    },
    SecurityIssue {
        pattern: &RE_LOCAL_STORAGE_SENSITIVE,
        file_pattern: &RE_JS_FILE,
        what: "localStorage に機密データを検出",
        why: "XSS でデータ漏洩のリスク",
        failure: "httpOnly Cookie を使用",
        severity: Severity::Medium,
    },
    SecurityIssue {
        pattern: &RE_SESSION_STORAGE_SENSITIVE,
        file_pattern: &RE_JS_FILE,
        what: "sessionStorage に機密データを検出",
        why: "XSS でデータ漏洩のリスク",
        failure: "httpOnly Cookie を使用",
        severity: Severity::Medium,
    },
];

pub fn rule() -> Rule {
    Rule {
        file_pattern: RE_HTML_FILE.clone(),
        checker: Box::new(|content: &str, file_path: &str| {
            let mut violations = Vec::new();

            for issue in SECURITY_ISSUES.iter() {
                if !issue.file_pattern.is_match(file_path) {
                    continue;
                }
                if let Some(line_num) = find_non_comment_match(content, issue.pattern) {
                    violations.push(Violation {
                        rule: "security".to_string(),
                        severity: issue.severity,
                        what: issue.what.to_string(),
                        why: issue.why.to_string(),
                        failure: issue.failure.to_string(),
                        file: file_path.to_string(),
                        line: Some(line_num),
                    });
                }
            }

            violations
        }),
    }
}
