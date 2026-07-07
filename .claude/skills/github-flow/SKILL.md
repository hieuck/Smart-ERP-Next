# GitHub Flow

> Project skill: follow GitHub Flow for every change in this repository.

## Workflow

1. **Start from `main`**
   - Ensure your local `main` is up to date: `git checkout main && git pull origin main`.

2. **Create a focused branch**
   - One branch per issue/bugfix/feature.
   - Name pattern: `fix/issue-<number>-<short-description>` or `feat/issue-<number>-<short-description>`.
   - Example: `fix/issue-225-csp-connect-src`.

3. **Make atomic commits**
   - Use [Conventional Commits](https://www.conventionalcommits.org/): `fix:`, `feat:`, `refactor:`, `test:`, `docs:`, `chore:`.
   - Keep each commit focused on a single logical change.

4. **Open a Pull Request**
   - Push the branch and create a PR to `main` with a clear title and body.
   - Reference the linked issue: `Fixes #<number>`.
   - Do not self-approve; rely on CI checks and automated reviews.

5. **Read reviews and CI feedback**
   - Check CodeRabbit, github-advanced-security, codereviewbot, and any human comments.
   - Address findings in the same branch; push updates and re-request checks.

6. **Merge when green**
   - Merge only when all required CI checks pass and there are no unresolved review comments.
   - For owner PRs GitHub blocks self-approval, so merge directly when criteria are met.
   - Use a merge commit (do not squash unrelated fixes together).

7. **Clean up**
   - Delete the merged branch locally and remotely.
   - Verify the linked issue auto-closed.

## Exceptions

- **Fork-based PRs**: If the source branch lives in a fork you cannot push to, create a local review branch, resolve conflicts if needed, and merge into `main` from there.
- **Pre-existing CI blockers**: If a PR is blocked by a failure that is not caused by its changes, fix the root cause in a separate branch/PR, merge it first, then rebase/merge the original PR.

## Rules of thumb

- Never commit directly to `main`.
- Never mix unrelated changes in one PR.
- Never force-push to `main` or protected branches.
- Keep branches short-lived; rebase onto `main` only when necessary to resolve conflicts.
