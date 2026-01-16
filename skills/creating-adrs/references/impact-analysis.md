# Impact Analysis Guide

## Analysis Areas

| Area           | Key Questions                              | Risk Indicators        |
| -------------- | ------------------------------------------ | ---------------------- |
| Codebase       | How many files affected? Breaking changes? | >10 files, API changes |
| Dependencies   | Package updates? Version conflicts?        | Major version bumps    |
| Team           | Learning cost? Training needed?            | New framework/paradigm |
| Infrastructure | CI/CD changes? Env vars?                   | Build process changes  |
| Performance    | Resource usage change?                     | >10% degradation       |
| Security       | Access control changes?                    | Auth/data handling     |

## Risk Assessment

| Risk Level | Criteria                                          |
| ---------- | ------------------------------------------------- |
| Low        | <5 files, no breaking changes, familiar tech      |
| Medium     | 5-20 files, minor breaking changes, some learning |
| High       | >20 files, major breaking changes, new paradigm   |

## Codebase Impact Checklist

| Check               | Description                   |
| ------------------- | ----------------------------- |
| File count          | Estimate affected files       |
| Breaking changes    | API/interface changes         |
| Compatibility layer | Needed for gradual migration? |
| Migration path      | Can be done incrementally?    |

## Dependency Impact Checklist

| Check             | Description              |
| ----------------- | ------------------------ |
| Package updates   | New/removed dependencies |
| Version conflicts | Peer dependency issues   |
| Build tools       | Bundler/compiler changes |

## Team Impact Checklist

| Check            | Description       |
| ---------------- | ----------------- |
| Learning cost    | Hours per person  |
| Training         | Materials needed? |
| Documentation    | Updates required  |
| Migration period | Timeline estimate |

## Infrastructure Impact Checklist

| Check         | Description       |
| ------------- | ----------------- |
| Build process | Changes needed?   |
| CI/CD         | Pipeline updates? |
| Environment   | New env vars?     |
| Monitoring    | Config updates?   |
