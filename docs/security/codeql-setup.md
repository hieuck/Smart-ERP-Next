# CodeQL Setup

## What runs

Smart ERP Next uses **GitHub default CodeQL setup** for static application security testing (SAST). Default setup is enabled at the repository level and runs automatically on:

- Pull requests that modify JavaScript/TypeScript/Actions/Python files.
- Pushes to the default branch.
- A weekly schedule.

There is **no custom `.github/workflows/codeql.yml`** in this repository. It was removed in PR #45 because a custom advanced configuration conflicts with default setup with the error:

```
CodeQL analyses from advanced configurations cannot be processed when the default setup is enabled.
```

## Why PR checks show multiple CodeQL entries

You may see these checks on a PR:

| Check name | Source | Purpose |
|---|---|---|
| `CodeQL` | GitHub default setup | Summary result across all languages |
| `Analyze (javascript-typescript)` | Default setup | Detailed JavaScript/TypeScript analysis |
| `Analyze (actions)` | Default setup | GitHub Actions workflow analysis |
| `Analyze (python)` | Default setup | Python analysis |

This is not a duplicate workflow. It is the expected breakdown from default setup, which analyzes each language separately and then rolls up a summary.

## Verify there is no duplicate workflow

```bash
ls .github/workflows/
gh workflow list
```

You should see only `ci.yml`, `deploy-staging.yml`, and `release.yml`.

## Triage

If a PR shows more than one CodeQL result and you suspect duplication:

1. Confirm there is no `.github/workflows/codeql.yml` in the branch.
2. Check repository **Settings → Security → Code scanning → Default setup**. It should be enabled.
3. Review the language matrix under the `CodeQL` check to confirm each entry is a different language.

## References

- [About default setup for CodeQL](https://docs.github.com/en/code-security/code-scanning/enabling-code-scanning/configuring-default-setup-for-code-scanning)
- Issue #52 — [BUG] duplicate CodeQL Github Action?
