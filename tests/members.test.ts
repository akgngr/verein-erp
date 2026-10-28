import test, { describe } from "node:test";
import assert from "node:assert/strict";
import { Prisma } from "@prisma/client";

import {
  formatMembershipNumber,
} from "../src/modules/members/services/membership-number";
import {
  formatReceiptNumber,
} from "../src/modules/members/services/receipt-number";
import {
  canSeeKimlikNo,
  maskKimlikNo,
} from "../src/modules/members/services/kimlik";
import {
  canSeeTcKimlikNo,
  maskTcKimlikNo,
} from "../src/modules/members/services/tc-kimlik";
import {
  decimalToCents,
  deriveDueStatus,
} from "../src/modules/members/services/dues-calculation";
import {
  berlinToday,
  berlinMonthRange,
  berlinYear,
  parseDateOnly,
  formatAddress,
} from "../src/modules/members/utils";
import {
  memberCreateSchema,
  memberUpdateSchema,
  changeStatusSchema,
} from "../src/modules/members/schemas/member";
import {
  dueAddSchema,
  generateDuesSchema,
} from "../src/modules/members/schemas/dues";
import {
  paymentCreateSchema,
  paymentVoidSchema,
} from "../src/modules/members/schemas/payment";
import {
  membersPermissions,
  memberPaymentsPermissions,
  memberTypesPermissions,
} from "../src/modules/members/permissions";
import { buildMemberWhere } from "../src/modules/members/queries/list-members";
import { buildDuesWhere } from "../src/modules/members/queries/list-dues";
import { can } from "../src/shared/permissions/define";

describe("Members Module - Core Services & Utilities", () => {
  describe("Membership Number Generation", () => {
    test("formats membership number according to UYE-<year>-<seq> standard", () => {
      assert.strictEqual(formatMembershipNumber(2026, 1), "UYE-2026-0001");
      assert.strictEqual(formatMembershipNumber(2026, 42), "UYE-2026-0042");
      assert.strictEqual(formatMembershipNumber(2025, 999), "UYE-2025-0999");
    });

    test("handles sequence numbers exceeding 4 digits gracefully", () => {
      assert.strictEqual(formatMembershipNumber(2026, 10005), "UYE-2026-10005");
      assert.strictEqual(formatMembershipNumber(2026, 99999), "UYE-2026-99999");
    });
  });

  describe("Receipt Number Generation", () => {
    test("formats receipt number according to MAK-<year>-<seq> standard", () => {
      assert.strictEqual(formatReceiptNumber(2026, 1), "MAK-2026-0001");
      assert.strictEqual(formatReceiptNumber(2026, 150), "MAK-2026-0150");
      assert.strictEqual(formatReceiptNumber(2024, 9999), "MAK-2024-9999");
    });
  });

  describe("Kimlik Privacy & Role Masking", () => {
    test("canSeeKimlikNo allows ADMIN, BOARD, and SECRETARY only", () => {
      assert.strictEqual(canSeeKimlikNo("ADMIN"), true);
      assert.strictEqual(canSeeKimlikNo("BOARD"), true);
      assert.strictEqual(canSeeKimlikNo("SECRETARY"), true);

      assert.strictEqual(canSeeKimlikNo("TREASURER"), false);
      assert.strictEqual(canSeeKimlikNo("AUDITOR"), false);
      assert.strictEqual(canSeeKimlikNo("VIEWER"), false);
    });

    test("maskKimlikNo returns value for authorized roles and null for others", () => {
      const secret = "A12345678";
      assert.strictEqual(maskKimlikNo("ADMIN", secret), secret);
      assert.strictEqual(maskKimlikNo("BOARD", secret), secret);
      assert.strictEqual(maskKimlikNo("SECRETARY", secret), secret);

      assert.strictEqual(maskKimlikNo("TREASURER", secret), null);
      assert.strictEqual(maskKimlikNo("AUDITOR", secret), null);
      assert.strictEqual(maskKimlikNo("VIEWER", secret), null);
    });

    test("canSeeTcKimlikNo and maskTcKimlikNo follow identical security policies", () => {
      assert.strictEqual(canSeeTcKimlikNo("ADMIN"), true);
      assert.strictEqual(canSeeTcKimlikNo("VIEWER"), false);
      assert.strictEqual(maskTcKimlikNo("ADMIN", "12345678901"), "12345678901");
      assert.strictEqual(maskTcKimlikNo("VIEWER", "12345678901"), null);
    });
  });

  describe("Dues Calculation & Status Derivation", () => {
    test("decimalToCents correctly converts Decimal to integer cents", () => {
      assert.strictEqual(decimalToCents(null), 0);
      assert.strictEqual(decimalToCents(undefined), 0);
      assert.strictEqual(decimalToCents(new Prisma.Decimal(0)), 0);
      assert.strictEqual(decimalToCents(new Prisma.Decimal(12.5)), 1250);
      assert.strictEqual(decimalToCents(new Prisma.Decimal(120)), 12000);
      assert.strictEqual(decimalToCents(new Prisma.Decimal("99.99")), 9999);
    });

    test("deriveDueStatus returns correct status under all payment conditions", () => {
      // 1. Muafiyet (WAIVED): ödeme yoksa korunur
      assert.strictEqual(deriveDueStatus(10000, 0, "WAIVED"), "WAIVED");
      // Muafiyet verilmiş olsa bile ödeme yapılmışsa durum yeniden türetilir
      assert.strictEqual(deriveDueStatus(10000, 5000, "WAIVED"), "PARTIAL");
      assert.strictEqual(deriveDueStatus(10000, 10000, "WAIVED"), "PAID");

      // 2. Hiç ödeme yoksa OPEN
      assert.strictEqual(deriveDueStatus(10000, 0, "OPEN"), "OPEN");

      // 3. Kısmi ödeme PARTIAL
      assert.strictEqual(deriveDueStatus(10000, 2500, "OPEN"), "PARTIAL");
      assert.strictEqual(deriveDueStatus(10000, 9999, "OPEN"), "PARTIAL");

      // 4. Tam veya fazla ödeme PAID
      assert.strictEqual(deriveDueStatus(10000, 10000, "OPEN"), "PAID");
      assert.strictEqual(deriveDueStatus(10000, 15000, "OPEN"), "PAID");

      // 5. Borç 0 veya negatif tanımlanmışsa (özel durum)
      assert.strictEqual(deriveDueStatus(0, 0, "OPEN"), "OPEN");
      assert.strictEqual(deriveDueStatus(0, 100, "OPEN"), "PARTIAL");
    });
  });

  describe("Date & Address Helpers", () => {
    test("berlinToday returns a valid Date at UTC midnight", () => {
      const today = berlinToday();
      assert.ok(today instanceof Date);
      assert.strictEqual(today.getUTCHours(), 0);
      assert.strictEqual(today.getUTCMinutes(), 0);
      assert.strictEqual(today.getUTCSeconds(), 0);
    });

    test("berlinMonthRange returns start and end of the given month", () => {
      const fixedDate = new Date("2026-03-15T12:00:00Z");
      const range = berlinMonthRange(fixedDate);

      assert.strictEqual(range.start.toISOString().slice(0, 10), "2026-03-01");
      assert.strictEqual(range.end.toISOString().slice(0, 10), "2026-04-01");
    });

    test("berlinYear extracts year correctly", () => {
      const date = new Date("2026-01-01T00:00:00Z");
      assert.strictEqual(berlinYear(date), 2026);
    });

    test("parseDateOnly parses valid YYYY-MM-DD or returns null", () => {
      const valid = parseDateOnly("2026-05-20");
      assert.ok(valid instanceof Date);
      assert.strictEqual(valid.getUTCFullYear(), 2026);
      assert.strictEqual(valid.getUTCMonth(), 4); // 0-indexed May
      assert.strictEqual(valid.getUTCDate(), 20);

      assert.strictEqual(parseDateOnly("invalid-date"), null);
      assert.strictEqual(parseDateOnly("2026-02-30"), null); // Invalid date overflow
      assert.strictEqual(parseDateOnly(""), null);
    });

    test("formatAddress formats German-style street, houseNumber, postalCode, city", () => {
      const full = formatAddress({
        street: "Hauptstraße",
        houseNumber: "12A",
        postalCode: "10115",
        city: "Berlin",
        state: "Berlin",
      });
      assert.strictEqual(full, "Hauptstraße 12A, 10115 Berlin (Berlin)");

      const noState = formatAddress({
        street: "Musterweg",
        houseNumber: "5",
        postalCode: "50667",
        city: "Köln",
      });
      assert.strictEqual(noState, "Musterweg 5, 50667 Köln");

      const empty = formatAddress({});
      assert.strictEqual(empty, null);
    });
  });

  describe("Zod Validation Schemas", () => {
    test("memberCreateSchema validates valid input and normalizes empty strings", () => {
      const input = {
        type: "ASIL",
        firstName: "Max",
        lastName: "Mustermann",
        kimlikNo: "   ",
        email: "max@example.com",
        phone: "+49 30 123456",
        street: "Musterstr.",
        houseNumber: "1",
        country: "Deutschland",
        postalCode: "10115",
        city: "Berlin",
        state: "Berlin",
        birthDate: "1990-01-01",
        profession: "Mühendis",
        joinDate: "2026-01-01",
        exitDate: "",
        exitReason: "",
        notes: "",
      };

      const result = memberCreateSchema.safeParse(input);
      assert.ok(result.success, result.success ? "" : JSON.stringify(result.error.issues));
      if (result.success) {
        assert.strictEqual(result.data.kimlikNo, null);
        assert.strictEqual(result.data.exitDate, null);
        assert.strictEqual(result.data.exitReason, null);
        assert.strictEqual(result.data.notes, null);
        assert.strictEqual(result.data.postalCode, "10115");
      }
    });

    test("memberCreateSchema enforces 5-digit PLZ for Germany", () => {
      const invalidPlz = {
        type: "ASIL",
        firstName: "Max",
        lastName: "Mustermann",
        country: "Almanya",
        postalCode: "1234", // 4 digits, invalid for Germany
        joinDate: "2026-01-01",
      };

      const res = memberCreateSchema.safeParse(invalidPlz);
      assert.strictEqual(res.success, false);
      if (!res.success) {
        const plzIssue = res.error.issues.find((i) => i.path.includes("postalCode"));
        assert.ok(plzIssue, "Posta kodu hatası bekleniyor");
        assert.match(plzIssue.message, /5 haneli/);
      }
    });

    test("memberCreateSchema allows non-5-digit PLZ for foreign countries", () => {
      const foreign = {
        type: "ASIL",
        firstName: "Jean",
        lastName: "Dupont",
        country: "France",
        postalCode: "75001",
        joinDate: "2026-01-01",
      };

      const res = memberCreateSchema.safeParse(foreign);
      assert.ok(res.success);
    });

    test("memberCreateSchema rejects exitDate earlier than joinDate", () => {
      const invalidDates = {
        type: "ASIL",
        firstName: "Max",
        lastName: "Mustermann",
        joinDate: "2026-05-01",
        exitDate: "2026-04-01",
      };

      const res = memberCreateSchema.safeParse(invalidDates);
      assert.strictEqual(res.success, false);
      if (!res.success) {
        const dateIssue = res.error.issues.find((i) => i.path.includes("exitDate"));
        assert.ok(dateIssue);
        assert.match(dateIssue.message, /önce olamaz/);
      }
    });

    test("memberCreateSchema requires exitDate when exitReason is provided", () => {
      const missingExitDate = {
        type: "ASIL",
        firstName: "Max",
        lastName: "Mustermann",
        joinDate: "2026-01-01",
        exitReason: "Kendi isteğiyle ayrıldı",
      };

      const res = memberCreateSchema.safeParse(missingExitDate);
      assert.strictEqual(res.success, false);
      if (!res.success) {
        const issue = res.error.issues.find((i) => i.path.includes("exitDate"));
        assert.ok(issue);
        assert.match(issue.message, /ayrılış tarihi de girin/);
      }
    });

    test("memberUpdateSchema requires status and updatedAt for concurrency check", () => {
      const updateData = {
        type: "ASIL",
        status: "ACTIVE",
        firstName: "Max",
        lastName: "Mustermann",
        joinDate: "2026-01-01",
        updatedAt: new Date().toISOString(),
      };

      const res = memberUpdateSchema.safeParse(updateData);
      assert.ok(res.success);

      const missingVersion = { ...updateData, updatedAt: "" };
      assert.strictEqual(memberUpdateSchema.safeParse(missingVersion).success, false);
    });

    test("changeStatusSchema validates status transitions", () => {
      const res = changeStatusSchema.safeParse({
        id: "mem_123",
        status: "RESIGNED",
        exitDate: "2026-06-30",
        exitReason: "Taşınma",
        cancellationReceivedAt: "2026-05-15",
      });
      assert.ok(res.success);
      if (res.success) {
        assert.strictEqual(res.data.status, "RESIGNED");
        assert.strictEqual(res.data.exitDate, "2026-06-30");
      }
    });

    test("paymentCreateSchema validates required payment fields and methods", () => {
      const valid = {
        memberId: "mem_123",
        dueYear: 2026,
        amount: "120,00",
        method: "BANK_TRANSFER",
        paidAt: "2026-02-15",
        reference: "Üyelik Aidatı 2026",
      };
      assert.ok(paymentCreateSchema.safeParse(valid).success);

      const invalidMethod = { ...valid, method: "BITCOIN" };
      assert.strictEqual(paymentCreateSchema.safeParse(invalidMethod).success, false);

      const invalidYear = { ...valid, dueYear: 1990 };
      assert.strictEqual(paymentCreateSchema.safeParse(invalidYear).success, false);
    });

    test("paymentVoidSchema requires non-empty cancellation reason", () => {
      assert.ok(
        paymentVoidSchema.safeParse({ id: "pay_1", reason: "Mükerrer banka kaydı" }).success,
      );
      assert.strictEqual(
        paymentVoidSchema.safeParse({ id: "pay_1", reason: "kısa" }).success,
        false,
      );
    });

    test("dueAddSchema and generateDuesSchema enforce valid bounds", () => {
      const validDue = {
        memberId: "mem_123",
        year: 2026,
        amount: "60.00",
        dueDate: "2026-03-31",
        note: "2026 yılı aidatı",
      };
      assert.ok(dueAddSchema.safeParse(validDue).success);

      const currentYear = new Date().getFullYear();
      const validGen = {
        year: currentYear,
        dueDate: `${currentYear}-03-31`,
        dryRun: true,
      };
      assert.ok(generateDuesSchema.safeParse(validGen).success);
    });
  });

  describe("Permissions & Access Controls", () => {
    test("membersPermissions restricts deletion to ADMIN only", () => {
      assert.strictEqual(can("ADMIN", membersPermissions, "delete"), true);
      assert.strictEqual(can("BOARD", membersPermissions, "delete"), false);
      assert.strictEqual(can("SECRETARY", membersPermissions, "delete"), false);
      assert.strictEqual(can("TREASURER", membersPermissions, "delete"), false);
      assert.strictEqual(can("VIEWER", membersPermissions, "delete"), false);
    });

    test("memberPaymentsPermissions restricts view access to prevent VIEWER seeing payments", () => {
      assert.strictEqual(can("ADMIN", memberPaymentsPermissions, "view"), true);
      assert.strictEqual(can("TREASURER", memberPaymentsPermissions, "view"), true);
      assert.strictEqual(can("TREASURER", memberPaymentsPermissions, "create"), true);
      assert.strictEqual(can("AUDITOR", memberPaymentsPermissions, "view"), true);
      assert.strictEqual(can("AUDITOR", memberPaymentsPermissions, "create"), false);
      assert.strictEqual(can("VIEWER", memberPaymentsPermissions, "view"), false);
    });

    test("memberTypesPermissions allows config management to ADMIN and BOARD", () => {
      assert.strictEqual(can("ADMIN", memberTypesPermissions, "update"), true);
      assert.strictEqual(can("BOARD", memberTypesPermissions, "update"), true);
      assert.strictEqual(can("SECRETARY", memberTypesPermissions, "update"), false);
      assert.strictEqual(can("VIEWER", memberTypesPermissions, "update"), false);
    });
  });

  describe("Query Builders", () => {
    test("buildMemberWhere excludes soft-deleted members and builds search filters", () => {
      const where = buildMemberWhere({
        page: 1,
        pageSize: 10,
        skip: 0,
        take: 10,
        sort: "lastName",
        dir: "asc",
        q: "Mustermann",
        filters: { status: "ACTIVE", type: "ASIL", from: "2026-01-01", to: "2026-12-31" },
      });

      assert.ok(where.AND);
      const conditions = where.AND as Array<Record<string, unknown>>;
      assert.deepStrictEqual(conditions[0], { deletedAt: null });
      // search condition (OR)
      assert.ok(conditions.some((c) => "OR" in c));
      // status condition
      assert.ok(conditions.some((c) => c.status === "ACTIVE"));
      // type condition
      assert.ok(conditions.some((c) => c.type === "ASIL"));
      // date range condition
      assert.ok(conditions.some((c) => "joinDate" in c));
    });

    test("buildDuesWhere filters by year and excludes soft-deleted members", () => {
      const where = buildDuesWhere(
        {
          page: 1,
          pageSize: 10,
          skip: 0,
          take: 10,
          sort: "lastName",
          dir: "asc",
          q: "Max",
          filters: { status: "OPEN", type: "ASIL" },
        },
        2026,
      );

      assert.ok(where.AND);
      const conditions = where.AND as Array<Record<string, unknown>>;
      assert.deepStrictEqual(conditions[0], { year: 2026, member: { deletedAt: null } });
      assert.ok(conditions.some((c) => c.status === "OPEN"));
    });
  });
});
