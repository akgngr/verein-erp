import "server-only";

// members modülü sunucu giriş noktası (§ 3.4): sorgular, servisler, action'lar
// ve API handler'ları BURADAN export edilir; src/app altındaki ince rotalar
// ve diğer modüller yalnızca bu dosyadan alır.

// --- Queries ---------------------------------------------------------------
export {
  listMembers,
  listMembersForExport,
  buildMemberWhere,
  MEMBER_SORTABLE_FIELDS,
  MEMBER_DEFAULT_SORT,
  type MemberListFilterKeys,
} from "./queries/list-members";
export { getMember } from "./queries/get-member";
export { getMemberStats } from "./queries/get-member-stats";
export { listMemberPayments } from "./queries/list-payments";
export { listMemberDues } from "./queries/get-member-dues";
export { listMemberTypeConfigs } from "./queries/list-member-types";
export {
  listDues,
  listDuesForExport,
  DUES_SORTABLE_FIELDS,
  DUES_DEFAULT_SORT,
  type DuesListFilterKeys,
} from "./queries/list-dues";
export { getDuesStats } from "./queries/get-dues-stats";

// --- Actions ---------------------------------------------------------------
export { createMemberAction } from "./actions/create-member";
export { updateMemberAction } from "./actions/update-member";
export { deleteMemberAction } from "./actions/delete-member";
export { changeMemberStatusAction } from "./actions/change-status";
export { addMemberNoteAction } from "./actions/add-note";
export { createPaymentAction } from "./actions/create-payment";
export { voidPaymentAction } from "./actions/void-payment";
export {
  generateDuesAction,
  addDueAction,
  updateDueAction,
  deleteDueAction,
} from "./actions/dues-actions";
export { updateMembershipTypeConfigAction } from "./actions/member-type-actions";

// --- Handlers (API ince rotaları) ------------------------------------------
export { exportMembersHandler } from "./handlers/export-members";
export { exportMemberDataHandler } from "./handlers/data-export";
export { exportReceiptPdfHandler } from "./handlers/receipt-pdf";
export { exportDuesHandler } from "./handlers/export-dues";
export { importMembersHandler } from "./handlers/import-members";
export { importTemplateHandler } from "./handlers/import-template";

// --- Paylaşılan servisler (diğer modüllerin beklentileri) ------------------

/** Muhasebe üyelik aktarımı için ödeme satırı (§ 8 md. 15). */
export type AccountingPaymentRow = {
  id: string;
  receiptNumber: string;
  memberNumber: string;
  dueYear: number;
  amountCents: number;
  method: "CASH" | "BANK_TRANSFER" | "CARD" | "OTHER";
  /** YYYY-MM-DD (date-only, saat kayması yok) */
  paidAt: string;
  voidedAt: Date | null;
  voidReason: string | null;
};

/**
 * Muhasebe aktarımı: yumuşak silinmemiş üyelerin TÜM ödemeleri (void dahil —
 * void ödemenin fişi ters kayıt edilir). KARAR: sıralama paidAt + receiptNumber;
 * aktarım sırası deterministik olsun.
 */
export async function listPaymentsForAccounting(): Promise<AccountingPaymentRow[]> {
  const { getDb } = await import("@/shared/db");
  const db = getDb();
  const rows = await db.memberPayment.findMany({
    where: { member: { deletedAt: null } },
    orderBy: [{ paidAt: "asc" }, { receiptNumber: "asc" }],
    select: {
      id: true,
      receiptNumber: true,
      dueYear: true,
      amount: true,
      method: true,
      paidAt: true,
      voidedAt: true,
      voidReason: true,
      member: { select: { membershipNumber: true } },
    },
  });
  return rows.map((row) => ({
    id: row.id,
    receiptNumber: row.receiptNumber,
    memberNumber: row.member.membershipNumber,
    dueYear: row.dueYear,
    amountCents: Number(row.amount.mul(100).toFixed(0)),
    method: row.method,
    paidAt: row.paidAt.toISOString().slice(0, 10),
    voidedAt: row.voidedAt,
    voidReason: row.voidReason,
  }));
}

/**
 * Zuwendungsbestätigung (Faz 5): verilen ödeme id'lerinin iptal durumları.
 * Void ödemesi bildirimde uyarı üretir (§ 11 md. 11).
 */
export async function getPaymentStatuses(
  ids: string[],
): Promise<Array<{ id: string; voidedAt: Date | null }>> {
  if (ids.length === 0) return [];
  const { getDb } = await import("@/shared/db");
  const db = getDb();
  const rows = await db.memberPayment.findMany({
    where: { id: { in: ids } },
    select: { id: true, voidedAt: true },
  });
  return rows.map((row) => ({ id: row.id, voidedAt: row.voidedAt }));
}

/** Makbuz/alıcı anlık görüntüsü: üye adres bloğu (§ 11 md. 9 md. 5). */
export type MemberAddressBlock = {
  memberId: string;
  /** UYE-2026-0001 biçimli üyelik numarası */
  memberNumber: string;
  name: string;
  street: string | null;
  postalCode: string | null;
  city: string | null;
  country: string | null;
};

/** Üye adres bloğu — yumuşak silinmiş üyede null (muhasebe saklama bu şemadadır). */
export async function getMemberAddressBlock(
  memberId: string,
): Promise<MemberAddressBlock | null> {
  const { getDb } = await import("@/shared/db");
  const db = getDb();
  const member = await db.member.findUnique({
    where: { id: memberId },
    select: {
      id: true,
      membershipNumber: true,
      firstName: true,
      lastName: true,
      street: true,
      houseNumber: true,
      postalCode: true,
      city: true,
      country: true,
      deletedAt: true,
    },
  });
  if (!member || member.deletedAt) return null;
  return {
    memberId: member.id,
    memberNumber: member.membershipNumber,
    name: `${member.firstName} ${member.lastName}`.trim(),
    street: [member.street, member.houseNumber].filter(Boolean).join(" ") || null,
    postalCode: member.postalCode,
    city: member.city,
    country: member.country,
  };
}

/** Aidat bildirim satırı: üye + o yılki void edilmemiş ödemeleri (§ 11 md. 9). */
export type MemberFeePaymentsRow = {
  memberId: string;
  memberNumber: string;
  name: string;
  street: string | null;
  postalCode: string | null;
  city: string | null;
  country: string | null;
  payments: Array<{
    id: string;
    /** YYYY-MM-DD */
    paidAt: string;
    amountCents: number;
    receiptNumber: string;
  }>;
};

/**
 * Bildirimlenebilir üye aidat ödemeleri: paidAt yılı = year, void edilmemiş,
 * üye yumuşak silinmemiş. KARAR: Bildirimde aidat YILI değil ÖDEME yılı esastır
 * (Alman vergi pratiği: Zuwendung im Zuflussjahr).
 */
export async function listMemberFeePaymentsForConfirmation(args: {
  year: number;
}): Promise<MemberFeePaymentsRow[]> {
  const { getDb } = await import("@/shared/db");
  const db = getDb();
  const payments = await db.memberPayment.findMany({
    where: {
      paidAt: { gte: new Date(Date.UTC(args.year, 0, 1)), lt: new Date(Date.UTC(args.year + 1, 0, 1)) },
      voidedAt: null,
      member: { deletedAt: null },
    },
    orderBy: { paidAt: "asc" },
    select: {
      id: true,
      paidAt: true,
      amount: true,
      receiptNumber: true,
      member: {
        select: {
          id: true,
          membershipNumber: true,
          firstName: true,
          lastName: true,
          street: true,
          houseNumber: true,
          postalCode: true,
          city: true,
          country: true,
        },
      },
    },
  });

  const byMember = new Map<string, MemberFeePaymentsRow>();
  for (const payment of payments) {
    let row = byMember.get(payment.member.id);
    if (!row) {
      row = {
        memberId: payment.member.id,
        memberNumber: payment.member.membershipNumber,
        name: `${payment.member.firstName} ${payment.member.lastName}`.trim(),
        street: [payment.member.street, payment.member.houseNumber].filter(Boolean).join(" ") || null,
        postalCode: payment.member.postalCode,
        city: payment.member.city,
        country: payment.member.country,
        payments: [],
      };
      byMember.set(payment.member.id, row);
    }
    row.payments.push({
      id: payment.id,
      paidAt: payment.paidAt.toISOString().slice(0, 10),
      amountCents: Number(payment.amount.mul(100).toFixed(0)),
      receiptNumber: payment.receiptNumber,
    });
  }
  return [...byMember.values()].sort((a, b) => a.memberNumber.localeCompare(b.memberNumber));
}

export type MemberOption = { id: string; label: string; membershipNumber: string };

/**
 * Seçim listeleri için üyeler (başka modüller: toplantı katılımcısı, görev sorumlusu …).
 * Varsayılan: silinmemiş, aktif veya pasif üyeler; `ids` verilirse yalnızca onlar.
 */
export async function listMemberOptions(options: { ids?: string[] } = {}): Promise<MemberOption[]> {
  const { getDb } = await import("@/shared/db");
  const members = await getDb().member.findMany({
    where: {
      deletedAt: null,
      status: { in: ["ACTIVE", "PASSIVE"] },
      ...(options.ids ? { id: { in: options.ids } } : {}),
    },
    select: { id: true, firstName: true, lastName: true, membershipNumber: true },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });
  return members.map((member) => ({
    id: member.id,
    label: `${member.firstName} ${member.lastName}`,
    membershipNumber: member.membershipNumber,
  }));
}

/** Bu e-posta adresine sahip (silinmemiş) üyelerin kimlikleri; kullanıcıyı üye kaydıyla eşleştirmek için. */
export async function findMemberIdsByEmail(email: string): Promise<string[]> {
  const { getDb } = await import("@/shared/db");
  const members = await getDb().member.findMany({
    where: { email: { equals: email, mode: "insensitive" }, deletedAt: null },
    select: { id: true },
  });
  return members.map((member) => member.id);
}
