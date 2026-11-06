import "server-only";
import { automationTrace } from "./trace";

import { randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import type { z } from "zod";

import { getDb } from "@/shared/db";

import type { EventDefinition } from "./define";

type Tx = Pick<Prisma.TransactionClient, "automationOutbox">;

/**
 * Publish a domain event for workflow triggers via the transactional outbox.
 *
 * Pass the business transaction as `tx` so the event commits atomically with
 * the change. Emitting is a no-op when automation is disabled in this
 * environment or the automation module is not usable, so modules never depend
 * on Automation being installed or active. Payloads are validated and must
 * contain identifiers only (no personal data).
 */
export async function emitAutomationEvent<TSchema extends z.ZodType>(
  event: EventDefinition<TSchema>,
  data: z.input<TSchema>,
  tx?: Tx,
): Promise<boolean> {
  if (process.env.AUTOMATION_ENABLED !== "true") {
    automationTrace("event", "skipped: AUTOMATION_ENABLED is not true in this process", { event: event.key });
    return false;
  }
  const parsed = event.payloadSchema.safeParse(data);
  if (!parsed.success) throw new Error("EVENT_PAYLOAD_INVALID");

  try {
    const { getModuleAvailability } = await import("@/modules/system/automation");
    const availability = await getModuleAvailability("automation");
    if (availability !== "available") {
      automationTrace("event", "skipped: automation module not usable", { event: event.key, availability });
      return false;
    }
  } catch (error) {
    automationTrace("event", "skipped: availability check failed", { event: event.key, error: error instanceof Error ? error.message : "unknown" });
    return false;
  }

  const client = tx ?? getDb();
  await client.automationOutbox.create({
    data: {
      eventKey: `automation.event:${event.key}:${randomUUID()}`,
      eventType: "automation.event",
      payload: JSON.parse(JSON.stringify({ eventKey: event.key, data: parsed.data })) as Prisma.InputJsonValue,
    },
  });
  automationTrace("event", "queued in outbox (worker will pick it up)", { event: event.key });
  return true;
}
