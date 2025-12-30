# Specification Context (Auto-Detection)

This module handles automatic detection and loading of spec.md for implementation guidance.

## Discover Latest Spec

Search for spec.md in SOW workspace using Glob:

- Project-local: `.claude/workspace/planning/**/spec.md`
- Global: `~/.claude/workspace/planning/**/spec.md`

## Load Specification for Implementation

**If spec.md exists**, use it as implementation guide:

- **Functional Requirements (FR-xxx)**: Define what to implement
- **API Specifications**: Provide exact request/response structures
- **Data Models**: Show expected data structures and validation rules
- **UI Specifications**: Define layout, validation, and interactions
- **Test Scenarios**: Guide test case creation with Given-When-Then
- **Implementation Checklist**: Track implementation progress

**If spec.md does not exist**:

- Proceed with implementation based on available requirements
- Consider running `/think` first to generate specification
- Document assumptions and design decisions inline

## Integration

This ensures implementation aligns with specification from the start.

When spec.md is found:

1. Parse functional requirements (FR-xxx)
2. Extract test scenarios for test-generator
3. Use API specs for implementation details
4. Track progress against implementation checklist
