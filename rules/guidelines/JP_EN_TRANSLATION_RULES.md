# JP/EN Translation File Handling

Guidelines for reviewing bilingual documentation with English sources and Japanese translations.

## Translation File Recognition

Files under `.ja/` directory are **Japanese translations** of corresponding English files. They should NOT be compared for content consistency.

| Path Pattern        | Type           | Treatment             |
| ------------------- | -------------- | --------------------- |
| `commands/*.md`     | EN source      | Primary review target |
| `.ja/commands/*.md` | JP translation | Structure-only review |
| `docs/*.md`         | EN source      | Primary review target |
| `.ja/docs/*.md`     | JP translation | Structure-only review |

## Review Rules for Translation Files

**DO Review**:

- Structure consistency (same sections exist)
- YAML frontmatter fields match
- Mermaid diagrams are equivalent
- Links/references are valid

**DO NOT Flag as Issues**:

- Different keywords in examples (e.g., `Navigate to` vs `に移動`)
- Translated content (descriptions, explanations)
- Localized date/number formats
- Different natural language phrasing

## Implementation

When reviewing documentation files:

```yaml
review_strategy:
  en_files:
    path_pattern: "!.ja/**/*.md"
    review_mode: full

  ja_files:
    path_pattern: ".ja/**/*.md"
    review_mode: structure_only
    skip_content_comparison: true

  comparison_rules:
    - Do NOT compare EN content with JP content
    - Check section headings exist (structure match)
    - Verify links are valid in both versions
```

## Example: Valid EN/JP Difference

This is **NOT an issue**:

| EN (`commands/workflow/create.md`) | JP (`.ja/commands/workflow/create.md`) |
| ---------------------------------- | -------------------------------------- |
| `Navigate to https://example.com`  | `https://example.com に移動`           |
| `Click element (uid: abc)`         | `要素をクリック（uid: abc）`           |

Both express the same action in their respective languages.

## Related

- [@./DOCUMENTATION_RULES.md](./DOCUMENTATION_RULES.md) - General documentation guidelines
