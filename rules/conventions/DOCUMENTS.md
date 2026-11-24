---
paths:
  - "CLAUDE.md"
  - ".claude/CLAUDE.md"
  - "docs/research/**"
  - "rules/**"
  - ".claude/rules/**"
---

# Document Responsibilities

Settle which document a newly written thing goes into. The documents divide the ground between them so the same content never lands in two places.

| Document          | Domain                                                                                  | Lifecycle                          | Why a reader opens it              |
| ----------------- | --------------------------------------------------------------------------------------- | ---------------------------------- | ---------------------------------- |
| `rules/`          | Language and domain directives, always applied                                          | Living document                    | What must I obey?                  |
| `/dr`'s archive   | Decisions: rationale and the alternatives considered                                    | Immutable. Replaced by supersession | Why this shape? May I overturn it? |
| `CLAUDE.md`       | Project-specific current state and the reason for it                                    | Living document                    | What is this project?              |
| `docs/research/` | Observations, comparisons, unadopted options, and detailed evidence | Preserve originals, versions, and status | What was checked? |

## Routing

1. The rule itself goes to `rules/`. The rationale for choosing that rule goes to a decision record
2. A decision record declares `scope:` in its frontmatter
3. Project-specific state goes to `CLAUDE.md`. State that generalizes across projects is promoted to a decision record or to `rules/`

## When two documents overlap

The same directive sitting in both `rules/` and a record that has not been superseded means one of two things. Either the record holds the historical rationale for the current `rules/` entry, or the two have diverged and need reconciling. Cross-link for the first; resolve the divergence for the second.

## Read and retain

Keep originals in the target repository's `docs/research/` and choice rationale in the archive `/dr` writes to. How the work is done today is held by the code, its tests, the comments that state a reason, and `rules/`. README and CLAUDE.md are entry points; the Issue and agreement record own requirements and permission. Pass needed references to implementation and evaluation. Where versions matter, use repository-relative paths, Git blobs, and the starting commit. Version agreement proves neither correctness nor adoption.

When a decision settles and when the implementation diff is ready, check effects on existing documents. Include required DR creation and `rules/` updates in the agreed change scope and compare them with originals and code during independent evaluation. The Issue/PR explanation suffices for choices below the DR adoption gate. Use dr's MADR template for a DR.

Preserve original paths, versions, observation dates, conditions, and agreement status, and link to them from DRs. Confirm sharing scope before publishing untracked material or raw logs. State the scope of a report about another repository; do not move it there automatically. Never mark a choice accepted without evidence of agreement.

Claude and Codex share this classification and format. This does not require a shared execution mechanism or distribution source; the rules and templates in this repository are sufficient.
