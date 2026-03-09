# Debugging

A cross-provider debugging skill for systematically diagnosing and resolving issues.

## When to Use

Use this skill when:
- A test failure or build error is unclear
- An agent is stuck in a loop or making no progress
- Runtime behavior doesn't match expectations
- You need to investigate state, logs, or configuration

## Diagnostic Steps

1. **Read the error message carefully.** Extract the file, line, and error type.
2. **Check recent changes.** Run `git diff` to see what changed since the last working state.
3. **Reproduce minimally.** Isolate the failing test or smallest reproduction case.
4. **Check logs and state.** Look for relevant log files, environment variables, or config issues.
5. **Search for similar patterns.** Use grep/find to locate related code or prior fixes.
6. **Fix and verify.** Apply the fix, run the failing test, then run the full test suite.

## Common Failure Patterns

| Symptom | Likely Cause | Investigation |
|---------|-------------|---------------|
| Import/module error | Missing dependency | Check go.mod / package.json / requirements.txt |
| Permission denied | File permissions or missing credentials | Check file modes and env vars |
| Test timeout | Deadlock or infinite loop | Add debug logging, check for blocking calls |
| Nil pointer / undefined | Uninitialized variable or missing return | Trace the call chain |
| Port already in use | Zombie process from previous run | Check `lsof -i :<port>` or `ss -tlnp` |

## Debug Commands

```bash
# Check process state
ps aux | grep <process-name>

# Check listening ports
ss -tlnp | grep <port>

# Check disk space
df -h

# Check recent git changes
git log --oneline -10
git diff HEAD~1

# Check environment
env | grep -i <keyword>
```

## Scripts

The `scripts/diagnose.sh` script automates common diagnostic checks.
Run it from the project root to get a quick health overview.
