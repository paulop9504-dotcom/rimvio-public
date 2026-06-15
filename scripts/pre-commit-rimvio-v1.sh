#!/usr/bin/env sh
# Optional git hook: cp scripts/pre-commit-rimvio-v1.sh .git/hooks/pre-commit && chmod +x .git/hooks/pre-commit
set -e
npm run verify:rimvio-v1
