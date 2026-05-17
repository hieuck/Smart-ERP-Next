```markdown
# Smart-ERP-Next Development Patterns

> Auto-generated skill from repository analysis

## Overview
This skill teaches the core development patterns and conventions used in the Smart-ERP-Next TypeScript codebase. It covers file naming, import/export styles, commit message conventions, and testing patterns. While no formal workflows were detected, this guide provides recommended commands and steps for common development tasks.

## Coding Conventions

### File Naming
- Use **camelCase** for file names.
  - Example: `userService.ts`, `orderManager.test.ts`

### Import Style
- Use **relative imports** for referencing modules within the project.
  - Example:
    ```typescript
    import { getUser } from './userService';
    ```

### Export Style
- Use **named exports** to expose functions, classes, or constants.
  - Example:
    ```typescript
    // userService.ts
    export function getUser(id: string) { ... }
    export const USER_ROLE = 'admin';
    ```

### Commit Messages
- Follow **conventional commit** format.
- Use the `chore` prefix for maintenance tasks.
  - Example:
    ```
    chore: update dependencies
    ```

## Workflows

### Code Development
**Trigger:** When adding or modifying features or fixing bugs  
**Command:** `/dev`

1. Create or update TypeScript files using camelCase naming.
2. Use relative imports and named exports as per conventions.
3. Write or update corresponding test files with `.test.` in the filename.
4. Commit changes using the conventional commit format (e.g., `chore: refactor user module`).

### Running Tests
**Trigger:** When verifying code correctness  
**Command:** `/test`

1. Identify test files matching the `*.test.*` pattern.
2. Use the project's test runner (unspecified; check project documentation or scripts).
3. Run all tests and ensure they pass before committing.

### Dependency Maintenance
**Trigger:** When updating or adding dependencies  
**Command:** `/deps`

1. Update dependencies as needed.
2. Commit changes with a `chore:` prefix (e.g., `chore: update typescript to v4.9`).
3. Run tests to verify compatibility.

## Testing Patterns

- Test files follow the `*.test.*` naming pattern (e.g., `userService.test.ts`).
- The specific testing framework is unknown; refer to project documentation or package.json for details.
- Place test files alongside or near the modules they test.
- Example test file structure:
  ```typescript
  // userService.test.ts
  import { getUser } from './userService';

  describe('getUser', () => {
    it('should return user by id', () => {
      // test implementation
    });
  });
  ```

## Commands
| Command | Purpose |
|---------|---------|
| /dev    | Start development workflow (add/modify code, follow conventions) |
| /test   | Run all tests in the codebase |
| /deps   | Update or add dependencies and verify with tests |
```
