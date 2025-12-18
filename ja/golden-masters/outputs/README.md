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
├── fix-output.md       # Expected /fix output format
├── think-sow.md        # Expected /think SOW output
├── think-spec.md       # Expected /think Spec output
└── code-output.md      # Expected /code output format
```

## Usage

1. Create golden master from successful command execution
2. Compare new outputs against stored masters
3. Update masters when output format intentionally changes

## Status

This directory is part of the Golden Master testing strategy.
See: [tests/README.md](../README.md)
