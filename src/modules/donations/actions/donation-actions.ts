"use server";

import { getDb } from "@/shared/db";
import { toCents } from "@/shared/money";
import { buildUserLabel } from "@/shared/utils";
import type { ActionResult } from "@/shared/types/action";

import { ActionError, createAction } from "@/modules/auth/server";

import { donationsPermissions } from "../permissions";
import { donationCancelSchema, donationCreateSchema, donationUpdateSchema } from "../schemas/donation";
import {
  allocateDonationsNumber,
  formatDonationNumber,
  formatDonorNumber,
  runWithDonationsNumberRetry,
} from "../services/confirmation-numbers";
import { createDonationBookings, reverseDonationBookings } from "../services/donation-bookings";
import { berlinTodayStart, parseDateOnly } from "../utils";

/**
 * Bağış aksiyonları (§ 11 md. 3-7). Fişler bağış transaction'ında açılır;
 * muhasebe hatası bağışı DURDURUR. Düzenleme: tarih/tutar/yöntem/vazgeçim
 * değişirse eski fişler ters kayıt + yeni fişler (yerinde düzenleme YOK).
 */

export async function createDonationAction(
  input: unknown,
): Promise<ActionResult<{ id: string; donationNumber: string }>> {
  const run = createAction({
    permission: { definition: donationsPermissions, action: "create" },
    schema: donationCreateSchema,
    handler: async ({ input, user, audit }) => {
      const db = getDb();

      const donor = await db.donor.findUnique({ where: { id: input.donorId } });
      if (!donor || !donor.isActive) {
        throw new ActionError("donations.errors.donorInactive", {
          donorId: ["Aktif bir bağışçı seçin."],
        });
      }

      const cents = toCents(input.amount);
      if (cents === null || cents <= 0) {
        throw new ActionError("donations.errors.amountInvalid", {
          amount: ["0'dan büyük bir tutar girin (en fazla 2 ondalık)."],
        });
      }
      if (cents > 999_999_999) {
        throw new ActionError("donations.errors.amountTooLarge", {
          amount: ["Tutar en fazla 9.999.999,99 € olabilir."],
        });
      }

      const receivedAt = parseDateOnly(input.receivedAt);
      if (!receivedAt) {
        throw new ActionError("donations.errors.dateInvalid", {
          receivedAt: ["donations.validation.dateInvalid"],
        });
      }
      const today = berlinTodayStart();
      if (receivedAt.getTime() > today.getTime()) {
        throw new ActionError("donations.errors.dateFuture", {
          receivedAt: ["Gelecek tarih girilemez."],
        });
      }
      const prevYearStart = new Date(Date.UTC(today.getUTCFullYear() - 1, 0, 1));
      if (receivedAt.getTime() < prevYearStart.getTime()) {
        throw new ActionError("donations.errors.dateTooOld", {
          receivedAt: ["En fazla geçen yılın 1 Ocak'ına kadar."],
        });
      }

      const createdByLabel = buildUserLabel(user.name, user.email);
      const year = receivedAt.getUTCFullYear();
      const actor = { id: user.id, label: createdByLabel };

      const created = await runWithDonationsNumberRetry(async () => {
        // Fiş açılışı P2002 retry ile BÜTÜN transaction'ı tekrar dener (KARAR:
        // sayaç artışı da rollback olur; numara dizisi boşluklu kalabilir — kabul).
        return db.$transaction(async (tx) => {
          const { sequence } = await allocateDonationsNumber(tx, "DONATION", year);
          const donationNumber = formatDonationNumber(year, sequence);

          const donation = await tx.donation.create({
            data: {
              donationNumber,
              year,
              sequence,
              donorId: donor.id,
              receivedAt,
              amount: (cents / 100).toFixed(2),
              method: input.method,
              reference: input.reference,
              purposeNote: input.purposeNote,
              waivedReimbursement: input.waivedReimbursement,
              claimBasis: input.waivedReimbursement ? input.claimBasis : null,
              waiverDeclaredAt: input.waivedReimbursement && input.waiverDeclaredAt
                ? parseDateOnly(input.waiverDeclaredAt)
                : null,
              expenseCategoryId: input.waivedReimbursement ? input.expenseCategoryId : null,
              createdById: user.id,
              createdByLabel,
              updatedById: user.id,
              updatedByLabel: createdByLabel,
            },
          });

          // Muhasebe fişleri (§ 11 md. 5) — hata bağışı durdurur.
          const bookings = await createDonationBookings(tx, {
            actor,
            donationId: donation.id,
            donationNumber,
            donorNumber: donor.donorNumber,
            receivedAt,
            amountCents: cents,
            method: input.method,
            waivedReimbursement: input.waivedReimbursement,
            expenseCategoryId: input.waivedReimbursement ? input.expenseCategoryId : null,
          });

          await tx.donation.update({
            where: { id: donation.id },
            data: {
              bookingNumber: bookings.bookingNumber,
              waiverBookingNumber: bookings.waiverBookingNumber,
            },
          });

          return donation;
        }, { timeout: 30_000 });
      });

      await audit({
        action: "CREATE",
        entity: "Donation",
        entityId: created.id,
        after: {
          donationNumber: created.donationNumber,
          donorNumber: formatDonorNumber(donor.donorNumber),
          amountCents: cents,
          method: created.method,
          receivedAt: created.receivedAt.toISOString().slice(0, 10),
          waivedReimbursement: created.waivedReimbursement,
          // Gizlilik (§ 11 md. 13): bağışçı adı YOK.
        },
      });

      return { id: created.id, donationNumber: created.donationNumber };
    },
  });

  return run(input) as Promise<ActionResult<{ id: string; donationNumber: string }>>;
}

export async function updateDonationAction(input: unknown): Promise<ActionResult> {
  const run = createAction({
    permission: { definition: donationsPermissions, action: "update" },
    schema: donationUpdateSchema,
    handler: async ({ input, user, audit }) => {
      const db = getDb();
      const existing = await db.donation.findUnique({ where: { id: input.id } });
      if (!existing) throw new ActionError("donations.errors.donationNotFound");

      if (existing.reversedAt) {
        throw new ActionError("donations.errors.cancelledNoEdit");
      }
      // Aktif bildirim ögesi engeli (§ 11 md. 6).
      const activeItem = await db.zuwendungConfirmationItem.findFirst({
        where: { itemType: "DONATION", sourceId: existing.id, activeKey: { not: null } },
        select: { id: true },
      });
      if (activeItem) {
        throw new ActionError(
          "donations.errors.activeConfirmationEdit",
        );
      }
      if (existing.updatedAt.toISOString() !== input.updatedAt) {
        throw new ActionError("common.errors.staleRecord");
      }

      const cents = toCents(input.amount);
      if (cents === null || cents <= 0) {
        throw new ActionError("donations.errors.amountInvalid", {
          amount: ["0'dan büyük bir tutar girin."],
        });
      }
      const receivedAt = parseDateOnly(input.receivedAt);
      if (!receivedAt) {
        throw new ActionError("donations.errors.dateInvalid", {
          receivedAt: ["donations.validation.dateInvalid"],
        });
      }
      const year = receivedAt.getUTCFullYear();
      if (year !== existing.year) {
        throw new ActionError("donations.errors.yearChange", {
          receivedAt: ["Bağış yılı değiştirilemez."],
        });
      }

      const createdByLabel = buildUserLabel(user.name, user.email);
      const actor = { id: user.id, label: createdByLabel };
      const donor = await db.donor.findUnique({ where: { id: existing.donorId } });
      if (!donor) throw new ActionError("donations.errors.donorNotFound");

      // Fiş etkilenecek alanlar değişti mi (§ 11 md. 6)?
      const bookingsAffected =
        receivedAt.getTime() !== existing.receivedAt.getTime() ||
        cents !== Number(existing.amount.mul(100).toFixed(0)) ||
        input.method !== existing.method ||
        input.waivedReimbursement !== existing.waivedReimbursement ||
        (input.waivedReimbursement && input.expenseCategoryId !== existing.expenseCategoryId);

      await db.$transaction(
        async (tx) => {
          await tx.donation.update({
            where: { id: existing.id },
            data: {
              receivedAt,
              amount: (cents / 100).toFixed(2),
              method: input.method,
              reference: input.reference,
              purposeNote: input.purposeNote,
              waivedReimbursement: input.waivedReimbursement,
              claimBasis: input.waivedReimbursement ? input.claimBasis : null,
              waiverDeclaredAt: input.waivedReimbursement && input.waiverDeclaredAt
                ? parseDateOnly(input.waiverDeclaredAt)
                : null,
              expenseCategoryId: input.waivedReimbursement ? input.expenseCategoryId : null,
              updatedById: user.id,
              updatedByLabel: createdByLabel,
            },
          });

          if (bookingsAffected) {
            // Eski fişler ters kayıt + yeni fişler (yerinde düzenleme YOK; § 11 md. 6).
            await reverseDonationBookings(tx, {
              actor,
              donationId: existing.id,
              reason: "Bağış düzeltildi",
            });
            const bookings = await createDonationBookings(tx, {
              actor,
              donationId: existing.id,
              donationNumber: existing.donationNumber,
              donorNumber: donor.donorNumber,
              receivedAt,
              amountCents: cents,
              method: input.method,
              waivedReimbursement: input.waivedReimbursement,
              expenseCategoryId: input.waivedReimbursement ? input.expenseCategoryId : null,
            });
            await tx.donation.update({
              where: { id: existing.id },
              data: {
                bookingNumber: bookings.bookingNumber,
                waiverBookingNumber: bookings.waiverBookingNumber,
              },
            });
          }
        },
        { timeout: 30_000 },
      );

      await audit({
        action: "UPDATE",
        entity: "Donation",
        entityId: existing.id,
        before: {
          donationNumber: existing.donationNumber,
          amountCents: Number(existing.amount.mul(100).toFixed(0)),
        },
        after: { donationNumber: existing.donationNumber, amountCents: cents, bookingsAffected },
      });

      return undefined;
    },
  });

  return run(input) as Promise<ActionResult>;
}

export async function cancelDonationAction(input: unknown): Promise<ActionResult> {
  const run = createAction({
    permission: { definition: donationsPermissions, action: "delete" },
    schema: donationCancelSchema,
    handler: async ({ input, user, audit }) => {
      const db = getDb();
      const existing = await db.donation.findUnique({ where: { id: input.id } });
      if (!existing) throw new ActionError("donations.errors.donationNotFound");
      if (existing.reversedAt) throw new ActionError("donations.errors.alreadyCancelled");

      // Aktif bildirim engeli (§ 11 md. 7): önce bildirimi iptal et.
      const activeItem = await db.zuwendungConfirmationItem.findFirst({
        where: { itemType: "DONATION", sourceId: existing.id, activeKey: { not: null } },
        select: { id: true },
      });
      if (activeItem) {
        throw new ActionError(
          "donations.errors.activeConfirmation",
        );
      }

      const label = buildUserLabel(user.name, user.email);
      await db.$transaction(
        async (tx) => {
          const now = new Date();
          await tx.donation.update({
            where: { id: existing.id },
            data: {
              reversedAt: now,
              reversedById: user.id,
              reversedByLabel: label,
              reverseReason: input.reason,
            },
          });
          await reverseDonationBookings(tx, {
            actor: { id: user.id, label },
            donationId: existing.id,
            reason: input.reason,
          });
        },
        { timeout: 30_000 },
      );

      await audit({
        action: "CANCEL",
        entity: "Donation",
        entityId: existing.id,
        before: { donationNumber: existing.donationNumber, reversedAt: null },
        after: { donationNumber: existing.donationNumber, reason: input.reason },
      });

      return undefined;
    },
  });

  return run(input) as Promise<ActionResult>;
}
