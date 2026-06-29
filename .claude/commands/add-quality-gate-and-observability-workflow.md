---
name: add-quality-gate-and-observability-workflow
description: Workflow command scaffold for add-quality-gate-and-observability-workflow in Smart-ERP-Next.
allowed_tools: ["Bash", "Read", "Write", "Grep", "Glob"]
---

# /add-quality-gate-and-observability-workflow

Use this workflow when working on **add-quality-gate-and-observability-workflow** in `Smart-ERP-Next`.

## Goal

Adds or updates quality gates, observability, i18n parity, PWA offline runtime, and related documentation and scripts.

## Common Files

- `.github/workflows/ci.yml`
- `GAPS.md`
- `apps/api/src/common/api-versioning.ts`
- `apps/api/src/common/api-versioning.spec.ts`
- `apps/api/src/main.ts`
- `apps/api/src/monitor/status.controller.ts`

## Suggested Sequence

1. Understand the current state and failure mode before editing.
2. Make the smallest coherent change that satisfies the workflow goal.
3. Run the most relevant verification for touched files.
4. Summarize what changed and what still needs review.

## Typical Commit Signals

- Update or add CI workflow configuration (.github/workflows/ci.yml)
- Update GAPS.md to reflect new or resolved gaps
- Implement or update API versioning and monitoring logic in apps/api/src/common and apps/api/src/monitor
- Update or add PWA and i18n files in apps/web/public and apps/web/src/lib/locales
- Add or update documentation in docs/ (e.g., api-errors.md, api-versioning.md, i18n-parity.md, observability.md, pwa-offline.md, qa-gates.md)

## Notes

- Treat this as a scaffold, not a hard-coded script.
- Update the command if the workflow evolves materially.