use super::{find_line_number, Rule, Severity, Violation, RE_JS_FILE};
use once_cell::sync::Lazy;
use regex::Regex;

struct ErrorIssue {
    pattern: &'static Lazy<Regex>,
    what: &'static str,
    why: &'static str,
    failure: &'static str,
    severity: Severity,
}

static RE_EMPTY_CATCH: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"catch\s*\([^)]*\)\s*\{\s*\}").unwrap());
static RE_COMMENT_CATCH: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"catch\s*\([^)]*\)\s*\{\s*//.*\s*\}").unwrap());
static RE_EMPTY_PROMISE_CATCH: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"\.catch\s*\(\s*\(\s*\)\s*=>\s*\{\s*\}\s*\)").unwrap());
static RE_NULL_PROMISE_CATCH: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"\.catch\s*\(\s*\(\s*\)\s*=>\s*null\s*\)").unwrap());

static ERROR_ISSUES: Lazy<[ErrorIssue; 4]> = Lazy::new(|| [
    ErrorIssue {
        pattern: &RE_EMPTY_CATCH,
        what: "空の catch ブロックを検出",
        why: "エラーを握りつぶしている。問題の発見が遅れる",
        failure: "最低限 console.error でログ出力。本番では Sentry 等に送信",
        severity: Severity::High,
    },
    ErrorIssue {
        pattern: &RE_COMMENT_CATCH,
        what: "コメントのみの catch ブロックを検出",
        why: "エラー処理が意図的に省略されている。デバッグ困難に",
        failure: "コメントで省略理由を明記し、最低限のログ出力を追加",
        severity: Severity::Medium,
    },
    ErrorIssue {
        pattern: &RE_EMPTY_PROMISE_CATCH,
        what: "空の Promise catch を検出",
        why: "非同期エラーを握りつぶしている。サイレントフェイルの原因",
        failure: "エラーハンドリングを追加。無視する場合は理由をコメント",
        severity: Severity::High,
    },
    ErrorIssue {
        pattern: &RE_NULL_PROMISE_CATCH,
        what: "null を返す Promise catch を検出",
        why: "エラー時に null を返すと、呼び出し側で予期しない動作を招く",
        failure: "Result 型パターンを使用するか、明示的なエラー型を返す",
        severity: Severity::Medium,
    },
]);

pub fn rule() -> Rule {
    Rule {
        file_pattern: RE_JS_FILE.clone(),
        checker: Box::new(|content: &str, file_path: &str| {
            let mut violations = Vec::new();

            for issue in ERROR_ISSUES.iter() {
                if issue.pattern.is_match(content) {
                    violations.push(Violation {
                        rule: "error-handling".to_string(),
                        severity: issue.severity,
                        what: issue.what.to_string(),
                        why: issue.why.to_string(),
                        failure: issue.failure.to_string(),
                        file: file_path.to_string(),
                        line: find_line_number(content, issue.pattern),
                    });
                }
            }

            violations
        }),
    }
}
