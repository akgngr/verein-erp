/** Synthetic browser fixtures for the disposable GitHub Actions database only. */
import { moduleConfig as secretaryConfig } from "../src/modules/secretary/module.config";
import { createPrismaClient } from "../src/shared/db-client";
import { accessSignature } from "../src/shared/modules/module-access";

async function main() {
  const url = new URL(process.env.DATABASE_URL ?? "");
  if (
    process.env.CI !== "true" ||
    !["localhost", "127.0.0.1"].includes(url.hostname) ||
    url.pathname !== "/verein_ci"
  ) {
    throw new Error("THEME_FIXTURES_REQUIRE_ISOLATED_CI_DATABASE");
  }
  const db = createPrismaClient();
  try {
    const user = await db.user.findUniqueOrThrow({
      where: { email: "ci-admin@example.test" },
      select: { id: true },
    });
    for (let i = 1; i <= 12; i++) {
      const id = `theme-preview-member-${String(i).padStart(2, "0")}`;
      const data = {
        year: 2026,
        sequence: 900000 + i,
        membershipNumber: `PREVIEW-${String(i).padStart(4, "0")}`,
        firstName: "Demo",
        lastName: `Mitglied${String(i).padStart(2, "0")}`,
        email: `mitglied${i}@example.test`,
        joinDate: new Date("2026-03-01T00:00:00Z"),
        createdById: user.id,
        createdByLabel: "CI preview",
        status: i === 12 ? ("PASSIVE" as const) : ("ACTIVE" as const),
        type: i % 4 === 0 ? ("DESTEKCI" as const) : ("ASIL" as const),
      };
      await db.member.upsert({
        where: { id },
        create: { id, ...data },
        update: data,
      });
    }
    await db.systemModuleState.upsert({
      where: { moduleKey: "accounting" },
      create: { moduleKey: "accounting", isEnabled: true },
      update: { isEnabled: true },
    });
    // Sekreter (EXTENSION): Panel'in sağ sütunundaki "Bugün" kartının tarayıcı smoke'u için açılır ve
    // erişim talebi onaylanır (#291). Yalnız tek kullanımlık CI veritabanında.
    await db.systemModuleState.upsert({
      where: { moduleKey: "secretary" },
      create: { moduleKey: "secretary", isEnabled: true },
      update: { isEnabled: true },
    });
    const secretaryAccess = JSON.stringify({ signature: accessSignature(secretaryConfig.access), approvedAt: new Date().toISOString(), approvedBy: user.id });
    await db.systemSetting.upsert({
      where: { key: "module-access:secretary" },
      create: { key: "module-access:secretary", value: secretaryAccess, description: "module-access approval" },
      update: { value: secretaryAccess },
    });
    await db.accountingSettings.upsert({
      where: { id: "singleton" },
      create: { id: "singleton", vatPeriod: "MONTH", taxMethod: "IST", smallBusiness: false },
      update: { vatPeriod: "MONTH", taxMethod: "IST", smallBusiness: false },
    });
    await db.accountingAccount.upsert({
      where: { id: "theme-preview-account" },
      create: {
        id: "theme-preview-account",
        name: "Theme Preview Bank",
        type: "BANK",
        openingBalance: "2500.00",
        openingDate: new Date("2026-01-01T00:00:00Z"),
      },
      update: { isActive: true },
    });
    for (const [id, name, direction] of [
      ["theme-preview-income", "Theme Preview Einnahmen", "INCOME"],
      ["theme-preview-expense", "Theme Preview Ausgaben", "EXPENSE"],
    ] as const) {
      await db.accountingCategory.upsert({
        where: { id },
        create: { id, name, direction, sphere: "IDEELL", isActive: true },
        update: { name, direction, sphere: "IDEELL", isActive: true },
      });
    }
    const previewBookings = [
      ["01", "INCOME", "2026-02-12", "theme-preview-income", "4500.00"],
      ["02", "EXPENSE", "2026-03-08", "theme-preview-expense", "1850.00"],
      ["03", "INCOME", "2026-05-17", "theme-preview-income", "6200.00"],
      ["04", "EXPENSE", "2026-06-22", "theme-preview-expense", "2700.00"],
      ["05", "INCOME", "2026-08-11", "theme-preview-income", "5100.00"],
      ["06", "EXPENSE", "2026-09-04", "theme-preview-expense", "2150.00"],
      ["07", "INCOME", "2026-10-19", "theme-preview-income", "7300.00"],
      ["08", "EXPENSE", "2026-11-02", "theme-preview-expense", "3400.00"],
    ] as const;
    for (const [suffix, type, date, categoryId, amount] of previewBookings) {
      const sequence = 990000 + Number(suffix);
      await db.accountingBooking.upsert({
        where: { bookingNumber: `PREVIEW-2026-${suffix}` },
        create: {
          year: 2026,
          sequence,
          bookingNumber: `PREVIEW-2026-${suffix}`,
          type,
          bookingDate: new Date(`${date}T00:00:00Z`),
          accountId: "theme-preview-account",
          categoryId,
          amount,
          netAmount: amount,
          taxAmount: "0.00",
          taxRate: 0,
          description: "Theme preview",
          createdById: user.id,
          createdByLabel: "CI preview",
        },
        update: { amount, netAmount: amount, bookingDate: new Date(`${date}T00:00:00Z`), reversedAt: null },
      });
    }
    await db.accountingInvoice.upsert({
      where: { number: "PREVIEW-R-2026-0001" },
      create: {
        kind: "INVOICE",
        status: "ISSUED",
        number: "PREVIEW-R-2026-0001",
        year: 2026,
        sequence: 990001,
        issueDate: new Date("2026-09-01T00:00:00Z"),
        dueDate: new Date("2026-10-01T00:00:00Z"),
        recipientName: "Theme Preview Kunde",
        netCents: 120000,
        taxCents: 0,
        grossCents: 120000,
        paidCents: 20000,
        createdById: user.id,
        createdByLabel: "CI preview",
      },
      update: { status: "ISSUED", dueDate: new Date("2026-10-01T00:00:00Z"), grossCents: 120000, paidCents: 20000 },
    });
    console.info("[theme] Accounting dashboard fixtures prepared.");
    console.info("[theme] 12 synthetic member fixtures prepared.");
  } finally {
    await db.$disconnect();
  }
}
main().catch((error) => {
  console.error(
    error instanceof Error ? error.message : "THEME_FIXTURES_FAILED",
  );
  process.exit(1);
});
