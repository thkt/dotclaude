use super::{find_line_number, Rule, Severity, Violation, RE_JS_FILE};
use once_cell::sync::Lazy;
use regex::Regex;

// TXRULE-004: Extended to cover common directory patterns
static RE_TARGET_DIR: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"/(usecases?|use-cases?|application|services?|domain|handlers?|app)/").unwrap()
});

// TXRULE-002: Removed add/set/remove to reduce false positives (Set.add, Map.set)
static RE_WRITE_OPS: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"\.(save|create|update|delete|insert|persist)\s*\(").unwrap());

// TXRULE-003/006: ORM patterns (Prisma, TypeORM, Knex, Sequelize, Drizzle)
static RE_TX_BOUNDARY: Lazy<Regex> = Lazy::new(|| {
    Regex::new(
        r"(?i)(@Transactional|transaction|\$transaction|unitOfWork|runInTransaction|withTransaction|beginTransaction|QueryRunner|getManager|knex\.transaction|sequelize\.transaction|db\.transaction)",
    )
    .unwrap()
});

pub fn rule() -> Rule {
    Rule {
        file_pattern: RE_JS_FILE.clone(),
        checker: Box::new(|content: &str, file_path: &str| {
            if !RE_TARGET_DIR.is_match(file_path) {
                return Vec::new();
            }

            let write_count = RE_WRITE_OPS.find_iter(content).count();
            if write_count < 2 {
                return Vec::new();
            }

            if RE_TX_BOUNDARY.is_match(content) {
                return Vec::new();
            }

            vec![Violation {
                rule: "transaction-boundary".to_string(),
                severity: Severity::Medium,
                what: format!(
                    "トランザクション境界なしで {}個 の書き込み操作を検出",
                    write_count
                ),
                why: "複数の書き込み操作が独立して実行されると、途中で失敗した場合にデータ不整合が発生する可能性がある".to_string(),
                failure: "UnitOfWork パターン、@Transactional、または明示的なトランザクション制御を追加".to_string(),
                file: file_path.to_string(),
                line: find_line_number(content, &RE_WRITE_OPS),
            }]
        }),
    }
}

// TXRULE-001: Unit tests
#[cfg(test)]
mod tests {
    use super::*;

    fn check(content: &str, path: &str) -> Vec<Violation> {
        rule().check(content, path)
    }

    #[test]
    fn detects_multiple_writes_without_transaction() {
        let content = r#"
            async function handle() {
                await user.save();
                await order.create();
            }
        "#;
        let violations = check(content, "/src/usecases/handler.ts");
        assert_eq!(violations.len(), 1);
        assert!(violations[0].what.contains("2個"));
    }

    #[test]
    fn allows_with_transactional_decorator() {
        let content = r#"
            @Transactional()
            async function handle() {
                await user.save();
                await order.create();
            }
        "#;
        let violations = check(content, "/src/usecases/handler.ts");
        assert!(violations.is_empty());
    }

    #[test]
    fn allows_with_unit_of_work() {
        let content = r#"
            async function handle() {
                await unitOfWork.execute(async () => {
                    await user.save();
                    await order.create();
                });
            }
        "#;
        let violations = check(content, "/src/usecases/handler.ts");
        assert!(violations.is_empty());
    }

    #[test]
    fn allows_with_prisma_transaction() {
        let content = r#"
            async function handle() {
                await prisma.$transaction(async (tx) => {
                    await tx.user.create();
                    await tx.order.create();
                });
            }
        "#;
        let violations = check(content, "/src/services/handler.ts");
        assert!(violations.is_empty());
    }

    #[test]
    fn skips_non_target_directories() {
        let content = r#"
            async function handle() {
                await user.save();
                await order.create();
            }
        "#;
        let violations = check(content, "/src/utils/helper.ts");
        assert!(violations.is_empty());
    }

    #[test]
    fn skips_single_write() {
        let content = r#"
            async function handle() {
                await user.save();
            }
        "#;
        let violations = check(content, "/src/usecases/handler.ts");
        assert!(violations.is_empty());
    }

    #[test]
    fn no_false_positive_for_set_add() {
        let content = r#"
            function process() {
                mySet.add(item);
                myMap.set(key, value);
            }
        "#;
        let violations = check(content, "/src/usecases/handler.ts");
        assert!(violations.is_empty());
    }

    #[test]
    fn detects_in_domain_directory() {
        let content = r#"
            async function handle() {
                await entity.save();
                await aggregate.persist();
            }
        "#;
        let violations = check(content, "/src/domain/order/handler.ts");
        assert_eq!(violations.len(), 1);
    }

    #[test]
    fn allows_with_drizzle_transaction() {
        let content = r#"
            async function handle() {
                await db.transaction(async (tx) => {
                    await tx.insert(users).values(user);
                    await tx.insert(orders).values(order);
                });
            }
        "#;
        let violations = check(content, "/src/services/handler.ts");
        assert!(violations.is_empty());
    }
}
