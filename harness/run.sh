#!/usr/bin/env bash
# One command that runs a single function's generated test through one of
# the four checks (vitest, coverage, tsc, stryker), in the right directory
# for its mode. Usage: harness/run.sh <repo> <fn-id> <step>
set -euo pipefail
cd "$(dirname "$0")/.."
exec npx tsx scripts/run-step.ts "$@"
