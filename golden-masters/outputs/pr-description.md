<!--
Golden Master: Output - PR Description

Selection criteria:
- Comprehensive but scannable
- Clear motivation and changes
- Actionable test plan
- Appropriate linking to issues

Features:
- Summary with bullet points
- Test plan checklist
- Breaking change callout
- Related issues section

Source: /pr command output

Last Reviewed: 2025-12-17
Update Reason: Initial creation
Previous Version: N/A
-->

# PR Description - Expected Output Format

## Format Structure

```markdown
## Summary
<1-3 bullet points describing what this PR does>

## Motivation
<Why these changes are needed>

## Changes
<Detailed breakdown of changes>

## Test Plan
<How to verify this PR works>

## Related
<Links to issues, other PRs, documentation>
```

## Good Example: Feature PR

```markdown
## Summary

- Add OAuth2 authentication with Google and GitHub providers
- Implement session management with secure cookie storage
- Create login/logout UI components

## Motivation

Enterprise users requested single sign-on capability to reduce
password fatigue and integrate with their identity providers.
This also improves security by delegating authentication to
established providers.

## Changes

### Authentication Flow
- `src/auth/oauth.ts` - OAuth2 client implementation
- `src/auth/session.ts` - Session management with Redis
- `src/auth/providers/` - Provider-specific configurations

### UI Components
- `src/components/LoginButton.tsx` - Social login buttons
- `src/components/UserMenu.tsx` - Authenticated user dropdown

### Configuration
- Added OAuth credentials to environment schema
- Updated CORS settings for OAuth callbacks

## Test Plan

- [ ] Login with Google account
- [ ] Login with GitHub account
- [ ] Verify session persists across page reload
- [ ] Logout and verify session cleared
- [ ] Test with invalid credentials (expect graceful error)

## Related

- Closes #123
- Related to #456 (security audit)
- Docs: `docs/auth.md`
```

## Good Example: Bug Fix PR

```markdown
## Summary

- Fix timeout errors in user search endpoint
- Add database index for query optimization

## Motivation

Users reported intermittent 504 errors when searching with
date filters. Investigation revealed missing index causing
full table scans on the 10M+ row users table.

## Changes

- Add composite index on `(user_id, created_at)`
- Implement cursor-based pagination (was offset-based)
- Add query explain logging for monitoring

## Test Plan

- [ ] Search with date range filter (should complete <500ms)
- [ ] Verify pagination works with 1000+ results
- [ ] Check no regression in other search scenarios

## Related

- Fixes #789
- Performance baseline: [dashboard link]
```

## Good Example: Breaking Change PR

```markdown
## Summary

- Migrate configuration format from JSON to YAML
- Add configuration validation on startup
- Provide migration script for existing installations

## ⚠️ Breaking Changes

Configuration files must be converted from JSON to YAML format.

**Migration steps:**
1. Run `npm run migrate-config`
2. Review generated `config.yaml`
3. Remove old `config.json`

## Changes

- Replace `config.json` parser with YAML parser
- Add JSON Schema validation for config
- Create `scripts/migrate-config.ts`

## Test Plan

- [ ] Fresh installation with new YAML config
- [ ] Migration from JSON config (run script)
- [ ] Invalid config rejected with clear error message
- [ ] All existing features work after migration

## Related

- Closes #234
- Migration guide: `docs/migration-v2.md`
```

## Bad Examples (Anti-patterns)

```markdown
❌ Too vague:
## Summary
Fixed stuff

❌ No test plan:
## Summary
Add new feature
## Changes
Changed some files

❌ Wall of text (no structure):
This PR adds OAuth authentication. I implemented Google and GitHub
providers and also added session management. The UI has new components
for login. I also updated the configuration...

❌ Missing motivation:
## Summary
- Add OAuth2 authentication
## Changes
[detailed changes but no "why"]
```

## Evaluation Criteria

| Aspect | Points | Criteria |
| --- | --- | --- |
| Summary Clarity | 25 | Scannable, specific bullets |
| Motivation | 25 | Clear "why", not just "what" |
| Test Plan | 25 | Actionable, checkbox format |
| Completeness | 25 | Related links, breaking changes noted |

## Section Guidelines

### Summary

- 1-3 bullet points
- Focus on user-visible changes
- Use action verbs (Add, Fix, Update, Remove)

### Motivation

- Problem statement
- User impact
- Why now

### Changes

- Group by area (API, UI, Config)
- List affected files for large PRs
- Highlight architectural decisions

### Test Plan

- Checkbox format for reviewers
- Include happy path and edge cases
- Note manual vs automated tests

### Related

- Use "Closes #X" for auto-closing
- Link to documentation
- Reference dependent PRs
