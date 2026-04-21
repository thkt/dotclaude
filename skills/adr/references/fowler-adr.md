# Fowler on Architecture Decision Records

Martin Fowler's bliki entry summarizing ADR practice. The original concept is from Michael Nygard (2011).

## Source

| Topic                 | URL                                                                        |
| --------------------- | -------------------------------------------------------------------------- |
| Fowler bliki          | <https://martinfowler.com/bliki/ArchitectureDecisionRecord.html>           |
| Nygard 2011 (origin)  | <https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions> |
| adr-tools (Pryce CLI) | <https://github.com/npryce/adr-tools>                                      |

## Core Definition

> An ADR is a short document that captures and explains a single decision relevant to a product or ecosystem.

Typically a single page, at most two. Capture the decision, its context, and significant ramifications.

## Two Purposes

| Purpose           | Value                                                   |
| ----------------- | ------------------------------------------------------- |
| Historical record | Future readers understand why the system is built as-is |
| Clarify thinking  | Writing surfaces disagreement and forces resolution     |

## Writing Style

| Aspect           | Practice                                                |
| ---------------- | ------------------------------------------------------- |
| Inverted pyramid | Critical info first. Supporting detail later            |
| Brevity          | Single page preferred. Link out for supporting material |
| Markdown         | Lives in the source repo, diffable alongside code       |

## Filename and Location

| Item      | Convention                                                  |
| --------- | ----------------------------------------------------------- |
| Directory | `doc/adr` by common convention (or repo-specific)           |
| Filename  | `NNNN-short-title.md`. Monotonic sequence, descriptive slug |
| Example   | `0001-HTMX-for-active-web-pages`                            |

## Status Values

| Status     | Meaning                                     |
| ---------- | ------------------------------------------- |
| proposed   | Under discussion                            |
| accepted   | Team accepted and currently active          |
| superseded | Replaced by a later ADR (link to successor) |

Once accepted, an ADR is never reopened or modified. Always supersede with a new ADR.

## Required Content Elements

| Element      | Detail                                            |
| ------------ | ------------------------------------------------- |
| Decision     | The choice made                                   |
| Rationale    | Problem and trade-offs that led here              |
| Alternatives | Serious options considered, each with pros / cons |
| Consequences | Explicit section when not obvious from rationale  |
| Confidence   | Level under which the decision was made           |
| Triggers     | Context changes that should prompt re-evaluation  |

## Advice Process

ADRs are central to the Advice Process. The act of writing them is used to elicit expertise and alignment across the team, not just to record choices.

## Key Quote

> The most important thing to bear in mind here is brevity. Keep the ADR short and to the point, typically a single page. If there's supporting material, link to it.
