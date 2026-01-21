mod architecture;
mod console_log;
mod error_handling;
mod naming;
mod security;
mod transaction;
mod type_safety;

use crate::config::Config;
use once_cell::sync::Lazy;
use regex::Regex;
use serde::Deserialize;

pub static RE_JS_FILE: Lazy<Regex> = Lazy::new(|| Regex::new(r"\.(tsx?|jsx?)$").unwrap());
pub static RE_TS_FILE: Lazy<Regex> = Lazy::new(|| Regex::new(r"\.tsx?$").unwrap());

pub fn is_comment_line(line: &str) -> bool {
    let trimmed = line.trim_start();
    trimmed.starts_with("//") || trimmed.starts_with("/*") || trimmed.starts_with("*")
}

pub fn find_non_comment_match(content: &str, pattern: &Regex) -> Option<u32> {
    for (line_num, line) in content.lines().enumerate() {
        if is_comment_line(line) {
            continue;
        }
        if pattern.is_match(line) {
            return Some((line_num + 1) as u32);
        }
    }
    None
}

pub fn count_non_comment_matches(content: &str, pattern: &Regex) -> usize {
    content
        .lines()
        .filter(|line| !is_comment_line(line))
        .filter(|line| pattern.is_match(line))
        .count()
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Severity {
    Critical,
    High,
    Medium,
    Low,
}

impl std::fmt::Display for Severity {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        let s = match self {
            Severity::Critical => "CRITICAL",
            Severity::High => "HIGH",
            Severity::Medium => "MEDIUM",
            Severity::Low => "LOW",
        };
        write!(f, "{}", s)
    }
}

#[derive(Debug, Clone)]
pub struct Violation {
    pub rule: String,
    pub severity: Severity,
    pub what: String,
    pub why: String,
    pub failure: String,
    pub file: String,
    pub line: Option<u32>,
}

pub struct Rule {
    pub file_pattern: Regex,
    checker: Box<dyn Fn(&str, &str) -> Vec<Violation> + Send + Sync>,
}

impl Rule {
    pub fn check(&self, content: &str, file_path: &str) -> Vec<Violation> {
        (self.checker)(content, file_path)
    }
}

pub fn load_rules(config: &Config) -> Vec<Rule> {
    let mut rules = Vec::new();

    if config.rules.architecture {
        rules.push(architecture::rule());
    }
    if config.rules.type_safety {
        rules.push(type_safety::rule());
    }
    if config.rules.error_handling {
        rules.push(error_handling::rule());
    }
    if config.rules.naming {
        rules.push(naming::rule());
    }
    if config.rules.transaction {
        rules.push(transaction::rule());
    }
    if config.rules.console_log {
        rules.push(console_log::rule());
    }
    if config.rules.security {
        rules.push(security::rule());
    }

    rules
}
