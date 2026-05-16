# Development Loop Design for Smart ERP Next

## Goal
Continuously improve Smart ERP Next to surpass competitors (ERPNext, Odoo, VietERP, KiotViet, Nhanhvn, Misa, Sapo, Knote) by:
- Ensuring native support for all platforms (web, mobile, desktop)
- Maintaining proper localization (no hardcoded Vietnamese text, correct encoding)
- Fixing formatting issues (line endings, trailing spaces)
- Updating related documentation
- Implementing small, meaningful features from a prioritized backlog
- Making smart, atomic commits

## Loop Iteration Process
Each iteration (running every minute) performs the following steps:

### 1. Localization Check
- Scan a designated directory for hardcoded Vietnamese strings in source files (excluding i18n locale files and config files)
- For any found, move the string to the appropriate i18n JSON file (vi/common.json and en/common.json) and replace with t() call
- Focus directories rotate: apps/web/src, apps/api/src, apps/mobile/src, apps/desktop/src, packages/

### 2. Formatting Check
- Check and fix line endings (ensure LF, not CRLF) in the same directory
- Remove trailing whitespace
- Ensure files are saved as UTF-8 without BOM

### 3. Documentation Update
- If during the scan outdated documentation is observed (e.g., comments not matching code, missing README updates), update it
- Prioritize: inline comments, API docs (if any), user-facing docs in docs/

### 4. Development Task
- Work on the top item from the backlog (MAINTAINED in BACKLOG.md)
- Current backlog focus: Analytics Dashboard enhancements
  - *Next task*: Add export functionality (Excel/PDF) for dashboard reports
  - *Subsequent tasks*: 
    - Drill-down capabilities in charts
    - Save/share custom dashboards
    - Real-time data updates
- Follow TDD: write tests first, then implement
- Ensure all changes are platform-native and localized

### 5. Commit
- If any changes were made in steps 1-4, create a git commit with:
  - Conventional commit format: <type>(<scope>): <description>
  - Types: feat, fix, docs, style, refactor, test, chore
  - Scopes: api, web, mobile, desktop, db, i18n, ui, sync, types, validation, hooks, utils, docs
  - Include Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
- Only commit if changes pass linting and tests (if applicable)

## Backlog Management
- BACKLOG.md stored at project root
- Format: 
  # Backlog
  - [ ] feat(analytics): Add export to Excel/PDF for dashboard reports
  - [ ] feat(analytics): Add drill-down capabilities in charts
  - [ ] feat(qms): Add supplier quality scorecard view
  - [ ] feat(manufacturing): Add work order management screen
  - [ ] chore: Update API documentation for new endpoints
- Items are prioritized by impact and effort
- New items can be added during the loop if identified

## Platform Native Assurance
- All code changes must respect the project structure:
  - Apps: apps/api/src (NestJS), apps/web/src (Next.js), apps/mobile/src (Expo), apps/desktop/src (Tauri)
  - Packages: packages/ for shared libraries only
- No nested app directories or misplaced code
- UI components must use platform-appropriate libraries
- Mobile/Desktop changes tested via emulators/simulators when possible

## Vietnamese Localization Rules
- Never hardcode user-facing Vietnamese text outside of i18n translation files
- All source files must be UTF-8 without BOM
- Use LF line endings
- i18n keys follow dot notation: `module.key.subkey` (e.g., `analytics.export.button`)
- Add new keys to both vi/common.json and en/common.json simultaneously
- Backend exception messages: use English (may be displayed to frontend via alerts)

## Success Criteria Per Iteration
- No new hardcoded Vietnamese strings introduced in scanned directory
- Line endings and encoding corrected in scanned directory
- Documentation updated if needed
- Backlog item progressed (test written, feature implemented, or refactored)
- Changes committed if they meet quality bar
- Loop continues to next interval

## Tools & References
- Localization scan: custom script or grep for Vietnamese Unicode ranges
- Formatting: editorconfig, prettier, eslint
- Testing: Jest (web), Jest/Puppeteer (e2e), Jest (API)
- Commit verification: git diff, lint-staged

## Appendix: Directory Rotation Schedule
Iteration 1: apps/web/src
Iteration 2: apps/api/src
Iteration 3: apps/mobile/src
Iteration 4: apps/desktop/src
Iteration 5: packages/
Iteration 6: apps/web/src (repeat)