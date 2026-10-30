import type { StudentGuardianRelation, StudentStatus } from "@prisma/client";

export const STUDENT_STATUS_VALUES: StudentStatus[] = ["ACTIVE", "INACTIVE"];
export const GUARDIAN_RELATION_VALUES: StudentGuardianRelation[] = ["MOTHER", "FATHER", "GUARDIAN", "SELF", "OTHER"];

/** DATEV Debitorennummer aralığı (Sachkontenlänge 4 → Personenkonten 10000–69999). */
export const DEBTOR_NUMBER_MIN = 10000;
export const DEBTOR_NUMBER_MAX = 69999;

/** Öğrenci numarası öneki: OGR-<yıl>-0001. */
export const STUDENT_NUMBER_PREFIX = "OGR";

/** DATEV "Debitoren/Kreditoren" Stammdaten sütunları (format sırası; ilk 33 sütun). */
export const DATEV_DEBTOR_COLUMNS = [
  "Konto",
  "Name (Adressattyp Unternehmen)",
  "Unternehmensgegenstand",
  "Name (Adressattyp natürl. Person)",
  "Vorname (Adressattyp natürl. Person)",
  "Name (Adressattyp keine Angabe)",
  "Adressattyp",
  "Kurzbezeichnung",
  "EU-Land",
  "EU-UStID",
  "Anrede",
  "Titel/Akad. Grad",
  "Adelstitel",
  "Namensvorsatz",
  "Adressart",
  "Straße",
  "Postfach",
  "Postleitzahl",
  "Ort",
  "Land",
  "Versandzusatz",
  "Adresszusatz",
  "Abweichende Anrede",
  "Abw. Zustellbezeichnung 1",
  "Abw. Zustellbezeichnung 2",
  "Kennz. Korrespondenzadresse",
  "Adresse Gültig von",
  "Adresse Gültig bis",
  "Telefon",
  "Bemerkung (Telefon)",
  "Telefon GL",
  "Bemerkung (Telefon GL)",
  "E-Mail",
] as const;

/** Veli hitabı (DATEV "Anrede"); NONE = belirtilmemiş, null olarak saklanır. */
export const GUARDIAN_SALUTATION_VALUES = ["Frau", "Herr", "NONE"] as const;
