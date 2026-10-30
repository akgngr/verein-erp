import test, { describe } from "node:test";
import assert from "node:assert/strict";

import { applyDiscount, planCharges } from "../src/modules/courses/services/charge-plan";
import { buildDatevDebtorsCsv, encodeCp1252 } from "../src/modules/students/services/datev-export";

const d = (iso: string) => new Date(`${iso}T00:00:00Z`);

describe("Kurs ödeme planı", () => {
  test("ücretsiz kurs ve %100 indirim kalem üretmez", () => {
    const base = { feeCents: 5000, installmentCount: null, enrolledAt: d("2026-09-01"), courseStart: d("2026-09-01"), courseEnd: d("2027-06-30") };
    assert.deepEqual(planCharges({ ...base, feeType: "FREE", discountPercent: 0 }), []);
    assert.deepEqual(planCharges({ ...base, feeType: "ONE_TIME", discountPercent: 100 }), []);
  });

  test("taksitler toplamı kuruşu kuruşuna tutar; kalan son taksite", () => {
    const plan = planCharges({ feeType: "INSTALLMENTS", feeCents: 10000, installmentCount: 3, discountPercent: 0, enrolledAt: d("2026-01-31"), courseStart: d("2026-01-01"), courseEnd: null });
    assert.deepEqual(plan.map((charge) => charge.amountCents), [3333, 3333, 3334]);
    assert.deepEqual(plan.map((charge) => charge.dueDate.toISOString().slice(0, 10)), ["2026-01-31", "2026-02-28", "2026-03-31"]);
  });

  test("aylık ücret: kayıt ayından bitiş ayına, indirimli", () => {
    const plan = planCharges({ feeType: "MONTHLY", feeCents: 4000, installmentCount: null, discountPercent: 25, enrolledAt: d("2026-10-15"), courseStart: d("2026-09-01"), courseEnd: d("2027-01-31") });
    assert.deepEqual(plan.map((charge) => charge.period), ["2026-10", "2026-11", "2026-12", "2027-01"]);
    assert.equal(plan[0].dueDate.toISOString().slice(0, 10), "2026-10-15");
    assert.equal(plan[1].dueDate.toISOString().slice(0, 10), "2026-11-01");
    assert.ok(plan.every((charge) => charge.amountCents === 3000 && charge.total === 4));
  });

  test("indirim en yakın kuruşa yuvarlanır", () => {
    assert.equal(applyDiscount(999, 10), 899);
  });
});

describe("DATEV Debitoren dışa aktarımı", () => {
  test("Windows-1252: Almanca harfler korunur, Türkçe harfler sadeleşir", () => {
    assert.deepEqual([...encodeCp1252("äß€")], [0xe4, 0xdf, 0x80]);
    assert.equal(Buffer.from(encodeCp1252("Şükrü Işık")).toString("latin1"), "Sükrü Isik");
  });

  test("EXTF başlığı, sütun satırı ve kayıt", () => {
    const csv = Buffer.from(
      buildDatevDebtorsCsv(
        [{ debtorNumber: 10001, salutation: "Frau", firstName: "Ayşe", lastName: "Yılmaz", street: "Hauptstr.", houseNumber: "5", postalCode: "50667", city: "Köln", country: "DE", email: "a@example.test", phone: null }],
        { consultantNo: "1234567", clientNo: "12345", fiscalYearStart: "20260101", now: new Date("2026-10-30T08:00:00Z") },
      ),
    ).toString("latin1");
    const [header, columns, row] = csv.split("\r\n");
    assert.ok(header.startsWith('"EXTF";700;16;"Debitoren/Kreditoren";5;20261030080000000;'));
    assert.ok(header.endsWith(";1234567;12345;20260101;4"));
    assert.ok(columns.startsWith('"Konto";"Name (Adressattyp Unternehmen)"'));
    const cells = row.split(";");
    assert.equal(cells.length, columns.split(";").length);
    assert.equal(cells[0], "10001");
    assert.equal(cells[3], '"Yilmaz"');
    assert.equal(cells[15], '"Hauptstr. 5"');
    assert.equal(cells[18], '"Köln"');
  });
});
