import test, { describe } from "node:test";
import assert from "node:assert/strict";

import { checkDueYear, checkMemberDates, checkPaymentDate, dueYearRange } from "../src/modules/members/services/date-rules";

const d = (value: string) => new Date(`${value}T00:00:00.000Z`);
const today = d("2026-10-31");

describe("Üye tarih kuralları", () => {
  test("giriş tarihinden önceki ödeme reddedilir (10.10.2026 giriş → 10.10.1980 ödeme)", () => {
    assert.deepEqual(checkPaymentDate({ paidAt: d("1980-10-10"), joinDate: d("2026-10-10"), today }), { paidAt: ["members.validation.paymentBeforeJoin"] });
    assert.deepEqual(checkPaymentDate({ paidAt: d("2026-10-15"), joinDate: d("2026-10-10"), today }), {});
    assert.deepEqual(checkPaymentDate({ paidAt: d("2026-11-01"), joinDate: d("2026-10-10"), today }), { paidAt: ["members.validation.paymentDateFuture"] });
  });

  test("aidat yılı üyelik yılları içinde olmalı", () => {
    assert.deepEqual(dueYearRange({ joinDate: d("2026-10-10"), exitDate: null, today }), { min: 2026, max: 2027 });
    assert.deepEqual(checkDueYear({ year: 1980, joinDate: d("2026-10-10"), exitDate: null, today }), { dueYear: ["members.validation.dueYearOutsideMembership"] });
    assert.deepEqual(checkDueYear({ year: 2025, joinDate: d("2020-01-01"), exitDate: d("2024-06-30"), today }), { dueYear: ["members.validation.dueYearOutsideMembership"] });
    assert.deepEqual(checkDueYear({ year: 2024, joinDate: d("2020-01-01"), exitDate: d("2024-06-30"), today }), {});
  });

  test("doğum, giriş ve ayrılış tarihleri tutarlı olmalı", () => {
    assert.deepEqual(checkMemberDates({ birthDate: d("1990-05-05"), joinDate: d("2026-10-10"), exitDate: null, today }), {});
    assert.deepEqual(checkMemberDates({ birthDate: d("2027-01-01"), joinDate: d("2026-10-10"), exitDate: null, today }).birthDate, ["members.validation.birthDateFuture"]);
    assert.deepEqual(checkMemberDates({ birthDate: d("1850-01-01"), joinDate: d("2026-10-10"), exitDate: null, today }).birthDate, ["members.validation.dateTooOld"]);
    assert.deepEqual(checkMemberDates({ birthDate: d("2000-01-01"), joinDate: d("1999-01-01"), exitDate: null, today }).joinDate, ["members.validation.joinBeforeBirth"]);
    assert.deepEqual(checkMemberDates({ birthDate: null, joinDate: d("2026-10-10"), exitDate: d("2026-01-01"), today }).exitDate, ["members.validation.exitBeforeJoin"]);
    assert.deepEqual(checkMemberDates({ birthDate: null, joinDate: d("2028-06-01"), exitDate: null, today }).joinDate, ["members.validation.joinTooFarFuture"]);
    assert.deepEqual(checkMemberDates({ birthDate: null, joinDate: d("2027-01-01"), exitDate: null, today }), {}, "gelecek yılın başından itibaren üyelik geçerli");
  });
});
