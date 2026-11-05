# Security Tests

## Overview

This directory contains comprehensive security tests for the Verein ERP system. These tests verify that security controls are properly implemented and effective against common vulnerabilities.

## Test Coverage

### Authentication & Authorization
- **auth-bypass.test.ts**: Tests for authentication bypass prevention
  - Middleware protection
  - Session requirements
  - Permission checks
  - Role-based access control

### Attack Prevention
- **csrf.test.ts**: Cross-Site Request Forgery protection tests
  - CSRF token validation
  - State-changing request protection
  - Same-site cookie configuration

- **xss.test.ts**: Cross-Site Scripting protection tests
  - File name sanitization
  - HTML tag removal
  - Event handler stripping
  - JavaScript URL blocking
  - SVG/HTML file rejection
  - Reflected XSS prevention
  - DOM-based XSS prevention

- **sql-injection.test.ts**: SQL Injection prevention tests
  - Prisma ORM parameterized queries
  - Raw query safety
  - Input sanitization

- **path-traversal.test.ts**: Path Traversal protection tests
  - File path validation
  - Directory traversal prevention
  - Safe file operations

- **file-upload.test.ts**: File Upload security tests
  - Dangerous file type rejection
  - Magic byte validation
  - MIME type verification
  - File size limits
  - Empty file rejection

### Input Validation
- **input-validation.test.ts**: Input validation and sanitization tests
  - Email validation
  - URL validation
  - HTML sanitization
  - Special character handling
  - Length limits

### Infrastructure Security
- **session.test.ts**: Session security tests
  - Session fixation prevention
  - Session timeout
  - Session cookie security
  - Concurrent session handling

- **rate-limiting.test.ts**: Rate limiting tests
  - Request rate limiting
  - Burst protection
  - IP-based limiting
  - User-based limiting

- **secret-box.test.ts**: Encryption and secret management tests
  - Data encryption
  - Secret box functionality
  - Key management

## Running Security Tests

```bash
# Run all security tests
pnpm test:security

# Run specific security test
pnpm test tests/security/xss.test.ts
pnpm test tests/security/sql-injection.test.ts
```

## Security Test Principles

1. **Defense in Depth**: Multiple layers of security controls
2. **Fail Secure**: Default to secure behavior
3. **Least Privilege**: Minimum necessary permissions
4. **Input Validation**: Validate all inputs at all layers
5. **Output Encoding**: Encode outputs to prevent injection
6. **Security by Design**: Security is built-in, not bolted-on

## Test Structure

Each security test file follows this pattern:

```typescript
import test, { describe } from "node:test";
import assert from "node:assert/strict";

/**
 * Security Feature Tests
 * 
 * PURPOSE: What vulnerability this prevents
 * SCOPE: What areas are covered
 */

describe("Security Feature", () => {
  describe("Attack Vector", () => {
    test("should prevent attack", async () => {
      // Test that malicious input is rejected
      const result = await securityFunction(maliciousInput);
      assert.equal(result, expectedSafeResult);
    });
  });
});
```

## Adding New Security Tests

When adding new security tests:

1. Identify the vulnerability or security control to test
2. Create a new test file or add to an existing one
3. Test both positive (safe inputs) and negative (malicious inputs) cases
4. Verify that security controls are effective
5. Document the vulnerability and expected behavior

## Security Test Checklist

- [ ] Authentication bypass attempts are blocked
- [ ] CSRF tokens are required for state-changing requests
- [ ] XSS payloads are sanitized or rejected
- [ ] SQL injection attempts are prevented
- [ ] Path traversal attempts are blocked
- [ ] Dangerous file uploads are rejected
- [ ] Input validation is comprehensive
- [ ] Session management is secure
- [ ] Rate limiting is effective
- [ ] Sensitive data is encrypted

## Vulnerability References

These tests cover vulnerabilities from:
- OWASP Top 10
- CWE/SANS Top 25
- Common web application vulnerabilities
- Specific framework vulnerabilities (Next.js, Prisma, etc.)

## Test Data

Security tests use:
- Common attack payloads (XSS, SQLi, etc.)
- Malicious file types and content
- Edge cases and boundary values
- Real-world attack patterns

## Important Notes

- Security tests should **never** use real sensitive data
- Tests should be safe to run in any environment
- Failed security tests indicate **critical vulnerabilities** that must be fixed immediately
- Security test coverage should be reviewed regularly
