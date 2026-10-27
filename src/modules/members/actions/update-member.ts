"use server";

import { z } from "zod";

import { getDb } from "@/shared/db";
import { buildUserLabel } from "@/shared/utils";
import type { ActionResult } from "@/shared/types/action";

import { ActionError, createAction } from "@/modules/auth/server";

import { membersPermissions } from "../permissions";
import { memberUpdateSchema } from "../schemas/member";
import { parseDateOnly } from "../utils";

const UPDATE_SCHEMA = memberUpdateSchema.extend({ id: z.string().min(1) });

/** Audit `changes` içine yansıtılacak alanlar (yalnızca değişenler). */
const TRACKED_FIELDS = [
  "type",
  "status",
  "firstName",
  "lastName",
  "email",
  "phone",
  "street",
  "houseNumber",
  "postalCode",
  "city",
  "state",
  "birthDate",
  "profession",
  "joinDate",
  "exitDate",
  "exitReason",
  "notes",
  // kimlikNo bilerek YOK — audit'e yazmıyoruz (hassas alan).
] as const;

type TrackedKey = (typeof TRACKED_FIELDS)[number];

function isoDate(value: Date | null): string | null {
  return value ? value.toISOString().slice(0, 10) : null;
}

/**
 * Üye güncelleme: üyelik numarası değiştirilemez (şemada yok).
 * Eşzamanlılık koruması: formun taşıdığı updatedAt eşleşmezse anlamlı hata döner.
 */
export async function updateMemberAction(
  input: unknown,
): Promise<ActionResult<{ id: string; membershipNumber: string }>> {
  const run = createAction({
    permission: { definition: membersPermissions, action: "update" },
    schema: UPDATE_SCHEMA,
    handler: async ({ input, user, audit }) => {
      const db = getDb();
      const member = await db.member.findFirst({ where: { id: input.id, deletedAt: null } });
      if (!member) throw new ActionError("Üye bulunamadı.");

      if (new Date(input.updatedAt).getTime() !== member.updatedAt.getTime()) {
        throw new ActionError(
          "Bu kayıt başka biri tarafından değiştirildi. Sayfayı yenileyip tekrar deneyin.",
        );
      }

      const joinDate = parseDateOnly(input.joinDate);
      if (!joinDate) {
        throw new ActionError("Katılım tarihi geçersiz.", {
          joinDate: ["Geçerli bir katılım tarihi girin."],
        });
      }
      const birthDate = input.birthDate ? parseDateOnly(input.birthDate) : null;
      const exitDate = input.exitDate ? parseDateOnly(input.exitDate) : null;

      if ((input.status === "RESIGNED" || input.status === "DECEASED") && !exitDate) {
        throw new ActionError(
          `${input.status === "RESIGNED" ? "Ayrılan" : "Vefat eden"} üye için ayrılış tarihi girin.`,
          { exitDate: ["Ayrılış tarihi zorunlu."] },
        );
      }

      const updatedByLabel = buildUserLabel(user.name, user.email);

      const updated = await db.member.update({
        where: { id: member.id },
        data: {
          type: input.type,
          status: input.status,
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
          updatedById: user.id,
          updatedByLabel,
        },
      });

      // Audit: before/after yalnızca değişen alanları içerir + membershipNumber.
      const previous: Record<string, unknown> = { membershipNumber: member.membershipNumber };
      const next: Record<string, unknown> = { membershipNumber: member.membershipNumber };
      const current: Record<TrackedKey, unknown> = {
        type: member.type,
        status: member.status,
        firstName: member.firstName,
        lastName: member.lastName,
        email: member.email,
        phone: member.phone,
        street: member.street,
        houseNumber: member.houseNumber,
        postalCode: member.postalCode,
        city: member.city,
        state: member.state,
        birthDate: isoDate(member.birthDate),
        profession: member.profession,
        joinDate: isoDate(member.joinDate),
        exitDate: isoDate(member.exitDate),
        exitReason: member.exitReason,
        notes: member.notes,
      };
      const incoming: Record<TrackedKey, unknown> = {
        type: updated.type,
        status: updated.status,
        firstName: updated.firstName,
        lastName: updated.lastName,
        email: updated.email,
        phone: updated.phone,
        street: updated.street,
        houseNumber: updated.houseNumber,
        postalCode: updated.postalCode,
        city: updated.city,
        state: updated.state,
        birthDate: isoDate(updated.birthDate),
        profession: updated.profession,
        joinDate: isoDate(updated.joinDate),
        exitDate: isoDate(updated.exitDate),
        exitReason: updated.exitReason,
        notes: updated.notes,
      };
      for (const field of TRACKED_FIELDS) {
        if (current[field] !== incoming[field]) {
          previous[field] = current[field];
          next[field] = incoming[field];
        }
      }

      await audit({
        action: "UPDATE",
        entity: "Member",
        entityId: updated.id,
        before: previous,
        after: next,
      });

      return { id: updated.id, membershipNumber: updated.membershipNumber };
    },
  });

  return run(input) as Promise<ActionResult<{ id: string; membershipNumber: string }>>;
}
