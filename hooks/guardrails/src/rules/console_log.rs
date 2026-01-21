use super::{find_non_comment_match, Rule, Severity, Violation, RE_JS_FILE};
use once_cell::sync::Lazy;
use regex::Regex;

static RE_EXCLUDED_FILE: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"(\.(test|spec)\.[jt]sx?$|/__tests__/|/test/|\.stories\.[jt]sx?$|\.config\.[jt]s$)").unwrap()
});

static CONSOLE_METHODS: [(&str, Lazy<Regex>); 6] = [
    ("log", Lazy::new(|| Regex::new(r"console\.log\s*\(").unwrap())),
    ("debug", Lazy::new(|| Regex::new(r"console\.debug\s*\(").unwrap())),
    ("info", Lazy::new(|| Regex::new(r"console\.info\s*\(").unwrap())),
    ("trace", Lazy::new(|| Regex::new(r"console\.trace\s*\(").unwrap())),
    ("table", Lazy::new(|| Regex::new(r"console\.table\s*\(").unwrap())),
    ("dir", Lazy::new(|| Regex::new(r"console\.dir\s*\(").unwrap())),
];

pub fn rule() -> Rule {
    Rule {
        file_pattern: RE_JS_FILE.clone(),
        checker: Box::new(|content: &str, file_path: &str| {
            if RE_EXCLUDED_FILE.is_match(file_path) {
                return Vec::new();
            }

            CONSOLE_METHODS
                .iter()
                .filter_map(|(method, pattern)| {
                    find_non_comment_match(content, pattern).map(|line_num| Violation {
                        rule: "console-log".to_string(),
                        severity: Severity::Low,
                        what: format!("console.{} を検出", method),
                        why: "デバッグコードが本番に混入する可能性".to_string(),
                        failure: "コミット前に削除。ログが必要なら logger を使用".to_string(),
                        file: file_path.to_string(),
                        line: Some(line_num),
                    })
                })
                .collect()
        }),
    }
}
