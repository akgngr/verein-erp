import "server-only";

import { ActionError } from "@/modules/auth/server";

import { getMessageTranslator } from "@/shared/i18n/translate-message";

import type { Prisma } from "@prisma/client";
import { renderToBuffer } from "@react-pdf/renderer";
import { randomUUID } from "node:crypto";

import { getDb } from "@/shared/db";
import { computeSha256, removeFile, saveFile } from "@/shared/files";
import { registerSharedPdfFonts } from "@/shared/pdf/fonts";

import { getMemberAddressBlock, listMemberFeePaymentsForConfirmation } from "@/modules/members/server";

import { WAIVER_METHOD } from "../constants";
import { ConfirmationDocument } from "../pdf/confirmation-document";
import type { ConfirmationPdfData } from "../pdf/confirmation-document";
import { TEMPLATE_VERSION } from "../pdf/template-de";
import { assertCanIssue } from "./issue-guards";
import {
  allocateDonationsNumber,
  formatConfirmationNumber,
  runWithDonationsNumberRetry,
} from "./confirmation-numbers";
import {
  buildConfirmationSnapshot,
  donorRecipient,
  memberRecipient,
  type RecipientSnapshot,
} from "./confirmation-builder";
import { confirmationIssuerSnapshotToPdf } from "./issuer-snapshot";

/**
 * Bildirim üretimi (§ 11 md. 9): TEK transaction (30 s); herhangi bir adımda
 * hata → rollback + yazılmış dosya silinir. Ürün: ZB numarası + değişmez
 * snapshot + aktif ögeler + depolanmış PDF (SHA-256 kayıtlı).
 */

export class IssueError extends Error {}

export type IssueResult = { id: string; confirmationNumber: string };

export type ItemRow = {
  position: number;
  itemType: "DONATION" | "MEMBER_PAYMENT";
  sourceId: string;
  itemDate: Date;
  amountCents: number;
  label: string;
  waived: boolean;
};

async function renderAndStore(
  data: ConfirmationPdfData,
  year: number,
  confirmationId: string,
): Promise<{ storagePath: string; sha256: string; size: number }> {
  registerSharedPdfFonts();
  const buffer = await renderToBuffer(<ConfirmationDocument data={data} />);
  const storedName = `${randomUUID()}.pdf`;
  const storagePath = ["donations", String(year), confirmationId, storedName].join("/");
  await saveFile(storagePath, buffer);
  return { storagePath, sha256: await computeSha256(buffer), size: buffer.byteLength };
}

async function issueOne(args: {
  actor: { id: string; label: string };
  content: "DONATION" | "MEMBERSHIP_FEE";
  kind: "SINGLE" | "COLLECTIVE";
  recipient: RecipientSnapshot;
  /** Bağışçı/üye ipucu. */
  donorId: string | null;
  memberId: string | null;
  items: ItemRow[];
  periodFrom: Date;
  periodTo: Date;
  waived: boolean;
  /** Yerine üretim zinciri (§ 11 md. 10). */
  replacesId?: string | null;
}): Promise<IssueResult> {
  const issueDate = new Date();
  await assertCanIssue(issueDate, args.content);

  const db = getDb();
  const year = issueDate.getUTCFullYear();

  let writtenPath: string | null = null;
  try {
    return await runWithDonationsNumberRetry(() =>
      db.$transaction(
        async (tx) => {
          // 1) Numara + satır oluşturma.
          const { sequence } = await allocateDonationsNumber(tx, "CONFIRMATION", year);
          const confirmationNumber = formatConfirmationNumber(year, sequence);

          // 2) Değişmez snapshot (toplam doğrulaması dahil).
          const snapshot = await buildConfirmationSnapshot(tx, {
            recipient: args.recipient,
            items: args.items.map((item) => ({
              sourceId: item.sourceId,
              itemDate: item.itemDate,
              amountCents: item.amountCents,
              waived: item.waived,
            })),
            itemType: args.content === "DONATION" ? "DONATION" : "MEMBER_PAYMENT",
            waived: args.waived,
          });
          if (snapshot.totalCents !== args.items.reduce((sum, item) => sum + item.amountCents, 0)) {
            throw new IssueError("Öge toplamı bildirim tutarına eşit değil.");
          }

          // 3) PDF verisi + render + depolama (transaction içinde; rollback güvenli).
          const issuer = await getDb().donationsSettings.findUnique({ where: { id: "singleton" } });
          void issuer;
          const pdfData = await confirmationIssuerSnapshotToPdf({
            recipient: args.recipient,
            issuer: snapshot.issuer,
            lang: "de",
            kind: args.kind,
            content: args.content,
            totalCents: snapshot.totalCents,
            amountInWords: snapshot.amountInWords,
            periodFrom: args.periodFrom,
            periodTo: args.periodTo,
            waived: args.waived,
            items: args.items,
          });

          // Satır id'sini önce üret (depolama yolu için).
          const confirmationRow = await tx.zuwendungConfirmation.create({
            data: {
              confirmationNumber,
              year,
              sequence,
              kind: args.kind,
              content: args.content,
              donorId: args.donorId,
              memberId: args.memberId,
              recipientName: args.recipient.name,
              recipientStreet: args.recipient.street,
              recipientPostalCode: args.recipient.postalCode,
              recipientCity: args.recipient.city,
              recipientCountry: args.recipient.country,
              periodFrom: args.periodFrom,
              periodTo: args.periodTo,
              totalAmount: (snapshot.totalCents / 100).toFixed(2),
              amountInWords: snapshot.amountInWords,
              waivedReimbursement: args.waived,
              issuerSnapshot: snapshot.issuer as Prisma.InputJsonValue,
              templateVersion: TEMPLATE_VERSION,
              issuedAt: issueDate,
              issuedPlace: (snapshot.issuer as { city?: string | null }).city ?? "",
              issuedById: args.actor.id,
              issuedByLabel: args.actor.label,
              replacesId: args.replacesId ?? null,
              items: {
                create: args.items.map((item) => ({
                  position: item.position,
                  itemType: item.itemType,
                  sourceId: item.sourceId,
                  itemDate: item.itemDate,
                  amount: (item.amountCents / 100).toFixed(2),
                  label: item.label,
                  waived: item.waived,
                  activeKey: `${item.itemType}:${item.sourceId}`,
                })),
              },
            },
          });

          const stored = await renderAndStore(pdfData, year, confirmationRow.id);
          writtenPath = stored.storagePath;

          await tx.zuwendungConfirmation.update({
            where: { id: confirmationRow.id },
            data: {
              pdfStoragePath: stored.storagePath,
              pdfSha256: stored.sha256,
              pdfSize: stored.size,
            },
          });

          return { id: confirmationRow.id, confirmationNumber };
        },
        { timeout: 30_000 },
      ),
    );
  } catch (error) {
    if (writtenPath) await removeFile(writtenPath);
    throw error;
  }
}

/** Tek bağış bildirimi (§ 11 md. 9 md. 1). */
export async function issueSingleDonationConfirmation(
  actor: { id: string; label: string },
  donationId: string,
  replacesId?: string,
): Promise<IssueResult> {
  const db = getDb();
  const donation = await db.donation.findUnique({
    where: { id: donationId },
    include: { donor: true },
  });
  if (!donation) throw new IssueError("donations.errors.donationNotFound");
  if (donation.reversedAt) throw new IssueError("İptal edilmiş bağışa bildirim düzenlenemez.");

  const recipient = donorRecipient(donation.donor);
  return issueOne({
    actor,
    content: "DONATION",
    kind: "SINGLE",
    recipient,
    donorId: donation.donorId,
    memberId: null,
    items: [
      {
        position: 1,
        itemType: "DONATION" as const,
        sourceId: donation.id,
        itemDate: donation.receivedAt,
        amountCents: Number(donation.amount.mul(100).toFixed(0)),
        label: "Geldspende", // i18n-ignore (amtlicher Belegtext, immer Deutsch)
        waived: donation.waivedReimbursement,
      },
    ],
    periodFrom: donation.receivedAt,
    periodTo: donation.receivedAt,
    waived: donation.waivedReimbursement,
    replacesId,
  });
}

/** Bağışçıya toplu (Sammelbestätigung; § 11 md. 9 md. 2). */
export async function issueCollectiveDonationConfirmation(
  actor: { id: string; label: string },
  args: {
    donorId: string;
    periodFrom: Date;
    periodTo: Date;
    donationIds: string[];
    replacesId?: string;
  },
): Promise<IssueResult> {
  const db = getDb();
  if (args.donationIds.length === 0) throw new IssueError("donations.validation.selectDonation");

  const donor = await db.donor.findUnique({ where: { id: args.donorId } });
  if (!donor) throw new IssueError("donations.errors.donorNotFound");

  const donations = await db.donation.findMany({
    where: { id: { in: args.donationIds }, donorId: args.donorId },
  });
  if (donations.length !== args.donationIds.length) {
    throw new IssueError("Seçilen bağışlardan bazıları bulunamadı.");
  }

  // Grup kuralı (§ 1): tek bildirim = tek alıcı + tek içerik + tek takvim yılı +
  // tek vazgeçim değeri; dönem bir takvim yılı içinde.
  const year = args.periodFrom.getUTCFullYear();
  if (args.periodTo.getUTCFullYear() !== year) {
    throw new IssueError("Sammelbestätigung dönemi tek takvim yılı içinde olmalıdır.");
  }
  const waivedValues = new Set(donations.map((donation) => donation.waivedReimbursement));
  if (waivedValues.size > 1) {
    throw new IssueError(
      "Seçilen bağışlarda Aufwandsspende değeri karışık; ayrı ayrı bildirim üretin.",
    );
  }
  const waived = waivedValues.has(true);
  for (const donation of donations) {
    if (donation.reversedAt) throw new IssueError(`${donation.donationNumber} iptal edilmiş.`);
    if (donation.receivedAt.getUTCFullYear() !== year) {
      throw new IssueError(`${donation.donationNumber} dönem yılı dışında.`);
    }
    if (donation.waivedReimbursement) {
      // KARAR: vazgeçimli bağışlarda yöntem zaten REIMBURSEMENT_WAIVER.
      void WAIVER_METHOD;
    }
  }

  const recipient = donorRecipient(donor);
  donations.sort((a, b) => a.receivedAt.getTime() - b.receivedAt.getTime());
  return issueOne({
    actor,
    content: "DONATION",
    kind: "COLLECTIVE",
    recipient,
    donorId: donor.id,
    memberId: null,
    items: donations.map((donation, index) => ({
      position: index + 1,
      itemType: "DONATION" as const,
      sourceId: donation.id,
      itemDate: donation.receivedAt,
      amountCents: Number(donation.amount.mul(100).toFixed(0)),
      label: "Geldspende", // i18n-ignore (amtlicher Belegtext, immer Deutsch)
      waived: donation.waivedReimbursement,
    })),
    periodFrom: args.periodFrom,
    periodTo: args.periodTo,
    waived,
    replacesId: args.replacesId,
  });
}

/** Aidat bildirimi (§ 11 md. 9 md. 3): tek üye, takvim yılı. */
export async function issueMembershipFeeConfirmation(
  actor: { id: string; label: string },
  args: { memberId: string; year: number; replacesId?: string },
): Promise<IssueResult> {
  const db = getDb();
  const profile = await getIssuerMembershipFeesDeductible();
  if (!profile) {
    throw new IssueError(
      "Aidat bildirimleri kapalı (membershipFeesDeductible = false; § 10b Abs. 1 Satz 8 EStG).",
    );
  }

  const memberRows = (await listMemberFeePaymentsForConfirmation({ year: args.year })).filter(
    (row) => row.memberId === args.memberId,
  );
  const member = memberRows[0];
  if (!member || member.payments.length === 0) {
    throw new IssueError("Bu üye ve yıl için bildirilebilir ödeme yok.");
  }

  // Aktif ögesi olmayan ödemeler (activeKey benzersizliği DB'de de korur).
  const activeItems = await db.zuwendungConfirmationItem.findMany({
    where: { activeKey: { not: null }, itemType: "MEMBER_PAYMENT" },
    select: { sourceId: true },
  });
  const activeSourceIds = new Set(activeItems.map((item) => item.sourceId));
  const eligible = member.payments.filter((payment) => !activeSourceIds.has(payment.id));
  if (eligible.length === 0) {
    throw new IssueError("Tüm ödemeler zaten aktif bir bildirimde.");
  }

  const recipient = memberRecipient(await getMemberAddressBlock(args.memberId) ?? {
    memberId: args.memberId,
    memberNumber: member.memberNumber,
    name: member.name,
    street: member.street,
    postalCode: member.postalCode,
    city: member.city,
    country: member.country,
  });

  return issueOne({
    actor,
    content: "MEMBERSHIP_FEE",
    kind: eligible.length > 1 ? "COLLECTIVE" : "SINGLE",
    recipient,
    donorId: null,
    memberId: args.memberId,
    items: eligible.map((payment, index) => ({
      position: index + 1,
      itemType: "MEMBER_PAYMENT" as const,
      sourceId: payment.id,
      itemDate: new Date(`${payment.paidAt}T00:00:00Z`),
      amountCents: payment.amountCents,
      label: "Mitgliedsbeitrag", // i18n-ignore (amtlicher Belegtext, immer Deutsch)
      waived: false,
    })),
    periodFrom: new Date(Date.UTC(args.year, 0, 1)),
    periodTo: new Date(Date.UTC(args.year, 11, 31)),
    waived: false,
    replacesId: args.replacesId,
  });
}

async function getIssuerMembershipFeesDeductible(): Promise<boolean> {
  const { getOrganizationProfile } = await import("@/modules/organization/server");
  return (await getOrganizationProfile()).membershipFeesDeductible;
}

/** Yıllık toplu üretim (§ 11 md. 9 md. 4): alıcı başına bir bildirim; hata akışı durdurmaz. */
export async function issueBatchConfirmations(
  actor: { id: string; label: string },
  args: { year: number; content: "DONATION" | "MEMBERSHIP_FEE"; recipientIds: string[] },
): Promise<Array<{ recipientId: string; ok: boolean; confirmationNumber?: string; error?: string }>> {
  const translate = await getMessageTranslator();
  const results: Array<{ recipientId: string; ok: boolean; confirmationNumber?: string; error?: string }> = [];
  for (const recipientId of args.recipientIds) {
    try {
      const result =
        args.content === "DONATION"
          ? await issueCollectiveDonationForYear(actor, recipientId, args.year)
          : await issueMembershipFeeConfirmation(actor, { memberId: recipientId, year: args.year });
      results.push({ recipientId, ok: true, confirmationNumber: result.confirmationNumber });
    } catch (error) {
      results.push({
        recipientId,
        ok: false,
        error: translate(
          error instanceof Error ? error.message : "common.errors.unexpected",
          error instanceof ActionError ? error.values : undefined,
        ),
      });
    }
  }
  return results;
}

/** Bir bağışçının o yılki bildirilebilir bağışlarından toplu bildirim. */
async function issueCollectiveDonationForYear(
  actor: { id: string; label: string },
  donorId: string,
  year: number,
): Promise<IssueResult> {
  const db = getDb();
  const activeItems = await db.zuwendungConfirmationItem.findMany({
    where: { activeKey: { not: null }, itemType: "DONATION" },
    select: { sourceId: true },
  });
  const activeSourceIds = new Set(activeItems.map((item) => item.sourceId));

  const donations = await db.donation.findMany({
    where: {
      donorId,
      reversedAt: null,
      receivedAt: {
        gte: new Date(Date.UTC(year, 0, 1)),
        lt: new Date(Date.UTC(year + 1, 0, 1)),
      },
    },
    orderBy: { receivedAt: "asc" },
  });
  const eligible = donations.filter((donation) => !activeSourceIds.has(donation.id));
  if (eligible.length === 0) {
    throw new IssueError("Bu bağışçının o yıl için bildirilebilir bağışı yok.");
  }
  const waivedValues = new Set(eligible.map((donation) => donation.waivedReimbursement));
  if (waivedValues.size > 1) {
    throw new IssueError(
      "Bu bağışçının yılındaki bağışlar karışık (Aufwandsspende evet/hayır); toplu üretim atlandı.",
    );
  }
  return issueCollectiveDonationConfirmation(actor, {
    donorId,
    periodFrom: new Date(Date.UTC(year, 0, 1)),
    periodTo: new Date(Date.UTC(year, 11, 31)),
    donationIds: eligible.map((donation) => donation.id),
  });
}
