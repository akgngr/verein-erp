import "server-only";

import { getDb } from "@/shared/db";

/** Uzaktan form: öğrenci alanları (reşit değilse veli doldurur ve onaylar). */
export type StudentSelfService = {
  id: string;
  firstName: string;
  lastName: string;
  studentNumber: string;
  birthDate: string | null;
  school: string | null;
  gradeLevel: string | null;
  email: string | null;
  phone: string | null;
  photoConsent: boolean;
  /** Reşit değil (doğum tarihi yoksa: velisi varsa reşit değil sayılır). */
  minor: boolean;
  guardians: { id: string; name: string; email: string | null; phone: string | null; isPayer: boolean }[];
};
export type StudentSelfServiceInput = { birthDate: string | null; school: string | null; gradeLevel: string | null; email: string | null; phone: string | null; photoConsent: boolean };

export type GuardianSelfService = {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  street: string | null;
  houseNumber: string | null;
  postalCode: string | null;
  city: string | null;
  state: string | null;
  country: string;
  /** IBAN tam gösterilmez (bağlantı iletilmiş olabilir); yalnız son 4 hane. */
  ibanMasked: string | null;
  accountHolder: string | null;
  messagingConsents: string[];
  bulkMailOptOut: boolean;
};
export type GuardianSelfServiceInput = Omit<GuardianSelfService, "id" | "firstName" | "lastName" | "ibanMasked"> & {
  /** Boş: mevcut hesap korunur. */
  iban: string | null;
  bic: string | null;
  /** SEPA temel borçlandırma yetkisi verildi (imza günüyle). */
  sepaMandate: boolean;
};

function isMinor(birthDate: Date | null, hasGuardian: boolean, today = new Date()): boolean {
  if (!birthDate) return hasGuardian;
  const adult = new Date(birthDate);
  adult.setUTCFullYear(adult.getUTCFullYear() + 18);
  return adult > today;
}

export async function getStudentSelfService(id: string): Promise<StudentSelfService | null> {
  const row = await getDb().student.findFirst({
    where: { id, deletedAt: null },
    select: {
      id: true, firstName: true, lastName: true, studentNumber: true, birthDate: true, school: true, gradeLevel: true, email: true, phone: true, photoConsent: true,
      guardians: { select: { isPayer: true, guardian: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } } } },
    },
  });
  if (!row) return null;
  const { guardians, birthDate, ...rest } = row;
  return {
    ...rest,
    birthDate: birthDate?.toISOString().slice(0, 10) ?? null,
    minor: isMinor(birthDate, guardians.length > 0),
    guardians: guardians
      .map((link) => ({ id: link.guardian.id, name: `${link.guardian.firstName} ${link.guardian.lastName}`.trim(), email: link.guardian.email, phone: link.guardian.phone, isPayer: link.isPayer }))
      .sort((a, b) => Number(b.isPayer) - Number(a.isPayer)),
  };
}

export async function applyStudentSelfService(id: string, input: StudentSelfServiceInput, signedAt: Date): Promise<boolean> {
  const result = await getDb().student.updateMany({
    where: { id, deletedAt: null },
    data: { ...input, birthDate: input.birthDate ? new Date(`${input.birthDate}T00:00:00Z`) : null, dataConsentAt: signedAt },
  });
  return result.count === 1;
}

export async function getGuardianSelfService(id: string): Promise<GuardianSelfService | null> {
  const row = await getDb().studentGuardian.findUnique({
    where: { id },
    select: { id: true, firstName: true, lastName: true, email: true, phone: true, street: true, houseNumber: true, postalCode: true, city: true, state: true, country: true, iban: true, accountHolder: true, messagingConsents: true, bulkMailOptOut: true },
  });
  if (!row) return null;
  const { iban, ...rest } = row;
  return { ...rest, ibanMasked: iban ? `•••• ${iban.replace(/\s/g, "").slice(-4)}` : null };
}

/** Velinin imzaladığı formu uygular. Yeni IBAN + yetki verildiyse SEPA yetki tarihi imza günü olur. */
export async function applyGuardianSelfService(id: string, input: GuardianSelfServiceInput, signedAt: Date): Promise<boolean> {
  const { iban, bic, sepaMandate, ...rest } = input;
  const db = getDb();
  const current = await db.studentGuardian.findUnique({ where: { id }, select: { debtorNumber: true, iban: true } });
  if (!current) return false;
  const bank = iban ? { iban: iban.replace(/\s/g, "").toUpperCase(), bic: bic ? bic.toUpperCase() : null } : {};
  const mandate = sepaMandate && (iban || current.iban) ? { sepaMandateDate: signedAt, sepaMandateReference: `D${current.debtorNumber}-${signedAt.toISOString().slice(0, 10).replace(/-/g, "")}` } : {};
  await db.studentGuardian.update({ where: { id }, data: { ...rest, ...bank, ...mandate } });
  return true;
}

/** SEPA modülü için: Debitor numarasına göre velinin yetki bilgisi (IBAN tam; yalnız sunucuda kullanılır). */
export async function getGuardianMandates(debtorNumbers: number[]) {
  const rows = await getDb().studentGuardian.findMany({
    where: { debtorNumber: { in: debtorNumbers } },
    select: { debtorNumber: true, firstName: true, lastName: true, iban: true, bic: true, accountHolder: true, sepaMandateReference: true, sepaMandateDate: true },
  });
  return new Map(rows.map((row) => [row.debtorNumber, {
    name: `${row.firstName} ${row.lastName}`.trim(),
    iban: row.iban, bic: row.bic, accountHolder: row.accountHolder ?? `${row.firstName} ${row.lastName}`.trim(),
    mandateReference: row.sepaMandateReference, mandateDate: row.sepaMandateDate?.toISOString().slice(0, 10) ?? null,
  }]));
}
