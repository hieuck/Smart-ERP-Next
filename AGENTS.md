# Autonomous Dev Team Policy

This file defines the default workflow for an autonomous execution / continuous operation dev team using the following superpowers skills:

- `using-superpowers`
- `karpathy-guidelines`
- `test-driven-development`
- `systematic-debugging`
- `verification-before-completion`
- `finishing-a-development-branch`

It applies when no explicit user instruction overrides it.

## 1. Always Invoke Skills First

At the start of every task or sub-task, identify applicable skills and invoke them via the `Skill` tool before acting. Prefer the `Skill` tool over reading skill files directly. If `Skill` is unavailable due to mode restrictions, fall back to reading the skill file.

## 2. Language

Respond to the user in Vietnamese unless the user writes in another language.

## 3. Task Intake & Monitoring

### 3.1 Check Issues / PRs (GitHub via `gh`)

`gh` is the canonical interface for GitHub. Prefer it over scraping web URLs or guessing API paths. If GitHub MCP is also available, either is acceptable; default to `gh` unless MCP is clearly more convenient for the operation.

- **Auth**: check `gh auth status`. If logged out, ask the user to run `gh auth login`.
- **Repo**: inferred from cwd. Pass `-R OWNER/REPO` when outside the repo.
- **Discovery**: use `gh <cmd> --help` rather than guessing flags.

#### Reading issues / PRs

- Summarize the issue/PR, reproduction steps, expected vs actual behavior, and acceptance criteria.
- Do not start implementation until the goal and success criteria are clear.
- Read-only commands are fine without extra approval:
  - `gh issue list/view`
  - `gh pr list/view/diff/checks/status`
  - `gh run view ...`
  - `gh api` GET requests.

#### PR review

Find PRs awaiting your review:

```bash
gh pr list --search "review-requested:@me"
```

Existing review state — two endpoints, easy to confuse:

```bash
gh api repos/OWNER/REPO/pulls/123/comments  --paginate   # inline, line-anchored
gh api repos/OWNER/REPO/issues/123/comments --paginate   # PR-level conversation
```

Post inline comments in one review (line-anchored, multi-comment) — use the API:

```bash
gh api repos/OWNER/REPO/pulls/123/reviews -f event=COMMENT \
  -f body="overall notes" \
  -F 'comments[][path]=src/foo.py' -F 'comments[][line]=42' \
  -F 'comments[][body]=this is wrong because…'
```

Resolve a review thread (GraphQL):

```bash
gh api graphql -f query='mutation($id:ID!){resolveReviewThread(input:{threadId:$id}){thread{isResolved}}}' -F id=THREAD_NODE_ID
```

Reply to a specific inline thread:

```bash
gh api repos/OWNER/REPO/pulls/123/comments/COMMENT_ID/replies -f body="fixed in abc1234"
```

Top-level review verbs:

```bash
gh pr review <N> --approve|--request-changes|--comment -b "…"
```

**These review/comment actions require explicit user consent before running.**

#### Workflow runs

Default to failed-only logs:

```bash
gh run view 123456 --log-failed          # preferred
gh run view 123456 --log | tail -200     # only if --log-failed isn't enough
```

Find the run behind a PR's latest push:

```bash
gh pr checks 123 --json name,state,link,workflow
```

#### `gh api` cheatsheet

- `-f key=val` — string param
- `-F key=val` — typed (numbers, booleans, `@file`)
- `-X METHOD` — HTTP verb
- `--jq '.field'` — filter response
- `--paginate` — follow `Link` headers

#### Mutating commands — require explicit consent

Do **not** run these unprompted:

- PR/issue posts: `gh pr review` (any of `--approve`, `--request-changes`, `--comment`), `gh pr comment`, `gh issue comment`, posts via `gh api .../comments` or `.../reviews`.
- PR state changes: `gh pr merge` (any flags), `gh pr close`, `gh pr reopen`, `gh pr ready` / `--undo`, `gh pr edit`.
- CI: `gh run rerun`, `gh run cancel`.
- Issue state changes: `gh issue close`, `gh issue reopen`, `gh issue edit`, `gh issue delete`.
- Releases: `gh release create`, `gh release edit`, `gh release delete`.
- Any `gh api -X POST/PATCH/PUT/DELETE` that mutates state, including resolving review threads.
- Git remote ops: pushing branches, force-push, deleting branches/tags.

When in doubt, surface the exact command and wait for approval.

#### Output discipline

- `gh run view --log` is huge — use `--log-failed` or `| tail -N`.
- `gh api ... --paginate` can be massive — add `--jq`.
- `gh pr diff` on big PRs — use `--name-only` first, then targeted reads.

### 3.2 Define Success Criteria

For every task, state:

1. Goal in one sentence.
2. Observable success criteria (e.g., tests pass, behavior demonstrated, command output).
3. Verification command.

## 4. Implementation Workflow

Choose the path based on task type:

### 4.1 Bug Fix

1. Load `systematic-debugging`.
2. Follow all 4 phases: root cause investigation → pattern analysis → hypothesis & test → implementation.
3. Before fixing, create a failing test that reproduces the bug (use `test-driven-development`).
4. Implement the minimal fix.
5. Verify the test passes and no other tests break.

### 4.2 New Feature

1. Load `brainstorming` if the feature is non-trivial or ambiguous.
2. Load `test-driven-development`.
3. Write a failing test describing the desired behavior.
4. Implement the minimum code to pass (per `karpathy-guidelines`).
5. Refactor while keeping tests green.

### 4.3 Refactoring

1. Load `test-driven-development`.
2. Ensure tests exist and pass before refactoring.
3. Make surgical changes only; do not "improve" adjacent code.
4. Keep tests green throughout.

## 5. Karpathy Principles During Coding

- **Think before coding**: state assumptions explicitly; if unclear, ask or document.
- **Simplicity first**: no speculative abstractions or features beyond the task.
- **Surgical changes**: only touch what must change; clean up only orphans created by your changes.
- **Goal-driven execution**: every task has verifiable success criteria.

## 6. TDD Non-Negotiables

- No production code without a failing test first.
- Watch the test fail for the expected reason before implementing.
- Write the minimum code to make it pass.
- Refactor only on green.
- If an exception is needed (generated code, throwaway prototype, pure config), document the exception and the reason.

## 7. Root Cause Rule

- Always fix the root cause, not the symptom.
- If investigation shows an architectural issue, or if 3+ attempted fixes have failed, stop and escalate rather than continue guessing.
- Add diagnostic instrumentation at component boundaries when needed.

## 8. Autonomous Execution / No-Human Fallback

Many skills say "ask your human partner." In autonomous/continuous mode, use this ladder when a human is not immediately available:

| Risk | Action |
|---|---|
| Low, reversible | Choose the safest default, document the assumption, proceed. |
| Medium | Choose the most conservative option, flag for later human review, proceed. |
| High, uncertain, or could cause data loss | Pause execution and notify the human. Do not guess. |

If a skill explicitly requires human approval before a destructive action (e.g., discard branch, force-push, release to production), always wait for approval unless this policy explicitly grants autonomy below.

## 9. Smart Commit Policy

- Commit only after tests pass (`npm test`, `pytest`, `cargo test`, etc.).
- Commit atomic logical units; do not mix unrelated changes.
- Include the failing test and its fix in the same commit when using TDD.
- Use conventional commit style: `feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`.
- Do not commit WIP, debug prints, or commented-out code.

## 10. Smart Release Policy

A release may only happen after:

1. All tests pass.
2. Code review / PR is merged or explicitly approved.
3. Version bump and changelog are updated if applicable.

In autonomous mode, the default branch-completion action is **push branch and create Pull Request** (do not auto-merge unless explicitly configured). Production deployment must have a final human approval gate unless the user has explicitly disabled it.

## 11. Branch Completion

When implementation is complete and tests pass, load `finishing-a-development-branch` and follow it. In autonomous mode:

- Default to option 2: **Push branch and create PR**.
- Do not clean up the worktree for the PR option (user may need to iterate).
- For destructive options (discard), require explicit typed confirmation.

## 12. Verification Before Completion

Before claiming any task is done:

- Run the project's test command.
- Run lint/typecheck if the project uses them.
- Confirm output is pristine (no warnings/errors).
- Cite the command output as evidence.

## 13. Conflict Resolution

If any instruction conflicts with a superpowers skill:

1. Explicit user instruction wins.
2. This `AGENTS.md` policy wins over default system behavior.
3. When two skills conflict, process skills (`systematic-debugging`, `test-driven-development`) take precedence over implementation skills (`karpathy-guidelines`) for *how to approach*, but `karpathy-guidelines` governs *how to write code*.
4. When autonomy rules conflict with "ask human" rules, use the risk ladder in section 8.

## 14. Forbidden Shortcuts

Never:

- Skip a failing test.
- Write production code before its test.
- Propose fixes before root cause investigation.
- Bundle unrelated changes in one commit.
- Merge or release with failing tests.
- Force-push, delete branches, or deploy to production without explicit approval (unless configured).
