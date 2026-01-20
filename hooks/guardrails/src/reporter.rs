use crate::rules::{Severity, Violation};

fn severity_icon(severity: Severity, use_emoji: bool) -> &'static str {
    match (severity, use_emoji) {
        (Severity::Critical, true) => "🚨",
        (Severity::High, true) => "⚠️",
        (Severity::Medium, true) => "⚡",
        (Severity::Low, true) => "💡",
        (Severity::Critical, false) => "[!!]",
        (Severity::High, false) => "[!]",
        (Severity::Medium, false) => "[*]",
        (Severity::Low, false) => "[.]",
    }
}

pub fn format_violations(violations: &[&Violation], use_emoji: bool) -> String {
    if violations.is_empty() {
        return String::new();
    }

    let separator = "═".repeat(60);
    let line = "─".repeat(60);

    let header = if use_emoji {
        "🛡️  GUARDRAILS CHECK"
    } else {
        "GUARDRAILS CHECK"
    };

    let mut lines = vec![
        String::new(),
        separator.clone(),
        header.to_string(),
        separator.clone(),
    ];

    for v in violations {
        let icon = severity_icon(v.severity, use_emoji);
        lines.push(String::new());
        lines.push(format!("{} [{}] {}", icon, v.severity, v.rule));
        lines.push(format!("   @what: {}", v.what));
        lines.push(format!("   @why: {}", v.why));
        lines.push(format!("   @failure: {}", v.failure));
        let file_line = match v.line {
            Some(l) => format!("{}:{}", v.file, l),
            None => v.file.clone(),
        };
        lines.push(format!("   File: {}", file_line));
    }

    lines.push(String::new());
    lines.push(line);
    lines.push("This operation has been BLOCKED.".to_string());
    lines.push("Fix the issues above and try again.".to_string());
    lines.push(separator);
    lines.push(String::new());

    lines.join("\n")
}
