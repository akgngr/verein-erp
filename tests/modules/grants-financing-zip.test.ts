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
