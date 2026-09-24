---
paths:
  - "CLAUDE.md"
  - ".claude/CLAUDE.md"
  - "docs/decisions/**"
  - "docs/wiki/**"
  - "docs/research/**"
  - "rules/**"
  - ".claude/rules/**"
---

# Document Responsibilities

Settle which document a newly written thing goes into. The documents divide the ground between them so the same content never lands in two places.

| Document          | Domain                                                                                  | Lifecycle                          | Why a reader opens it              |
| ----------------- | --------------------------------------------------------------------------------------- | ---------------------------------- | ---------------------------------- |
| `rules/`          | Language and domain directives, always applied                                          | Living document                    | What must I obey?                  |
| `docs/decisions/` | Decisions: rationale and the alternatives considered                                    | Immutable. Replaced by supersession | Why this shape? May I overturn it? |
| `CLAUDE.md`       | Project-specific current state and the reason for it                                    | Living document                    | What is this project?              |
| `docs/wiki/`      | Implementer-facing current state: repeated procedures and conventions, module boundaries and contracts | Living document | How do I do this today?            |
| `docs/research/` | Observations, comparisons, unadopted options, and detailed evidence | Preserve originals, versions, and status | What was checked? |

## Routing

1. The rule itself goes to `rules/`. The rationale for choosing that rule goes to a decision record
2. A decision record declares `scope:` in its frontmatter
3. Project-specific state goes to `CLAUDE.md`. State that generalizes across projects is promoted to a decision record or to `rules/`
4. The wiki states the present shape a decision produced. It writes down neither the record's rationale nor its alternatives, and names the record in the 由来 section instead
5. A wiki page names a record in 由来 only when the counterfactual test holds: were that record replaced, would this page need rewriting? Only Yes adds the link
6. When a record is replaced, the pages naming it in 由来 are rewritten in the same change unit. Relinking is not enough; check whether the body still holds
7. The wiki's 共通項 pages are extracted from past PRs and issues. A `kind: structure` page covers one glob-able contract group, raised from the decision records and the code, then reviewed by a human

## When two documents overlap

The same directive sitting in both `rules/` and a record that has not been superseded means one of two things. Either the record holds the historical rationale for the current `rules/` entry, or the two have diverged and need reconciling. Cross-link for the first; resolve the divergence for the second.

The wiki is a copy derived from the decision records. The record is canonical, and the 由来 section is where the copy records where the canonical lives. What the copy carries is the decision's present shape, not the record's text.

## Read and retain

At requirements and implementation entry, select relevant pages from the target repository's wiki/decisions indexes, task terms, and changed paths. Wiki `globs` select files; `scenes` select `plan`, `implement`, `issue-create`, `pr-create`, or `issue-close`. Missing documents are not a start blocker. Check each relevant DR's status, scope, and successor, and each wiki page's code references and evidence against the current requirements. Do not apply an old conclusion to another objective unconditionally.

Keep originals in the target repository's `docs/research/`, current practice in `docs/wiki/`, and choice rationale in `docs/decisions/`. README and CLAUDE.md are entry points; the Issue and agreement record own requirements and permission. Pass needed references to implementation and evaluation. Where versions matter, use repository-relative paths, Git blobs, and the starting commit. Version agreement proves neither correctness nor adoption.

When a decision settles and when the implementation diff is ready, check effects on existing documents. Include required wiki updates and DR creation in the agreed change scope and compare them with originals and code during independent evaluation. The Issue/PR explanation suffices for choices below the DR adoption gate. Do not create a page on every run. Use scribe's pattern/structure templates and dr's MADR template.

Preserve original paths, versions, observation dates, conditions, and agreement status, and link to them from wiki/DRs. Confirm sharing scope before publishing untracked material or raw logs. State the scope of a report about another repository; do not move it there automatically. Never mark a choice accepted without evidence of agreement or invent the original behind `(research)`.

Claude and Codex share this classification and format. This does not require a shared execution mechanism or distribution source; the rules and templates in this repository are sufficient.
