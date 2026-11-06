import "server-only";

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
  if (process.env.AUTOMATION_ENABLED !== "true") return false;
  const parsed = event.payloadSchema.safeParse(data);
  if (!parsed.success) throw new Error("EVENT_PAYLOAD_INVALID");

  try {
    const { getModuleAvailability } = await import("@/modules/system/automation");
    if (await getModuleAvailability("automation") !== "available") return false;
  } catch {
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
  return true;
}
