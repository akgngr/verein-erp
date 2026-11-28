import assert from "node:assert/strict";
import { describe, test } from "node:test";

import type { PrismaClient } from "@prisma/client";

process.env.DATABASE_URL ??= "postgresql://unused/never-connected";
process.env.AUTH_SECRET ??= "test-mail-fetch-inbox-secret-0123456789";

const prismaGlobal = globalThis as unknown as { prisma?: PrismaClient };

async function withDb<T>(db: PrismaClient, operation: () => Promise<T>): Promise<T> {
  const previous = prismaGlobal.prisma;
  prismaGlobal.prisma = db;
  try {
    return await operation();
  } finally {
    prismaGlobal.prisma = previous;
  }
}

describe("Issue #631 — mail.fetch_inbox scheduled task & inbox-to-documents metadata", () => {
  test("fetchInboxTask has 15-minute intervals and no-ops cleanly when IMAP is not configured", async () => {
    const { fetchInboxTask } = await import("@/modules/mail/automation");
    assert.equal(fetchInboxTask.key, "mail.fetch_inbox");
    assert.equal(fetchInboxTask.schedule?.minIntervalMinutes, 15);
    assert.equal(fetchInboxTask.schedule?.automaticIntervalMinutes, 15);

    const db = {
      mailInboxSettings: {
        findUnique: async () => null,
      },
    } as unknown as PrismaClient;

    const result = await withDb(db, () =>
      fetchInboxTask.handler(
        {},
        {
          executionId: "exec-1",
          taskRunId: "run-1",
          requestedById: null,
          organizationId: "org-1",
          correlationId: "corr-1",
          locale: "tr",
          attempt: 1,
          signal: new AbortController().signal,
        },
      ),
    );
    assert.deepEqual(result, { fetched: 0, created: 0, skipped: true });
  });
});
