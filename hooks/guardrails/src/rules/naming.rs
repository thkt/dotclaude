use super::{find_non_comment_match, Rule, Severity, Violation, RE_JS_FILE};
use once_cell::sync::Lazy;
use regex::Regex;

struct NamingIssue {
    pattern: &'static Lazy<Regex>,
    file_pattern: Option<&'static Lazy<Regex>>,
    additional_check: Option<&'static Lazy<Regex>>,
    what: &'static str,
    why: &'static str,
    failure: &'static str,
    severity: Severity,
}

static RE_LOWERCASE_ARROW: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"const\s+[a-z][a-zA-Z]*\s*=\s*\([^)]*\)\s*=>").unwrap());
static RE_COMPONENT_FILE: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"/components/.*\.tsx$").unwrap());
static RE_JSX_RETURN: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"const\s+[a-z][a-zA-Z]*\s*=\s*\([^)]*\)\s*=>\s*[{(][^}]*<").unwrap()
});

static RE_NON_USE_ARROW: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"const\s+[a-tv-z][a-zA-Z]*\s*=.*=>\s*\{").unwrap());
static RE_HOOKS_FILE: Lazy<Regex> = Lazy::new(|| Regex::new(r"/hooks/.*\.ts$").unwrap());
static RE_HOOK_USAGE: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"use(State|Effect|Callback|Memo)").unwrap());

static RE_LOWERCASE_INTERFACE: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"interface\s+[a-z]").unwrap());
static RE_LOWERCASE_TYPE: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"type\s+[a-z][a-zA-Z]*\s*=").unwrap());

static NAMING_ISSUES: Lazy<[NamingIssue; 4]> = Lazy::new(|| [
    NamingIssue {
        pattern: &RE_LOWERCASE_ARROW,
        file_pattern: Some(&RE_COMPONENT_FILE),
        additional_check: Some(&RE_JSX_RETURN),
        what: "コンポーネントファイルで小文字始まりの関数を検出",
        why: "React コンポーネントは PascalCase で命名すべき。JSX で使用できない",
        failure: "関数名を PascalCase に変更 (例: myComponent → MyComponent)",
        severity: Severity::Medium,
    },
    NamingIssue {
        pattern: &RE_NON_USE_ARROW,
        file_pattern: Some(&RE_HOOKS_FILE),
        additional_check: Some(&RE_HOOK_USAGE),
        what: "hooks/ 内で use プレフィックスなしの関数を検出",
        why: "カスタムフックは use プレフィックスが必須。React のルール違反",
        failure: "関数名を useXxx に変更",
        severity: Severity::High,
    },
    NamingIssue {
        pattern: &RE_LOWERCASE_INTERFACE,
        file_pattern: None,
        additional_check: None,
        what: "小文字始まりの interface を検出",
        why: "TypeScript の interface は PascalCase が慣習",
        failure: "interface 名を PascalCase に変更",
        severity: Severity::Low,
    },
    NamingIssue {
        pattern: &RE_LOWERCASE_TYPE,
        file_pattern: None,
        additional_check: None,
        what: "小文字始まりの type を検出",
        why: "TypeScript の type alias は PascalCase が慣習",
        failure: "type 名を PascalCase に変更",
        severity: Severity::Low,
    },
]);

pub fn rule() -> Rule {
    Rule {
        file_pattern: RE_JS_FILE.clone(),
        checker: Box::new(|content: &str, file_path: &str| {
            let mut violations = Vec::new();

            for issue in NAMING_ISSUES.iter() {
                if let Some(fp) = issue.file_pattern {
                    if !fp.is_match(file_path) {
                        continue;
                    }
                }
                if let Some(ac) = issue.additional_check {
                    if find_non_comment_match(content, ac).is_none() {
                        continue;
                    }
                }
                if let Some(line_num) = find_non_comment_match(content, issue.pattern) {
                    violations.push(Violation {
                        rule: "naming-convention".to_string(),
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
