mod config;
mod reporter;
mod rules;

use config::Config;
use reporter::{format_violations, format_warnings};
use rules::Violation;
use std::io::{self, Read};

const MAX_INPUT_SIZE: u64 = 10_000_000; // 10MB limit

#[derive(serde::Deserialize)]
struct ToolInput {
    tool_name: String,
    tool_input: ToolInputData,
}

#[derive(serde::Deserialize)]
struct ToolInputData {
    file_path: Option<String>,
    content: Option<String>,
    new_string: Option<String>,
    edits: Option<Vec<EditItem>>,
}

#[derive(serde::Deserialize)]
struct EditItem {
    new_string: Option<String>,
}

fn get_file_and_content(input: &ToolInput) -> Option<(String, String)> {
    let file_path = input.tool_input.file_path.clone()?;

    let content = match input.tool_name.as_str() {
        "Write" => input.tool_input.content.clone()?,
        "Edit" => input.tool_input.new_string.clone()?,
        "MultiEdit" => {
            let edits = input.tool_input.edits.as_ref()?;
            edits
                .iter()
                .filter_map(|e| e.new_string.clone())
                .collect::<Vec<_>>()
                .join("\n")
        }
        _ => return None,
    };

    if file_path.is_empty() || content.is_empty() {
        return None;
    }

    Some((file_path, content))
}

fn main() {
    let config = Config::load();

    if !config.enabled {
        std::process::exit(0);
    }

    let mut input_str = String::new();
    let bytes_read = match io::stdin().take(MAX_INPUT_SIZE).read_to_string(&mut input_str) {
        Ok(n) => n,
        Err(e) => {
            eprintln!("guardrails: failed to read stdin: {}", e);
            std::process::exit(1);
        }
    };

    if bytes_read as u64 == MAX_INPUT_SIZE {
        eprintln!("guardrails: warning: input truncated at {} bytes", MAX_INPUT_SIZE);
    }

    let input: ToolInput = match serde_json::from_str(&input_str) {
        Ok(v) => v,
        Err(e) => {
            eprintln!("guardrails: invalid JSON input: {}", e);
            std::process::exit(1);
        }
    };

    let Some((file_path, content)) = get_file_and_content(&input) else {
        eprintln!("guardrails: skipping {} (unsupported or empty)", input.tool_name);
        std::process::exit(0);
    };

    let rules = rules::load_rules(&config);
    let mut violations: Vec<Violation> = Vec::new();

    for rule in &rules {
        if !rule.file_pattern.is_match(&file_path) {
            continue;
        }
        violations.extend(rule.check(&content, &file_path));
    }

    let blocking: Vec<&Violation> = violations
        .iter()
        .filter(|v| config.severity.block_on.contains(&v.severity))
        .collect();

    let warnings: Vec<&Violation> = violations
        .iter()
        .filter(|v| !config.severity.block_on.contains(&v.severity))
        .collect();

    if !warnings.is_empty() {
        eprintln!("{}", format_warnings(&warnings, config.emoji));
    }

    if !blocking.is_empty() {
        eprintln!("{}", format_violations(&blocking, config.emoji));
        std::process::exit(2);
    }

    std::process::exit(0);
}
