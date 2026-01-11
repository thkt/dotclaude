# PR Description Format

Template and guidelines for comprehensive pull request descriptions.

## Template

```markdown
## Summary

- [1-3 bullet points of main changes]

## Changes

- [Key change 1]
- [Key change 2]
- [Key change 3]

## Test Plan

- [ ] Unit tests added/updated
- [ ] Integration tests pass
- [ ] Manual testing completed

## Related

- Closes #123
- Related to #456
```

## Section Details

### Summary

High-level overview for quick understanding:

- What problem does this solve?
- What's the approach?
- Any notable decisions?

### Changes

Detailed list of modifications:

- Group by component/area
- Include both additions and removals
- Mention breaking changes prominently

### Test Plan

Verification steps:

- Automated tests added
- Manual testing performed
- Edge cases covered

### Related

Issue and PR links:

- `Closes #123` - Auto-closes issue on merge
- `Fixes #456` - Same as Closes
- `Related to #789` - For reference without closing

## Generation Process

```text
1. Analyze git log since base branch
2. Group commits by type and scope
3. Extract key changes from diffs
4. Generate summary from commit messages
5. Create test plan checklist
```

## Git Commands for Analysis

```bash
# Commits since branching
git log main..HEAD --oneline

# Full diff summary
git diff main...HEAD --stat

# Detailed changes
git diff main...HEAD
```

## Good Example

```markdown
## Summary

- Add OAuth2 authentication with Google and GitHub providers
- Implement session management with secure cookie storage
- Add protected route middleware

## Changes

### Auth Module

- New `AuthProvider` component wrapping the app
- `useAuth` hook for accessing auth state
- Login/logout API routes

### Security

- HttpOnly cookies for session tokens
- CSRF protection on all mutations
- Rate limiting on auth endpoints

### UI

- Login page with provider selection
- User menu with profile and logout
- Loading states during auth operations

## Test Plan

- [x] Unit tests for auth hooks
- [x] Integration tests for login flow
- [x] Manual testing: login, logout, session persistence
- [x] Security review: XSS, CSRF, session fixation

## Related

- Closes #123 (Add user authentication)
- Related to #100 (Security audit)
```

## Bad Example

```markdown
## Summary

Added auth

## Changes

- stuff

## Test Plan

works on my machine
```

## Related

- Commit messages: [@./commit-messages.md](./commit-messages.md)
- Issue templates: [@./issue-templates.md](./issue-templates.md)
