# Integration Tests

## Overview

This directory is reserved for end-to-end integration tests that test multiple modules working together.

## Current Status

Integration tests are not yet implemented. As the system grows, integration tests should be added here to verify:

- Module interactions
- Data flow between modules
- End-to-end user journeys
- System-wide functionality

## Adding Integration Tests

When adding integration tests:

1. Create test files following the pattern: `<scenario>.test.ts`
2. Test complete workflows that span multiple modules
3. Use realistic test data and scenarios
4. Ensure tests are independent and can run in isolation
5. Document the scenario being tested

## Example Integration Test Structure

```typescript
import test, { describe } from "node:test";
import assert from "node:assert/strict";

/**
 * Member Registration to Payment Integration Test
 * 
 * PURPOSE: Verify complete member registration and payment workflow
 * SCOPE: Members module, Accounting module, Automation module
 */

describe("Member Registration to Payment Flow", () => {
  test("complete registration and payment workflow", async () => {
    // 1. Create a new member
    // 2. Trigger membership fee calculation
    // 3. Generate invoice
    // 4. Process payment
    // 5. Verify all modules are updated correctly
    
    const result = await completeWorkflow();
    assert.equal(result.success, true);
  });
});
```

## Recommended Integration Test Scenarios

- Member registration → Membership fee calculation → Invoice generation
- Course creation → Student enrollment → Payment processing
- Donation collection → Receipt generation → Accounting entry
- Automation task → Worker execution → Result processing
- Multi-module data synchronization
