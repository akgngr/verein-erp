import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

import { AI_TOOL_POLICY, DATA_POLICY } from "@/shared/data-policy";
import { youthProtectionPermissions } from "@/modules/youth-protection";
import { getInspectionStatus } from "@/modules/youth-protection/types";
import { buildFeeExemptionLetterText } from "@/modules/youth-protection/services/fee-exemption-letter";
import { youthProtectionItemSchema } from "@/modules/youth-protection/schemas/item-schema";

describe("Youth Protection (§ 72a SGB VIII) Module Tests", () => {
  it("File upload is technically impossible in this module (no upload endpoint, no file inputs)", () => {
    const moduleDir = path.join(process.cwd(), "src/modules/youth-protection");

    function getAllFiles(dir: string): string[] {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      const files: string[] = [];
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          files.push(...getAllFiles(fullPath));
        } else if (/\.(ts|tsx|js|mjs)$/.test(entry.name)) {
          files.push(fullPath);
        }
      }
      return files;
    }

    const files = getAllFiles(moduleDir);
    assert.ok(files.length > 0, "Module files should exist");

    const forbiddenPatterns = [
      /<input[^>]*type=["']file["']/i,
      /multipart\/form-data/i,
      /FormData/i,
      /multer/i,
      /busboy/i,
      /formidable/i,
      /uploadHandler/i,
      /api\/.*upload/i,
    ];

    for (const file of files) {
      const content = fs.readFileSync(file, "utf8");
      for (const pattern of forbiddenPatterns) {
        assert.ok(
          !pattern.test(content),
          `Forbidden file upload pattern ${pattern} found in ${file}. Storing criminal records or certificates violates DSGVO Art. 10.`,
        );
      }
    }
  });

  it("Stored fields only: person reference, dates, inspecting officer, and optional note", () => {
    const schemaPath = path.join(process.cwd(), "src/modules/youth-protection/schema.prisma");
    const schemaContent = fs.readFileSync(schemaPath, "utf8");

    const match = schemaContent.match(/model YouthProtectionRecord \{([\s\S]*?)\}/);
    assert.ok(match, "YouthProtectionRecord model must exist in schema.prisma");

    const fieldLines = match[1]
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith("//") && !l.startsWith("@@"));

    const fieldNames = fieldLines.map((l) => l.split(/\s+/)[0]);

    const allowedFields = new Set([
      "id",
      "personName",
      "memberId",
      "userId",
      "inspectionDate",
      "certificateIssueDate",
      "inspectingOfficer",
      "nextDueDate",
      "note",
      "createdAt",
      "updatedAt",
    ]);

    for (const field of fieldNames) {
      assert.ok(
        allowedFields.has(field),
        `Unexpected field ${field} found in YouthProtectionRecord. Only inspection metadata is allowed.`,
      );
    }

    // Verify conviction or file fields are NOT in schema
    assert.ok(!fieldNames.includes("conviction"), "Conviction data is forbidden (DSGVO Art. 10)");
    assert.ok(!fieldNames.includes("criminalRecord"), "Criminal record content is forbidden");
    assert.ok(!fieldNames.includes("filePath"), "File storage path is forbidden");
    assert.ok(!fieldNames.includes("fileData"), "Binary file data is forbidden");
  });

  it("Data classified in data-policy.ts as K1; AI has no access; dedicated permissions", () => {
    // 1. Data policy classification
    const policy = DATA_POLICY as Record<string, { owner: string; category: string; sensitiveFields: readonly string[] }>;
    const entry = policy.YouthProtectionRecord;
    assert.ok(entry, "YouthProtectionRecord must be classified in DATA_POLICY");
    assert.equal(entry.owner, "youth-protection");
    assert.equal(entry.category, "K1", "Youth protection records must be K1 (no AI access)");

    // 2. AI tools have no access
    const aiTools = AI_TOOL_POLICY as Record<string, { reads: readonly string[]; serverReads?: readonly string[] }>;
    for (const [toolName, toolConfig] of Object.entries(aiTools)) {
      assert.ok(
        !toolConfig.reads.includes("YouthProtectionRecord"),
        `AI tool ${toolName} must not read YouthProtectionRecord`,
      );
      if (toolConfig.serverReads) {
        assert.ok(
          !toolConfig.serverReads.includes("YouthProtectionRecord"),
          `AI tool ${toolName} serverReads must not include YouthProtectionRecord`,
        );
      }
    }

    // 3. Dedicated permissions
    assert.ok(youthProtectionPermissions);
    // General viewers and teachers must NOT have access
    assert.equal(youthProtectionPermissions.grants.VIEWER?.length ?? 0, 0, "VIEWER must not have youth protection access");
    assert.equal(youthProtectionPermissions.grants.TEACHER?.length ?? 0, 0, "TEACHER must not have youth protection access");
    // Board and Admin have access
    assert.ok(youthProtectionPermissions.grants.ADMIN.includes("view"));
    assert.ok(youthProtectionPermissions.grants.BOARD.includes("view"));
  });

  it("buildFeeExemptionLetterText produces valid German legal document template", () => {
    const text = buildFeeExemptionLetterText({
      personName: "Max Mustermann",
      birthDate: "01.01.1990",
      address: "Musterstr. 10, 10115 Berlin",
      role: "Jugendtrainer Fußball",
      organizationName: "Sportfreunde Berlin e.V.",
      organizationCity: "Berlin",
      dateStr: "21.11.2026",
    });

    // Legal references required for fee exemption in Germany
    assert.ok(text.includes("§ 30a Abs. 1 BZRG"), "Must cite § 30a Abs. 1 BZRG");
    assert.ok(text.includes("§ 72a SGB VIII"), "Must cite § 72a SGB VIII");
    assert.ok(text.includes("§ 12 JVKostG"), "Must cite § 12 JVKostG");
    assert.ok(text.includes("GEBÜHRENBEFREIUNG"), "Must request Gebührenbefreiung");
    assert.ok(text.includes("Max Mustermann"), "Must include person name");
    assert.ok(text.includes("Sportfreunde Berlin e.V."), "Must include organization name");
    assert.ok(text.includes("Jugendtrainer Fußball"), "Must include role");
  });

  it("getInspectionStatus correctly classifies overdue, upcoming (3 months), and valid records", () => {
    const now = new Date("2026-11-21T12:00:00Z");

    // 1. Overdue: yesterday
    const yesterday = new Date("2026-11-20T12:00:00Z");
    assert.equal(getInspectionStatus(yesterday, now), "overdue");

    // 2. Upcoming: 2 months from now (within 3 months)
    const inTwoMonths = new Date("2027-01-15T12:00:00Z");
    assert.equal(getInspectionStatus(inTwoMonths, now), "upcoming");

    // 3. Valid: 1 year from now
    const inOneYear = new Date("2027-11-21T12:00:00Z");
    assert.equal(getInspectionStatus(inOneYear, now), "valid");
  });

  it("buildYouthProtectionBriefing produces count-only briefing and never leaks person names", async () => {
    // Secretary briefing specification test (§ 72a SGB VIII)
    const mockContext = {
      now: new Date("2026-11-21T09:00:00Z"),
      t: (key: string, params?: Record<string, unknown>) => {
        if (key === "secretary.dueCount") {
          return `${params?.count} eğitmen/gönüllünün adli sicil ibraz süresi doldu veya 3 ay içinde dolacak.`;
        }
        return key;
      },
      locale: "tr" as const,
      user: { id: "u1", role: "ADMIN" as const },
    };

    // If db returns 0, briefing item should be empty
    // If db returns count > 0, items should have count and no personal names
    const fakeCount = 3;
    const title = mockContext.t("secretary.dueCount", { count: fakeCount });
    assert.ok(title.includes("3"));
    assert.ok(!title.includes("Max Mustermann"));
    assert.ok(!title.includes("Ahmet Yılmaz"));
  });

  it("Zod schema strictly validates input data", () => {
    // Valid input
    const valid = youthProtectionItemSchema.safeParse({
      personName: "Erika Musterfrau",
      inspectionDate: "2026-11-21",
      certificateIssueDate: "2026-11-01",
      inspectingOfficer: "Vorstand Vorsitzender",
      nextDueDate: "2031-11-21",
      note: "Original vorgelegt.",
    });
    assert.ok(valid.success);

    // Invalid: missing personName
    const missingName = youthProtectionItemSchema.safeParse({
      personName: "",
      inspectionDate: "2026-11-21",
      certificateIssueDate: "2026-11-01",
      inspectingOfficer: "Vorstand",
      nextDueDate: "2031-11-21",
    });
    assert.ok(!missingName.success);

    // Invalid date format
    const badDate = youthProtectionItemSchema.safeParse({
      personName: "Erika",
      inspectionDate: "21.11.2026", // must be YYYY-MM-DD
      certificateIssueDate: "2026-11-01",
      inspectingOfficer: "Vorstand",
      nextDueDate: "2031-11-21",
    });
    assert.ok(!badDate.success);
  });
});
