use regex::Regex;
use std::collections::HashMap;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum RedactionError {
    #[error("invalid pattern for rule '{rule}': {source}")]
    InvalidPattern {
        rule: String,
        #[source]
        source: regex::Error,
    },
    #[error("duplicate placeholder for rule '{0}'")]
    DuplicatePlaceholder(String),
}

pub struct RedactionRule {
    pub name: String,
    pub pattern: String,
    pub placeholder: String,
}

pub struct Redactor {
    rules: Vec<(String, Regex, String)>,
    placeholder_index: HashMap<String, String>,
}

impl Redactor {
    pub fn new(rules: &[RedactionRule]) -> Result<Self, RedactionError> {
        let mut compiled = Vec::with_capacity(rules.len());
        let mut placeholder_index = HashMap::new();

        for rule in rules {
            let regex =
                Regex::new(&rule.pattern).map_err(|source| RedactionError::InvalidPattern {
                    rule: rule.name.clone(),
                    source,
                })?;
            if placeholder_index
                .insert(rule.placeholder.clone(), rule.name.clone())
                .is_some()
            {
                return Err(RedactionError::DuplicatePlaceholder(rule.name.clone()));
            }
            compiled.push((rule.name.clone(), regex, rule.placeholder.clone()));
        }

        Ok(Self {
            rules: compiled,
            placeholder_index,
        })
    }

    pub fn redact<'a>(&self, text: &'a str) -> std::borrow::Cow<'a, str> {
        let mut output = std::borrow::Cow::Borrowed(text);
        for (_, regex, placeholder) in &self.rules {
            if regex.is_match(&output) {
                output = std::borrow::Cow::Owned(regex.replace_all(&output, placeholder).into());
            }
        }
        output
    }

    pub fn rule_for_placeholder(&self, placeholder: &str) -> Option<&str> {
        self.placeholder_index.get(placeholder).map(String::as_str)
    }
}
