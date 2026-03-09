#!/bin/bash
# diagnose.sh — Quick project health check for AI agents.
# Run from the project root directory.

set -euo pipefail

echo "=== AgentX Diagnostic Report ==="
echo "Date: $(date -u '+%Y-%m-%dT%H:%M:%SZ')"
echo "Working directory: $(pwd)"
echo ""

# Git status
echo "--- Git Status ---"
if command -v git &>/dev/null && [ -d .git ]; then
    echo "Branch: $(git branch --show-current 2>/dev/null || echo 'detached HEAD')"
    echo "Last commit: $(git log --oneline -1 2>/dev/null || echo 'no commits')"
    CHANGED=$(git status --porcelain 2>/dev/null | wc -l)
    echo "Uncommitted changes: $CHANGED file(s)"
else
    echo "Not a git repository or git not available"
fi
echo ""

# Disk space
echo "--- Disk Space ---"
df -h . 2>/dev/null | tail -1 || echo "df not available"
echo ""

# Check for common build files
echo "--- Project Type Detection ---"
[ -f go.mod ] && echo "Go project (go.mod found)"
[ -f package.json ] && echo "Node.js project (package.json found)"
[ -f requirements.txt ] && echo "Python project (requirements.txt found)"
[ -f Cargo.toml ] && echo "Rust project (Cargo.toml found)"
[ -f Makefile ] && echo "Makefile found"
[ -f .agentx.yaml ] && echo "AgentX config found"
echo ""

# Check for running processes on common ports
echo "--- Port Check ---"
for port in 3000 4317 8080 8443; do
    if command -v ss &>/dev/null; then
        LISTENER=$(ss -tlnp 2>/dev/null | grep ":$port " || true)
        if [ -n "$LISTENER" ]; then
            echo "Port $port: IN USE"
        fi
    fi
done
echo ""

echo "=== End Diagnostic Report ==="
