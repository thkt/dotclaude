#!/bin/bash
# Guardrails Hook Entry Point
# Executes TypeScript rules using bun

cd "$(dirname "$0")"
exec bun run core/runner.ts
