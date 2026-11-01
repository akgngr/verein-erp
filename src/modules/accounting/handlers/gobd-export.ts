import "server-only";

import { NextResponse } from "next/server";

import { writeAudit } from "@/shared/audit/write-audit";
import { getDb } from "@/shared/db";
import { translateMessage } from "@/shared/i18n/translate-message";
import { can } from "@/shared/permissions/define";
import { buildUserLabel } from "@/shared/utils";

import { UnauthorizedError, requireUser } from "@/modules/auth/server";
import { getOrganizationProfile } from "@/modules/organization/server";

import { accountingPermissions } from "../permissions";
import { gdpduCsv, gdpduIndex, type GdpduColumn, type GdpduTable } from "../services/gdpdu";
import { getTaxSettings } from "../services/tax";
import { buildZip } from "../services/zip";

async function authorize() {
  try {
    const user = await requireUser();
    if (!can(user.role, accountingPermissions, "view")) return NextResponse.json({ ok: false, error: await translateMessage("common.errors.forbidden") }, { status: 403 });
    return user;
  } catch (error) {
    if (error instanceof UnauthorizedError) return NextResponse.json({ ok: false, error: await translateMessage("common.errors.sessionExpired") }, { status: 401 });
    throw error;
  }
}

const A = (name: string, description: string): GdpduColumn => ({ name, description, type: "AlphaNumeric" });
const N = (name: string, description: string, accuracy = 2): GdpduColumn => ({ name, description, type: "Numeric", accuracy });
const D = (name: string, description: string): GdpduColumn => ({ name, description, type: "Date" });
const eur = (value: { toString(): string } | null) => (value === null ? null : Number(value.toString()));
const day = (date: Date | null) => (date ? date.toISOString().slice(0, 10) : null);

/**
 * GET /api/accounting/gobd/export?year=YYYY — Z3 Datenträgerüberlassung (§ 147 Abs. 6 AO):
 * ZIP (index.xml + CSV) — fişler, hesaplar, giden/gelen faturalar, değişmez günlük. Denetim
 * yazılımı (IDEA vb.) GDPdU tanımıyla doğrudan içe aktarır. Sütun adları Almanca (standart).
 */
export async function gobdExportHandler(request: Request): Promise<Response> {
  const user = await authorize();
  if (user instanceof Response) return user;
  const yearRaw = new URL(request.url).searchParams.get("year") ?? "";
  if (!/^\d{4}$/.test(yearRaw)) return NextResponse.json({ ok: false, error: await translateMessage("accounting.gobd.errors.year") }, { status: 400 });
  const year = Number(yearRaw);
  const from = new Date(Date.UTC(year, 0, 1));
  const to = new Date(Date.UTC(year, 11, 31));
  const db = getDb();
  const [profile, tax, bookings, accounts, categories, invoices, payables, journal] = await Promise.all([
    getOrganizationProfile(),
    getTaxSettings(db),
    db.accountingBooking.findMany({ where: { year }, orderBy: { sequence: "asc" }, include: { account: true, counterAccount: true, category: true } }),
    db.accountingAccount.findMany({ orderBy: { name: "asc" } }),
    db.accountingCategory.findMany({ orderBy: { name: "asc" } }),
    db.accountingInvoice.findMany({ where: { kind: "INVOICE", status: { not: "DRAFT" }, issueDate: { gte: from, lte: to } }, orderBy: { number: "asc" } }),
    db.accountingPayable.findMany({ where: { status: { not: "DRAFT" }, issueDate: { gte: from, lte: to } }, orderBy: { issueDate: "asc" } }),
    db.accountingJournal.findMany({ where: { createdAt: { gte: from, lt: new Date(Date.UTC(year + 1, 0, 1)) } }, orderBy: { seq: "asc" } }),
  ]);

  const tables: GdpduTable[] = [
    {
      file: "buchungen.csv", name: "Buchungen", description: "Buchungsjournal (Einnahmen, Ausgaben, Umbuchungen)", primaryKey: "Belegnummer", // i18n-ignore
      columns: [A("Belegnummer", "Fortlaufende Buchungsnummer"), D("Belegdatum", "Buchungsdatum"), A("Art", "INCOME/EXPENSE/TRANSFER"), A("Konto", "Geldkonto"), A("Kontonummer", "SKR-Nummer Geldkonto"), A("Gegenkonto", "Kategorie bzw. Zielkonto"), A("Gegenkontonummer", "SKR-Nummer Gegenkonto"), N("Betrag", "Bruttobetrag EUR"), N("Netto", "Nettobetrag EUR"), N("Steuersatz", "USt-Satz %", 0), N("Steuer", "USt/VSt EUR"), A("Buchungstext", "Buchungstext"), A("Belegreferenz", "Externe Belegnummer"), A("Quelle", "Herkunft (Modul)"), D("Storniert", "Stornodatum"), A("Stornogrund", "Stornogrund"), D("Erfasst", "Erfassungsdatum"), A("Erfasser", "Erfasst von")], // i18n-ignore
      rows: bookings.map((row) => [row.bookingNumber, day(row.bookingDate), row.type, row.account.name, row.account.accountNumber, row.type === "TRANSFER" ? row.counterAccount?.name ?? null : row.category?.name ?? null, row.type === "TRANSFER" ? row.counterAccount?.accountNumber ?? null : row.category?.accountNumber ?? null, eur(row.amount), eur(row.netAmount), row.taxRate, eur(row.taxAmount), row.description, row.receiptReference, row.sourceType, day(row.reversedAt), row.reverseReason, day(row.createdAt), row.createdByLabel]),
    },
    {
      file: "konten.csv", name: "Konten", description: "Geldkonten und Kategorien (Kontenrahmen)", primaryKey: "ID", // i18n-ignore
      columns: [A("ID", "Interne ID"), A("Kontonummer", "SKR-Nummer"), A("Bezeichnung", "Name"), A("Typ", "Geldkonto oder Kategorie"), A("Kontenrahmen", "SKR03/SKR04")], // i18n-ignore
      rows: [...accounts.map((row) => [row.id, row.accountNumber, row.name, `Geldkonto ${row.type}`, tax.chartOfAccounts]), ...categories.map((row) => [row.id, row.accountNumber, row.name, `Kategorie ${row.direction}`, tax.chartOfAccounts])], // i18n-ignore
    },
    {
      file: "ausgangsrechnungen.csv", name: "Ausgangsrechnungen", description: "Gestellte Rechnungen", primaryKey: "Rechnungsnummer", // i18n-ignore
      columns: [A("Rechnungsnummer", "Nummer"), D("Rechnungsdatum", "Datum"), A("Empfaenger", "Empfänger"), N("Netto", "EUR"), N("Steuer", "EUR"), N("Brutto", "EUR"), N("Bezahlt", "EUR"), A("Status", "Status")], // i18n-ignore
      rows: invoices.map((row) => [row.number, day(row.issueDate), row.recipientName, row.netCents / 100, row.taxCents / 100, row.grossCents / 100, row.paidCents / 100, row.status]),
    },
    {
      file: "eingangsrechnungen.csv", name: "Eingangsrechnungen", description: "Erfasste Eingangsrechnungen", primaryKey: "ID", // i18n-ignore
      columns: [A("ID", "Interne ID"), A("Rechnungsnummer", "Nummer des Lieferanten"), D("Rechnungsdatum", "Datum"), A("Lieferant", "Name"), A("UStIdNr", "USt-IdNr."), N("Netto", "EUR"), N("Vorsteuer", "EUR"), N("Brutto", "EUR"), N("Bezahlt", "EUR"), A("Status", "Status"), A("Quelle", "MANUAL/XRECHNUNG/ZUGFERD"), A("SHA256", "Prüfsumme des Belegs")], // i18n-ignore
      rows: payables.map((row) => [row.id, row.number, day(row.issueDate), row.supplierName, row.supplierVatId, row.netCents / 100, row.taxCents / 100, row.grossCents / 100, row.paidCents / 100, row.status, row.source, row.sha256]),
    },
    {
      file: "journal.csv", name: "Protokoll", description: "Unveränderbares Änderungsprotokoll (Hash-Kette)", primaryKey: "Laufnummer", // i18n-ignore
      columns: [N("Laufnummer", "Fortlaufend", 0), A("Belegnummer", "Buchung"), A("Ereignis", "CREATE/UPDATE/REVERSE/SEAL"), A("Zeitpunkt", "ISO-Zeitstempel"), A("Bearbeiter", "Benutzer"), A("Inhaltshash", "SHA-256 des Buchungsinhalts"), A("Vorgaengerhash", "SHA-256 Vorgänger"), A("Hash", "SHA-256 dieses Eintrags")], // i18n-ignore
      rows: journal.map((row) => [row.seq, row.bookingNumber, row.event, row.createdAt.toISOString(), row.actorLabel, row.snapshotHash, row.prevHash, row.hash]),
    },
  ];
  const encoder = new TextEncoder();
  const index = gdpduIndex({ supplierName: profile.name, location: [profile.postalCode, profile.city].filter(Boolean).join(" "), comment: `Datenträgerüberlassung Z3 – Wirtschaftsjahr ${year}`, mediaName: `Buchhaltung ${year}`, from: day(from) as string, to: day(to) as string, tables }); // i18n-ignore
  const zip = buildZip([{ name: "index.xml", data: encoder.encode(index) }, ...tables.map((table) => ({ name: table.file, data: encoder.encode(gdpduCsv(table)) }))]);
  await writeAudit({ userId: user.id, userLabel: buildUserLabel(user.name, user.email), action: "EXPORT", entity: "AccountingBooking", entityId: null, after: { report: "gdpdu-z3", year, bookings: bookings.length } });
  return new Response(Buffer.from(zip), { headers: { "Content-Type": "application/zip", "Content-Disposition": `attachment; filename="GDPdU_Z3_${year}.zip"`, "Cache-Control": "no-store" } });
}

/** GET /api/accounting/gobd/procedure — Verfahrensdokumentation şablonu (Markdown, Almanca), sistem bilgileriyle önceden dolu. */
export async function gobdProcedureHandler(): Promise<Response> {
  const user = await authorize();
  if (user instanceof Response) return user;
  const db = getDb();
  const [profile, tax, accounts, journalCount, firstJournal] = await Promise.all([
    getOrganizationProfile(),
    getTaxSettings(db),
    db.accountingAccount.findMany({ where: { isActive: true }, select: { name: true, type: true, accountNumber: true } }),
    db.accountingJournal.count(),
    db.accountingJournal.findFirst({ orderBy: { seq: "asc" }, select: { createdAt: true } }),
  ]);
  const todo = "[bitte ergänzen]"; // i18n-ignore
  const md = [
    `# Verfahrensdokumentation Buchhaltung – ${profile.name}`,
    "",
    `Stand: ${new Date().toISOString().slice(0, 10)} · erstellt mit Verein ERP (automatisch vorbefüllt, bitte prüfen und ergänzen)`,
    "",
    "## 1. Allgemeine Beschreibung",
    `- Organisation: ${profile.name}, ${[profile.street, profile.postalCode, profile.city].filter(Boolean).join(", ") || todo}`,
    `- Steuernummer: ${profile.taxNumber ?? todo}`,
    `- Gewinnermittlung: Einnahmen-Überschuss-Rechnung (§ 4 Abs. 3 EStG); Kontenrahmen ${tax.chartOfAccounts}`,
    `- Umsatzsteuer: ${tax.smallBusiness ? "Kleinunternehmer (§ 19 UStG)" : `${tax.taxMethod === "IST" ? "Ist" : "Soll"}-Versteuerung, Voranmeldung ${tax.vatPeriod}`}`,
    `- Verantwortlich für die Buchhaltung: ${todo}`,
    "",
    "## 2. Anwenderdokumentation",
    "- Belege werden zeitnah (spätestens innerhalb von 10 Tagen) erfasst; jede Buchung erhält eine fortlaufende, lückenlose Nummer je Wirtschaftsjahr.",
    "- Eingangsrechnungen werden hochgeladen (PDF/XML/Foto); E-Rechnungen (XRechnung/ZUGFeRD) werden automatisch gelesen und vor Freigabe geprüft (§ 14 UStG-Prüfliste).",
    "- Bankumsätze werden per Kontoauszug-Import (CAMT.053/MT940/CSV) übernommen; Zuordnungen erfolgen ausschließlich nach Bestätigung durch einen Benutzer.",
    `- Geldkonten: ${accounts.map((account) => `${account.name} (${account.type}${account.accountNumber ? `, ${account.accountNumber}` : ""})`).join("; ") || todo}`,
    "- Kasse: tägliche Kassenabschlüsse mit Zählprotokoll (Soll/Ist-Differenz); nach dem Abschluss sind Buchungen für den Tag gesperrt.",
    "",
    "## 3. Technische Systemdokumentation",
    "- Webanwendung (Next.js) mit PostgreSQL-Datenbank; Zugriff nur nach Anmeldung; Rollen- und Rechtekonzept je Modul.",
    "- Buchungen können nicht gelöscht werden (Datenbank-Trigger); Korrekturen erfolgen per Storno mit Begründung.",
    `- Unveränderbarkeit: jede Erfassung, Änderung und Stornierung wird in einem fortlaufenden, hash-verketteten Protokoll (SHA-256) festgehalten (${journalCount} Einträge${firstJournal ? ` seit ${firstJournal.createdAt.toISOString().slice(0, 10)}` : ""}); die Prüfung ist in der Anwendung jederzeit möglich.`,
    "- Belegdateien werden mit Prüfsumme (SHA-256) gespeichert.",
    "- Datenträgerüberlassung (Z3): Export im GDPdU-Format (index.xml + CSV) je Wirtschaftsjahr.",
    "",
    "## 4. Betriebsdokumentation",
    `- Datensicherung: ${todo} (Häufigkeit, Speicherort, Wiederherstellungstest)`,
    `- Zugriffsberechtigungen: ${todo} (wer hat welche Rolle)`,
    "- Aufbewahrung: Buchungen, Belege und Rechnungen 8 bzw. 10 Jahre (§ 147 AO, § 14b UStG); Löschung erst nach Ablauf.",
    "",
    "## 5. Internes Kontrollsystem",
    "- Vier-Augen-Prinzip bei Zahlungen: " + todo,
    "- Regelmäßige Prüfung: Hash-Kette, Belegvollständigkeit, Nummernlücken und offene Bankumsätze (Seite „GoBD“).",
    "- Jahresabschluss: Sperre des Wirtschaftsjahres nach Abschluss (keine Buchungen mehr möglich).",
    "",
  ].join("\n"); // i18n-ignore
  return new Response(md, { headers: { "Content-Type": "text/markdown; charset=utf-8", "Content-Disposition": 'attachment; filename="Verfahrensdokumentation.md"', "Cache-Control": "no-store" } });
}
