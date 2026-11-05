# Shared Tests

## Overview

This directory contains tests for shared utilities, infrastructure components, and cross-cutting concerns that are used across multiple modules.

## Test Coverage

### Database & Schema
- **db-client.test.ts**: Database client configuration and connection tests
- **sync-schemas.test.ts**: Schema synchronization tests
- **sync-routes.test.ts**: Route synchronization tests

### Modules & Registry
- **registry.test.ts**: Module registry tests
- **scaffold.test.ts**: Module scaffolding tests
- **permissions-matrix.test.ts**: Permissions matrix validation
- **setup-presets.test.ts**: Setup presets tests
- **dependencies.test.ts**: Module dependencies tests
- **package.test.ts**: Module packaging tests
- **standard.test.ts**: Standard module tests
- **access.test.ts**: Module access control tests

### Navigation & UI
- **navigation.test.ts**: Navigation configuration tests
- **directives.test.ts**: Directive tests

### Internationalization
- **i18n.test.ts**: Internationalization configuration tests
- **heroui-client-only.test.ts**: HeroUI client-only component tests

### Data & Change Management
- **changelog.test.ts**: Changelog generation tests
- **teacher-sync.test.ts**: Teacher synchronization tests

## Running Shared Tests

```bash
# Run all shared tests
pnpm test:shared

# Run specific shared test
pnpm test tests/shared/db-client.test.ts
pnpm test tests/shared/navigation.test.ts
```

## Test Organization

Shared tests are organized by functionality:

- **Database-related**: `db-client.test.ts`, `sync-schemas.test.ts`, `sync-routes.test.ts`
- **Module system**: `registry.test.ts`, `scaffold.test.ts`, `permissions-matrix.test.ts`
- **Navigation**: `navigation.test.ts`, `directives.test.ts`
- **Internationalization**: `i18n.test.ts`
- **Data management**: `changelog.test.ts`, `teacher-sync.test.ts`

## Adding New Shared Tests

When adding new shared tests:

1. Identify the shared component or utility to test
2. Create a new test file with a descriptive name
3. Test both normal and edge cases
4. Ensure tests are independent and deterministic
5. Add appropriate documentation

## Best Practices

- Keep tests focused on shared functionality
- Avoid module-specific logic in shared tests
- Test cross-module interactions carefully
- Ensure shared utilities work correctly in all contexts
