# Test Organization

## Structure

Tests are organized by **module/feature** to maintain clarity and scalability:

```
tests/
├── accounting/       # Accounting module tests
├── ai/               # AI module tests
├── automation/       # Automation module tests
├── banking/          # Banking module tests
├── courses/          # Courses module tests
├── demo/             # Demo data tests
├── donations/        # Donations module tests
├── mail/             # Mail module tests
├── mailings/         # Mailings module tests
├── members/          # Members module tests
├── modules/          # Module system tests
├── security/         # Security tests
└── shared/           # Shared utilities and infrastructure tests
```

## Test Categories

### Module Tests (`tests/<module>/`)
Unit and integration tests specific to a module. Each module has its own directory.

### Security Tests (`tests/security/`)
Comprehensive security test suite covering:
- Authentication bypass protection
- CSRF protection
- File upload security
- Input validation
- Path traversal prevention
- Rate limiting
- Session security
- SQL injection prevention
- XSS prevention

### Shared Tests (`tests/shared/`)
Tests for shared utilities, infrastructure, and cross-cutting concerns:
- Database client
- Navigation
- Permissions matrix
- Schema synchronization
- Internationalization (i18n)
- Scaffold generation

## Running Tests

### Run all tests
```bash
pnpm test
```

### Run tests for a specific module
```bash
pnpm test:accounting
pnpm test:ai
pnpm test:automation
pnpm test:banking
pnpm test:courses
pnpm test:demo
pnpm test:donations
pnpm test:mail
pnpm test:mailings
pnpm test:members
pnpm test:modules
pnpm test:security
pnpm test:shared
```

### Run all tests sequentially
```bash
pnpm test:all
```

## Test File Naming Convention

Test files follow the pattern: `<feature>.test.ts`

Examples:
- `accounting/tax.test.ts` - Tax calculation tests
- `security/xss.test.ts` - XSS protection tests
- `shared/db-client.test.ts` - Database client tests

## Test Writing Guidelines

1. **Use Node.js test runner**: `import test, { describe } from "node:test"`
2. **Use strict assertions**: `import assert from "node:assert/strict"`
3. **Group related tests**: Use `describe()` to group related test cases
4. **Write clear test names**: Test names should describe the expected behavior
5. **Include documentation**: Use JSDoc comments to explain test purpose and scope

### Example Test Structure

```typescript
import test, { describe } from "node:test";
import assert from "node:assert/strict";

/**
 * Feature Name Tests
 * 
 * PURPOSE: Brief description of what's being tested
 * SCOPE: What areas/components are covered
 */

describe("Feature Name", () => {
  describe("Sub-feature or Scenario", () => {
    test("should do something", async () => {
      // Test implementation
      const result = await someFunction();
      assert.equal(result, expectedValue);
    });
  });
});
```

## Security Testing

The security test suite (`tests/security/`) is a critical part of the testing infrastructure. It verifies that:

1. **Input Validation**: All user inputs are properly validated and sanitized
2. **Authentication**: Users cannot bypass authentication or access unauthorized resources
3. **Authorization**: Proper permission checks are in place
4. **File Uploads**: Dangerous file types and content are rejected
5. **SQL Injection**: Database queries are protected against injection attacks
6. **XSS**: Cross-site scripting attacks are prevented
7. **CSRF**: Cross-site request forgery is prevented
8. **Rate Limiting**: Excessive requests are properly limited
9. **Session Security**: Session management is secure
10. **Path Traversal**: File system access is protected

## Adding New Tests

1. Create a new test file in the appropriate module directory
2. Follow the naming convention: `<feature>.test.ts`
3. Use the standard test structure and assertions
4. Add JSDoc comments explaining the test purpose
5. Run the tests to ensure they pass

## Integration Tests

For end-to-end integration tests, create a new directory under `tests/integration/` and add comprehensive test scenarios that test multiple modules working together.

## Test Data

- Use realistic but synthetic test data
- Clean up test data after each test
- Use test factories or fixtures for common test scenarios
- Avoid hardcoding IDs or values that might change

## Best Practices

1. **Isolate tests**: Each test should be independent of others
2. **Use mocks**: Mock external dependencies to make tests deterministic
3. **Test edge cases**: Include tests for error conditions and boundary values
4. **Keep tests fast**: Avoid unnecessary delays or operations in tests
5. **Update tests with code**: When you change code, update the corresponding tests
