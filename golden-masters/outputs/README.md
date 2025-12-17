# Golden Masters

Expected output samples for command verification.

## Purpose

Store canonical output examples for each command to enable:

- Regression testing
- Output format verification
- Quality baseline comparison

## Directory Structure

```text
golden-masters/
├── README.md           # This file
├── commit-message.md   # Expected /commit output format
├── pr-description.md   # Expected /pr output format
├── issue-body.md       # Expected /issue output format
├── fix-output.md       # Expected /fix output format (TBD)
├── think-sow.md        # Expected /think SOW output (TBD)
├── think-spec.md       # Expected /think Spec output (TBD)
└── code-output.md      # Expected /code output format (TBD)
```

## Usage

1. Create golden master from successful command execution
2. Compare new outputs against stored masters
3. Update masters when output format intentionally changes

## Status

This directory is part of the Golden Master testing strategy.
See: [tests/README.md](../README.md)
