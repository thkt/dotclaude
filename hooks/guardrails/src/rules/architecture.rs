use super::{find_line_number, Rule, Severity, Violation, RE_JS_FILE};
use once_cell::sync::Lazy;
use regex::Regex;

struct LayerViolation {
    from_pattern: &'static Lazy<Regex>,
    importing: &'static Lazy<Regex>,
    what: &'static str,
    why: &'static str,
    failure: &'static str,
}

static RE_UTILS: Lazy<Regex> = Lazy::new(|| Regex::new(r"/utils/").unwrap());
static RE_SERVICES: Lazy<Regex> = Lazy::new(|| Regex::new(r"/services/").unwrap());
static RE_COMPONENTS: Lazy<Regex> = Lazy::new(|| Regex::new(r"/components/").unwrap());

static RE_IMPORT_UI: Lazy<Regex> =
    Lazy::new(|| Regex::new(r#"from\s+['"].*/(components|hooks|pages|features)/"#).unwrap());
static RE_IMPORT_UI_NO_FEATURES: Lazy<Regex> =
    Lazy::new(|| Regex::new(r#"from\s+['"].*/(components|hooks|pages)/"#).unwrap());
static RE_IMPORT_PAGES: Lazy<Regex> =
    Lazy::new(|| Regex::new(r#"from\s+['"].*\/pages/"#).unwrap());

static LAYER_VIOLATIONS: Lazy<[LayerViolation; 3]> = Lazy::new(|| [
        LayerViolation {
            from_pattern: &RE_UTILS,
            importing: &RE_IMPORT_UI,
            what: "utils/ から UI レイヤー (components/hooks/pages/features) をインポート",
            why: "utils は純粋なユーティリティ関数のみ。UI 依存があると再利用性が下がる",
            failure: "インポートを削除するか、関数を適切なレイヤーに移動",
        },
        LayerViolation {
            from_pattern: &RE_SERVICES,
            importing: &RE_IMPORT_UI_NO_FEATURES,
            what: "services/ から UI レイヤー (components/hooks/pages) をインポート",
            why: "services はビジネスロジック層。UI 依存があると単体テストが困難に",
            failure: "コールバック関数を引数として受け取るか、イベントを発火する設計に変更",
        },
        LayerViolation {
            from_pattern: &RE_COMPONENTS,
            importing: &RE_IMPORT_PAGES,
            what: "components/ から pages/ をインポート",
            why: "components は再利用可能な UI 部品。pages 依存があると再利用性がなくなる",
            failure: "必要なデータは props で渡す設計に変更",
        },
    ]
);

pub fn rule() -> Rule {
    Rule {
        file_pattern: RE_JS_FILE.clone(),
        checker: Box::new(|content: &str, file_path: &str| {
            let mut result = Vec::new();

            for v in LAYER_VIOLATIONS.iter() {
                if !v.from_pattern.is_match(file_path) {
                    continue;
                }
                if v.importing.is_match(content) {
                    result.push(Violation {
                        rule: "architecture".to_string(),
                        severity: Severity::High,
                        what: v.what.to_string(),
                        why: v.why.to_string(),
                        failure: v.failure.to_string(),
                        file: file_path.to_string(),
                        line: find_line_number(content, v.importing),
                    });
                }
            }

            result
        }),
    }
}
