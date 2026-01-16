# CodeRabbit CLI

External AI code review from the command line.

## Overview

CodeRabbit provides AI-powered code reviews as a "second opinion" independent of internal review agents.

## Installation

```bash
npm install -g coderabbit
# or
brew install coderabbit
```

## Basic Usage

### Review Current Changes

```bash
# Review all uncommitted changes
coderabbit review

# Review specific files
coderabbit review src/components/Button.tsx

# Review against specific base
coderabbit review --base main
```

### Review Types

| Command                                | Scope                          |
| -------------------------------------- | ------------------------------ |
| `coderabbit review`                    | All changes                    |
| `coderabbit review --type committed`   | Committed changes only         |
| `coderabbit review --type uncommitted` | Uncommitted changes only       |
| `coderabbit review --type all`         | Both committed and uncommitted |

### Output Options

```bash
# Markdown output
coderabbit review --format markdown

# JSON output (for parsing)
coderabbit review --format json

# Verbose output
coderabbit review --verbose
```

## Common Workflows

### Pre-commit Review

```bash
git add -A
coderabbit review --type uncommitted
# Review suggestions, then commit
```

### Pre-PR Review

```bash
coderabbit review --base main
# Address issues before creating PR
```

### Compare with Base Branch

```bash
coderabbit review --base origin/main --type committed
```

## Review Focus Areas

CodeRabbit analyzes:

- **Security** - Vulnerability detection
- **Performance** - Inefficient patterns
- **Best Practices** - Code quality issues
- **Logic Errors** - Potential bugs
- **Style** - Consistency issues

## When to Use

| Situation      | Recommendation                         |
| -------------- | -------------------------------------- |
| Before commit  | `coderabbit review --type uncommitted` |
| Before PR      | `coderabbit review --base main`        |
| After `/audit` | Second opinion                         |

## Output Interpretation

### Severity Levels

| Level       | Meaning            | Action          |
| ----------- | ------------------ | --------------- |
| 🔴 Critical | Security/major bug | Must fix        |
| 🟠 High     | Important issue    | Should fix      |
| 🟡 Medium   | Quality issue      | Consider fixing |
| 🟢 Low      | Suggestion         | Optional        |

### Example Output

```markdown
## Security Issues (1)

🔴 SQL injection vulnerability in user.ts:42

## Performance (2)

🟠 N+1 query detected in posts.ts:78
🟡 Unnecessary re-render in Dashboard.tsx:23

## Best Practices (1)

🟢 Consider extracting magic number to constant
```

## Best Practices

### 1. Review Before Push

Always run CodeRabbit before pushing to catch issues early.

### 2. Combine with /audit

Use CodeRabbit for quick external perspective, `/audit` for comprehensive internal review.

### 3. Focus on Critical Issues

Address 🔴 and 🟠 issues before proceeding.

## Limitations

- Requires internet connection
- May have rate limits
- Results vary by code complexity
- Not a replacement for human review

## References

- CodeRabbit Documentation: <https://coderabbit.ai/docs>
