import type { StudentGuardianRelation, StudentStatus } from "@prisma/client";

export type { StudentGuardianRelation, StudentStatus };

export type StudentRow = {
  id: string;
  studentNumber: string;
  firstName: string;
  lastName: string;
  birthDate: Date | null;
  school: string | null;
  gradeLevel: string | null;
  status: StudentStatus;
  payerLabel: string | null;
  payerDebtorNumber: number | null;
  updatedAt: Date;
};

export type StudentDetail = {
  id: string;
  studentNumber: string;
  firstName: string;
  lastName: string;
  birthDate: Date | null;
  school: string | null;
  gradeLevel: string | null;
  email: string | null;
  phone: string | null;
  status: StudentStatus;
  photoConsent: boolean;
  dataConsentAt: Date | null;
  memberId: string | null;
  note: string | null;
  createdByLabel: string;
  createdAt: Date;
  updatedAt: Date;
  guardians: {
    guardianId: string;
    relation: StudentGuardianRelation;
    isPayer: boolean;
    name: string;
    debtorNumber: number;
    email: string | null;
    phone: string | null;
  }[];
};

export type GuardianRow = {
  id: string;
  debtorNumber: number;
  salutation: string | null;
  firstName: string;
  lastName: string;
  street: string | null;
  houseNumber: string | null;
  postalCode: string | null;
  city: string | null;
  country: string;
  email: string | null;
  phone: string | null;
  iban: string | null;
  bic: string | null;
  accountHolder: string | null;
  sepaMandateReference: string | null;
  sepaMandateDate: Date | null;
  note: string | null;
  studentCount: number;
  updatedAt: Date;
};

/** Başka modüller için (kurslar): öğrenci seçeneği. */
export type StudentOption = { id: string; label: string; studentNumber: string };

/** Başka modüller için: öğrencinin ödeme sorumlusu (DATEV Debitor). */
export type StudentPayer = { guardianId: string; label: string; debtorNumber: number } | null;
