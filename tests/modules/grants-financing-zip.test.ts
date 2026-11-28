import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, test } from "node:test";

process.env.DATABASE_URL ??= "postgresql://unused/never-connected";
process.env.AUTH_SECRET ??= "test-grants-financing-zip-secret-0123456789";

describe("Grants — Anteilfinanzierung / Festbetragsfinanzierung & Verwendungsnachweis ZIP", () => {
  test("computeNeededGrantCents calculates FEHLBEDARF, ANTEIL, and FESTBETRAG accurately", async () => {
    const { computeNeededGrantCents } = await import("@/modules/grants/lib/financing");

    // FEHLBEDARF: actual - ownShare - thirdParty - otherIncome
    assert.equal(
      computeNeededGrantCents({
        financingType: "FEHLBEDARF",
        sharePercent: null,
        approvedCents: 100_000,
        actualTotalCents: 120_000,
        ownShareCents: 20_000,
        thirdPartyCents: 10_000,
        otherIncomeCents: 5_000,
      }),
      85_000,
    );

    // ANTEIL: 80% of 100_000 = 80_000 (below 90_000 cap)
    assert.equal(
      computeNeededGrantCents({
        financingType: "ANTEIL",
        sharePercent: 80,
        approvedCents: 90_000,
        actualTotalCents: 100_000,
        ownShareCents: 0,
        thirdPartyCents: 0,
        otherIncomeCents: 0,
      }),
      80_000,
    );

    // ANTEIL: capped at approvedCents (90_000)
    assert.equal(
      computeNeededGrantCents({
        financingType: "ANTEIL",
        sharePercent: 80,
        approvedCents: 90_000,
        actualTotalCents: 150_000,
        ownShareCents: 0,
        thirdPartyCents: 0,
        otherIncomeCents: 0,
      }),
      90_000,
    );

    // FESTBETRAG: fixed approvedCents when expenses >= approvedCents
    assert.equal(
      computeNeededGrantCents({
        financingType: "FESTBETRAG",
        sharePercent: null,
        approvedCents: 50_000,
        actualTotalCents: 75_000,
        ownShareCents: 0,
        thirdPartyCents: 0,
        otherIncomeCents: 0,
      }),
      50_000,
    );

    // FESTBETRAG: reduced to actualTotalCents if expenses < approvedCents
    assert.equal(
      computeNeededGrantCents({
        financingType: "FESTBETRAG",
        sharePercent: null,
        approvedCents: 50_000,
        actualTotalCents: 35_000,
        ownShareCents: 0,
        thirdPartyCents: 0,
        otherIncomeCents: 0,
      }),
      35_000,
    );
  });

  test("buildZipArchive produces valid PKZIP binary with local header, central directory, and EOCD", async () => {
    const { buildZipArchive } = await import("@/shared/files/zip");
    const buf = buildZipArchive([
      { name: "belegliste.csv", data: Buffer.from("Date;Booking\r\n2026-01-01;B-1\r\n", "utf8") },
      { name: "belege/B-1_rechnüng.pdf", data: Buffer.from("%PDF-1.4\n%test\n", "utf8") },
    ]);

    // Starts with PK\x03\x04
    assert.equal(buf.readUInt32LE(0), 0x04034b50);
    // Contains Central Directory signature PK\x01\x02
    assert.ok(buf.includes(Buffer.from([0x50, 0x4b, 0x01, 0x02])));
    // Ends with EOCD signature PK\x05\x06 and entry count = 2
    const eocdOffset = buf.length - 22;
    assert.equal(buf.readUInt32LE(eocdOffset), 0x06054b50);
    assert.equal(buf.readUInt16LE(eocdOffset + 8), 2);
    assert.equal(buf.readUInt16LE(eocdOffset + 10), 2);
  });

  test("receipts-zip API route bridge exists after module:sync", () => {
    const root = process.cwd();
    assert.ok(
      fs.existsSync(path.join(root, "src/app/api/(modules)/grants/[id]/receipts-zip/route.ts")),
    );
  });
});

describe("#653 review fixes", () => {
  test("neutralizes spreadsheet formulas in belegliste.csv cells but keeps plain amounts", async () => {
    const { csvCell } = await import("../../src/modules/grants/lib/receipts-csv");
    assert.equal(csvCell('=HYPERLINK("http://example.org","x")'), `"'=HYPERLINK(""http://example.org"",""x"")"`);
    assert.equal(csvCell("@SUM(A1)"), `"'@SUM(A1)"`);
    assert.equal(csvCell("-12,50"), `"-12,50"`);
    assert.equal(csvCell(null), `""`);
  });

  test("requires a percentage for Anteilfinanzierung and stores none for other types", async () => {
    const { grantSchema } = await import("../../src/modules/grants/schemas/grant");
    const base = { id: null, name: "Synthetic grant", funder: "Synthetic funder", fileNumber: "", purpose: "", status: "PLANNED", approvedCents: null, ownShareCents: 0, thirdPartyCents: 0, periodStart: "2026-01-01", periodEnd: "2026-12-31", reportDueAt: null, projectId: null, useNetAmounts: false };
    const missing = grantSchema.safeParse({ ...base, financingType: "ANTEIL", sharePercent: null });
    assert.equal(missing.success, false);
    assert.ok(!missing.success && missing.error.issues.some((issue) => issue.message === "grants.errors.sharePercent"));
    const anteil = grantSchema.safeParse({ ...base, financingType: "ANTEIL", sharePercent: 80 });
    assert.ok(anteil.success && anteil.data.sharePercent === 80);
    const fixed = grantSchema.safeParse({ ...base, financingType: "FESTBETRAG", sharePercent: 50 });
    assert.ok(fixed.success && fixed.data.sharePercent === null, "a stale rate is dropped for other financing types");
  });

  test("refuses an oversized receipt bundle before reading any file", async () => {
    const { RECEIPTS_ZIP_MAX_BYTES } = await import("../../src/modules/grants/lib/receipts-csv");
    assert.equal(RECEIPTS_ZIP_MAX_BYTES, 200 * 1024 * 1024);
    const src = fs.readFileSync(path.join(process.cwd(), "src/modules/grants/handlers/receipts-zip.ts"), "utf8");
    const cap = src.indexOf("totalBytes > RECEIPTS_ZIP_MAX_BYTES");
    assert.ok(cap > 0, "aggregate byte cap exists");
    assert.ok(cap < src.indexOf("await readFile("), "the cap is checked before any file is read");
    assert.ok(src.includes("{ status: 413 }"));
    const query = fs.readFileSync(path.join(process.cwd(), "src/modules/accounting/queries/project-bookings.ts"), "utf8");
    assert.ok(query.includes("size: f.size"), "stored sizes come from the file rows, not from reading files");
  });
});

