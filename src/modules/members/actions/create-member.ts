"use server";

import { getDb } from "@/shared/db";
import { buildUserLabel } from "@/shared/utils";
import type { ActionResult } from "@/shared/types/action";

import { ActionError, createAction } from "@/modules/auth/server";

import { membersPermissions } from "../permissions";
import { memberCreateSchema } from "../schemas/member";
import {
  allocateMembershipNumber,
  runWithMembershipNumberRetry,
} from "../services/membership-number";
import { berlinYear, parseDateOnly, berlinToday } from "../utils";
import { checkMemberDates, hasProblems } from "../services/date-rules";

/**
 * Yeni üye kaydı: üyelik numarası ve sıra yıl bazında sayacın atomik
 * artırılmasıyla ÜRETİLİR. Numara sonradan değiştirilemez — şemada
 * membershipNumber alanı yoktur. status verilmezse varsayılan ACTIVE.
 *
 * KARAR (Verein pivotu): kimlikNo alanı DB düzeyinde unique DEĞİLDİR; serbest
 * metindir. Aynı değerin iki üyede kullanılmasına izin verilir (örn. farklı
 * iki üyenin aynı Mitgliedsnummer numarasını yanlışlıkla girmesi). Yine de
 * audit'e ASLA yazılmaz (hassas alan kuralı).
 */
export async function createMemberAction(
  input: unknown,
): Promise<ActionResult<{ id: string; membershipNumber: string }>> {
  const run = createAction({
    permission: { definition: membersPermissions, action: "create" },
    schema: memberCreateSchema,
    handler: async ({ input, user, audit }) => {
      const db = getDb();

      const joinDate = parseDateOnly(input.joinDate);
      if (!joinDate) {
        throw new ActionError("members.errors.joinDateInvalid", {
          joinDate: ["members.validation.joinDateInvalid"],
        });
      }
      const birthDate = input.birthDate ? parseDateOnly(input.birthDate) : null;
      const exitDate = input.exitDate ? parseDateOnly(input.exitDate) : null;
      const status = input.status ?? "ACTIVE";

      if ((status === "RESIGNED" || status === "DECEASED") && !exitDate) {
        throw new ActionError("members.errors.exitDateRequired", { exitDate: ["members.validation.exitDateRequired"] });
      }

      const dateProblems = checkMemberDates({ birthDate, joinDate, exitDate, today: berlinToday() });
      if (hasProblems(dateProblems)) throw new ActionError("members.errors.datesInvalid", dateProblems);

      const createdByLabel = buildUserLabel(user.name, user.email);
      const createdAt = new Date();
      const year = berlinYear(createdAt);

      const created = await runWithMembershipNumberRetry(() =>
        db.$transaction(async (tx) => {
          const { sequence, membershipNumber } = await allocateMembershipNumber(tx, year);
          return tx.member.create({
            data: {
              year,
              sequence,
              membershipNumber,
              type: input.type,
              status,
              firstName: input.firstName,
              lastName: input.lastName,
              kimlikNo: input.kimlikNo,
              email: input.email,
              phone: input.phone,
              street: input.street,
              houseNumber: input.houseNumber,
              postalCode: input.postalCode,
              city: input.city,
              state: input.state,
              country: input.country,
              birthDate,
              profession: input.profession,
              joinDate,
              exitDate,
              exitReason: input.exitReason,
              notes: input.notes,
              bulkMailOptOut: input.bulkMailOptOut,
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
        entity: "Member",
        entityId: created.id,
        after: {
          membershipNumber: created.membershipNumber,
          type: created.type,
          status: created.status,
          firstName: created.firstName,
          lastName: created.lastName,
          // kimlikNo ASLA audit'e yazılmaz (hassas alan kuralı).
        },
      });

      return { id: created.id, membershipNumber: created.membershipNumber };
    },
  });

  return run(input) as Promise<ActionResult<{ id: string; membershipNumber: string }>>;
}
