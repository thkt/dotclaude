use super::{find_non_comment_match, Rule, Severity, Violation, RE_TS_FILE};
use once_cell::sync::Lazy;
use regex::Regex;

struct TypeIssue {
    pattern: &'static Lazy<Regex>,
    what: &'static str,
    why: &'static str,
    failure: &'static str,
    severity: Severity,
}

static RE_ANY_TYPE: Lazy<Regex> = Lazy::new(|| Regex::new(r":\s*any\b").unwrap());
static RE_AS_ANY: Lazy<Regex> = Lazy::new(|| Regex::new(r"as\s+any\b").unwrap());
static RE_TS_IGNORE: Lazy<Regex> = Lazy::new(|| Regex::new(r"@ts-ignore").unwrap());
// Must be followed by property name to avoid false positives (strings, comments)
static RE_NON_NULL: Lazy<Regex> = Lazy::new(|| Regex::new(r"[\w\]\)]!\.[a-zA-Z_]").unwrap());

static TYPE_ISSUES: Lazy<[TypeIssue; 4]> = Lazy::new(|| [
    TypeIssue {
        pattern: &RE_ANY_TYPE,
        what: "any 型の使用を検出",
        why: "any は型安全性を完全に無効化。バグの温床になる",
        failure: "具体的な型を指定。不明な場合は unknown を使用し、型ガードで絞り込む",
        severity: Severity::High,
    },
    TypeIssue {
        pattern: &RE_AS_ANY,
        what: "as any によるキャストを検出",
        why: "型エラーを握りつぶしている。根本原因を隠蔽する",
        failure: "正しい型定義を行うか、型ガードを使用",
        severity: Severity::High,
    },
    TypeIssue {
        pattern: &RE_TS_IGNORE,
        what: "@ts-ignore を検出",
        why: "型エラーを無視している。将来のバグを招く",
        failure: "@ts-expect-error に変更し、理由をコメントで明記",
        severity: Severity::Medium,
    },
    TypeIssue {
        pattern: &RE_NON_NULL,
        what: "Non-null assertion (!) を検出",
        why: "実行時に null/undefined の可能性がある。クラッシュの原因に",
        failure: "Optional chaining (?.) とデフォルト値、または型ガードを使用",
        severity: Severity::Medium,
    },
]);

pub fn rule() -> Rule {
    Rule {
        file_pattern: RE_TS_FILE.clone(),
        checker: Box::new(|content: &str, file_path: &str| {
            let mut violations = Vec::new();

            for issue in TYPE_ISSUES.iter() {
                if let Some(line_num) = find_non_comment_match(content, issue.pattern) {
                    violations.push(Violation {
                        rule: "type-safety".to_string(),
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
