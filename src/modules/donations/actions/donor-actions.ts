"use server";

import { getMessageTranslator } from "@/shared/i18n/translate-message";

import { getDb } from "@/shared/db";
import { buildUserLabel } from "@/shared/utils";
import type { ActionResult } from "@/shared/types/action";

import { ActionError, createAction } from "@/modules/auth/server";
import { getMemberAddressBlock } from "@/modules/members/server";

import { donationsPermissions } from "../permissions";
import { donorAnonymizeSchema, donorCreateSchema, donorUpdateSchema } from "../schemas/donor";
import { allocateDonationsNumber, formatDonorNumber, runWithDonationsNumberRetry } from "../services/confirmation-numbers";
import { anonymizeDonor } from "../services/anonymize-donor";

/**
 * Bağışçı aksiyonları (§ 11 md. 2 + § 16): silme YOK (pasifleştirme + anonimleştirme);
 * audit'te ASLA ad/adres — yalnız bağışçı numarası (§ 11 md. 13).
 */

export async function createDonorAction(
  input: unknown,
): Promise<ActionResult<{ id: string; donorNumber: string }>> {
  const run = createAction({
    permission: { definition: donationsPermissions, action: "create" },
    schema: donorCreateSchema,
    handler: async ({ input, user, audit }) => {
      const db = getDb();
      const createdByLabel = buildUserLabel(user.name, user.email);

      // Yinelenen uyarısı (§ 11 md. 2): aynı e-posta veya soyad+PLZ — bilgi amaçlı
      // döner (engellemez; KARAR: onay akışı UI'da, sunucu engel koymaz).
      const duplicateWarning = await (async () => {
        if (input.email) {
          const byEmail = await db.donor.findFirst({
            where: { email: input.email, isAnonymized: false },
            select: { donorNumber: true },
          });
          if (byEmail) return `Bu e-posta başka bağışçıda kayıtlı (SP-${String(byEmail.donorNumber).padStart(4, "0")}).`;
        }
        if (input.lastName && input.postalCode) {
          const byName = await db.donor.findFirst({
            where: { lastName: input.lastName, postalCode: input.postalCode, isAnonymized: false },
            select: { donorNumber: true },
          });
          if (byName) return `Aynı soyad + posta kodu başka bağışçıda kayıtlı (SP-${String(byName.donorNumber).padStart(4, "0")}).`;
        }
        return null;
      })();

      // "Üyeden bağışçı oluştur" (§ 11 md. 2): veri BİR KEZ kopyalanır.
      let memberCopy: Awaited<ReturnType<typeof getMemberAddressBlock>> = null;
      if (input.copyFromMemberId) {
        memberCopy = await getMemberAddressBlock(input.copyFromMemberId);
        if (!memberCopy) {
          throw new ActionError("donations.errors.memberAddressMissing", {
            copyFromMemberId: ["Üye adresi tam değil."],
          });
        }
      }

      const created = await runWithDonationsNumberRetry(() =>
        db.$transaction(async (tx) => {
          const { sequence } = await allocateDonationsNumber(tx, "DONOR", 0);
          return tx.donor.create({
            data: {
              donorNumber: sequence,
              type: input.type,
              firstName: memberCopy ? memberCopy.name.split(" ")[0] : input.firstName,
              lastName: memberCopy
                ? memberCopy.name.split(" ").slice(1).join(" ") || null
                : input.lastName,
              organizationName: input.organizationName,
              street: memberCopy ? memberCopy.street : input.street,
              postalCode: memberCopy ? memberCopy.postalCode : input.postalCode,
              city: memberCopy ? memberCopy.city : input.city,
              country: memberCopy ? memberCopy.country : (input.country ?? "Deutschland"),
              email: input.email,
              phone: input.phone,
              memberId: memberCopy ? memberCopy.memberId : input.memberId,
              note: input.note,
              createdById: user.id,
              createdByLabel,
              updatedById: user.id,
              updatedByLabel: createdByLabel,
            },
          });
        }),
      );

      await audit({
        action: "CREATE",
        entity: "Donor",
        entityId: created.id,
        after: {
          donorNumber: formatDonorNumber(created.donorNumber),
          type: created.type,
          // Gizlilik (§ 11 md. 13): ad/adres/e-posta ASLA yazılmaz.
        },
      });

      return { id: created.id, donorNumber: formatDonorNumber(created.donorNumber), ...(duplicateWarning ? { duplicateWarning } : {}) } as { id: string; donorNumber: string };
    },
  });

  return run(input) as Promise<ActionResult<{ id: string; donorNumber: string }>>;
}

export async function updateDonorAction(input: unknown): Promise<ActionResult> {
  const run = createAction({
    permission: { definition: donationsPermissions, action: "update" },
    schema: donorUpdateSchema.extend({ id: donorCreateSchema.shape.type }),
    handler: async ({ input, user, audit }) => {
      const db = getDb();
      const existing = await db.donor.findUnique({ where: { id: input.id } });
      if (!existing) throw new ActionError("donations.errors.donorNotFound");

      await db.donor.update({
        where: { id: existing.id },
        data: {
          type: input.type,
          firstName: input.firstName,
          lastName: input.lastName,
          organizationName: input.organizationName,
          street: input.street,
          postalCode: input.postalCode,
          city: input.city,
          country: input.country ?? "Deutschland",
          email: input.email,
          phone: input.phone,
          note: input.note,
          isActive: input.isActive ?? existing.isActive,
          updatedById: user.id,
          updatedByLabel: buildUserLabel(user.name, user.email),
        },
      });

      await audit({
        action: input.isActive === false ? "DEACTIVATE" : input.isActive === true ? "ACTIVATE" : "UPDATE",
        entity: "Donor",
        entityId: existing.id,
        before: { donorNumber: formatDonorNumber(existing.donorNumber), isActive: existing.isActive },
        after: { donorNumber: formatDonorNumber(existing.donorNumber), isActive: input.isActive ?? existing.isActive },
      });

      return undefined;
    },
  });

  return run(input) as Promise<ActionResult>;
}

export async function anonymizeDonorAction(input: unknown): Promise<ActionResult> {
  const run = createAction({
    permission: { definition: donationsPermissions, action: "delete" },
    schema: donorAnonymizeSchema,
    handler: async ({ input, user, audit }) => {
      const db = getDb();
      const donor = await db.donor.findUnique({ where: { id: input.id } });
      if (!donor) throw new ActionError("donations.errors.donorNotFound");

      const expected = formatDonorNumber(donor.donorNumber);
      if (input.confirmDonorNumber.trim().toUpperCase() !== expected) {
        const translate = await getMessageTranslator();
        throw new ActionError("donations.errors.confirmNumberMismatch", {
          confirmDonorNumber: [translate("donations.errors.typeDonorNumber", { number: expected })],
        });
      }

      try {
        await anonymizeDonor(donor.id, { id: user.id, label: buildUserLabel(user.name, user.email) });
      } catch (error) {
        if (error instanceof ActionError) throw error;
        throw new ActionError(error instanceof Error ? error.message : "donations.errors.anonymizeFailed");
      }

      await audit({
        action: "ANONYMIZE",
        entity: "Donor",
        entityId: donor.id,
        before: { donorNumber: expected, isAnonymized: false },
        after: { donorNumber: expected, isAnonymized: true },
      });

      return undefined;
    },
  });

  return run(input) as Promise<ActionResult>;
}
