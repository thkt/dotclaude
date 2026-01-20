use crate::rules::Severity;
use serde::Deserialize;
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Clone, Deserialize)]
pub struct Config {
    #[serde(default = "default_true")]
    pub enabled: bool,
    #[serde(default)]
    pub rules: RulesConfig,
    #[serde(default)]
    pub severity: SeverityConfig,
    #[serde(default = "default_true")]
    pub emoji: bool,
}

#[derive(Debug, Clone, Deserialize)]
pub struct RulesConfig {
    #[serde(default = "default_true")]
    pub architecture: bool,
    #[serde(rename = "typeSafety", default = "default_true")]
    pub type_safety: bool,
    #[serde(rename = "errorHandling", default = "default_true")]
    pub error_handling: bool,
    #[serde(default = "default_true")]
    pub naming: bool,
    #[serde(default = "default_true")]
    pub transaction: bool,
}

impl Default for RulesConfig {
    fn default() -> Self {
        Self {
            architecture: true,
            type_safety: true,
            error_handling: true,
            naming: true,
            transaction: true,
        }
    }
}

#[derive(Debug, Clone, Deserialize)]
pub struct SeverityConfig {
    #[serde(rename = "blockOn", default = "default_block_on")]
    pub block_on: Vec<Severity>,
}

fn default_true() -> bool {
    true
}

fn default_block_on() -> Vec<Severity> {
    vec![Severity::Critical, Severity::High]
}

impl Default for SeverityConfig {
    fn default() -> Self {
        Self {
            block_on: default_block_on(),
        }
    }
}

impl Default for Config {
    fn default() -> Self {
        Self {
            enabled: true,
            rules: RulesConfig::default(),
            severity: SeverityConfig::default(),
            emoji: true,
        }
    }
}

impl Config {
    pub fn load() -> Self {
        let config_path = Self::config_path();

        match fs::read_to_string(&config_path) {
            Ok(content) => match serde_json::from_str::<Config>(&content) {
                Ok(config) => config,
                Err(e) => {
                    eprintln!(
                        "guardrails: warning: invalid config at {:?}: {}",
                        config_path, e
                    );
                    eprintln!("guardrails: using default configuration");
                    Config::default()
                }
            },
            Err(_) => Config::default(),
        }
    }

    fn config_path() -> PathBuf {
        let exe_dir = std::env::current_exe()
            .ok()
            .and_then(|p| p.parent().map(|d| d.to_path_buf()));

        let Some(dir) = exe_dir else {
            eprintln!("guardrails: warning: could not determine executable path");
            return PathBuf::new();
        };

        [
            dir.join("../../config.json"),
            dir.join("../config.json"),
            dir.join("config.json"),
            PathBuf::from("config.json"),
        ]
        .into_iter()
        .find(|p| p.exists())
        .unwrap_or_default()
    }
}
