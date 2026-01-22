---
name: utilizing-llms-txt
description: >
  LLM-optimized documentation fetching using llms.txt standard.
  Use when fetching external documentation, API references, library docs,
  or when user mentions ドキュメント参照, 公式ドキュメント, API docs, library documentation.
allowed-tools: [WebFetch, Read]
user-invocable: false
---

# llms.txt Documentation Fetching

## Fetch Order

When fetching external documentation:

| Step | Action                     | 200 OK     | 404      |
| ---- | -------------------------- | ---------- | -------- |
| 1    | `{base_url}/llms.txt`      | Use        | → Step 2 |
| 2    | `{base_url}/llms-full.txt` | Use        | → Step 3 |
| 3    | `{original_url}`           | Use (HTML) | -        |

## Parse llms.txt

| Pattern         | Meaning      | Action             |
| --------------- | ------------ | ------------------ |
| `# Title`       | Project name | Context            |
| `> Blockquote`  | Summary      | Context            |
| `## Section`    | Category     | Navigate           |
| `- [Link](url)` | Page link    | Fetch if relevant  |
| `## Optional`   | Low priority | Skip unless needed |

## Base URL Extraction

| Element | Value                                           |
| ------- | ----------------------------------------------- |
| Input   | `https://docs.stripe.com/api/checkout/sessions` |
| Output  | `https://docs.stripe.com`                       |
| Rule    | `{scheme}://{host}`                             |
