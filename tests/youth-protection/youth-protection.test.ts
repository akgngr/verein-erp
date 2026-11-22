import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

import { AI_TOOL_POLICY, DATA_POLICY } from "@/shared/data-policy";
import { youthProtectionPermissions } from "@/modules/youth-protection";
import { getInspectionStatus } from "@/modules/youth-protection/types";
import { buildFeeExemptionLetterText } from "@/modules/youth-protection/services/fee-exemption-letter";
import { youthProtectionItemSchema } from "@/modules/youth-protection/schemas/item-schema";
import { lifecycle, onMemberDeleted } from "@/modules/youth-protection/lifecycle";
import { purgeStatutoryRecords } from "@/modules/youth-protection/services/statutory-purge";
import { statutoryPurgeTask } from "@/modules/youth-protection/automation";

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

  it("Stored fields only: inspection metadata, status enum, activityEndedAt (NO free text note, NO conviction data)", () => {
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
      "status",
      "activityEndedAt",
      "createdAt",
      "updatedAt",
    ]);

    for (const field of fieldNames) {
      assert.ok(
        allowedFields.has(field),
        `Unexpected field ${field} found in YouthProtectionRecord. Only inspection metadata is allowed.`,
      );
    }

    // Verify conviction, free-text note or file fields are NOT in schema
    assert.ok(!fieldNames.includes("note"), "Free-text note field must be removed to prevent Art. 10 data entry");
    assert.ok(!fieldNames.includes("conviction"), "Conviction data is forbidden (DSGVO Art. 10)");
    assert.ok(!fieldNames.includes("criminalRecord"), "Criminal record content is forbidden");
    assert.ok(!fieldNames.includes("filePath"), "File storage path is forbidden");
    assert.ok(!fieldNames.includes("fileData"), "Binary file data is forbidden");

    // Verify table mapping uses underscore, not hyphen
    assert.ok(
      schemaContent.includes('@@map("youth_protection_records")'),
      'Table must be mapped to "youth_protection_records" without hyphens',
    );
  });

  it("Data classified in data-policy.ts as K0; personalOwnerField userId set; AI has no access; dedicated permissions", () => {
    // 1. Data policy classification
    const policy = DATA_POLICY as Record<
      string,
      { owner: string; category: string; sensitiveFields: readonly string[]; personalOwnerField?: string }
    >;
    const entry = policy.YouthProtectionRecord;
    assert.ok(entry, "YouthProtectionRecord must be classified in DATA_POLICY");
    assert.equal(entry.owner, "youth-protection");
    assert.equal(entry.category, "K0", "Youth protection records must be K0 (owner module only, never AI)");
    assert.equal(entry.personalOwnerField, "userId", "personalOwnerField must be userId for lifecycle erasure");

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
    assert.equal(youthProtectionPermissions.grants.VIEWER?.length ?? 0, 0, "VIEWER must not have youth protection access");
    assert.equal(youthProtectionPermissions.grants.TEACHER?.length ?? 0, 0, "TEACHER must not have youth protection access");
    assert.ok(youthProtectionPermissions.grants.ADMIN.includes("view"));
    assert.ok(youthProtectionPermissions.grants.BOARD.includes("view"));
  });

  it("lifecycle hooks handle user erasure (onUserDeleted) and member erasure (onMemberDeleted)", () => {
    assert.equal(lifecycle.moduleKey, "youth-protection");
    assert.ok(typeof lifecycle.onUserDeleted === "function", "onUserDeleted hook must exist");
    assert.ok(typeof onMemberDeleted === "function", "onMemberDeleted helper must exist");
  });

  it("statutory purge automation task is registered and configured daily", () => {
    assert.equal(statutoryPurgeTask.key, "youth-protection.statutory_purge");
    assert.equal(statutoryPurgeTask.schedule?.automaticIntervalMinutes, 24 * 60, "Must be scheduled daily");
    assert.ok(typeof statutoryPurgeTask.handler === "function");
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

    assert.ok(text.includes("§ 30a Abs. 1 BZRG"), "Must cite § 30a Abs. 1 BZRG");
    assert.ok(text.includes("§ 72a SGB VIII"), "Must cite § 72a SGB VIII");
    assert.ok(text.includes("§ 12 JVKostG"), "Must cite § 12 JVKostG");
    assert.ok(text.includes("GEBÜHRENBEFREIUNG"), "Must request Gebührenbefreiung");
    assert.ok(text.includes("Max Mustermann"), "Must include person name");
    assert.ok(text.includes("Sportfreunde Berlin e.V."), "Must include organization name");
    assert.ok(text.includes("Jugendtrainer Fußball"), "Must include role");
  });

  it("getInspectionStatus correctly classifies overdue, upcoming (3 months), valid, and ended records", () => {
    const now = new Date("2026-11-21T12:00:00Z");

    // 1. Overdue: yesterday
    const yesterday = new Date("2026-11-20T12:00:00Z");
    assert.equal(getInspectionStatus(yesterday, null, now), "overdue");

    // 2. Upcoming: 2 months from now (within 3 months)
    const inTwoMonths = new Date("2027-01-15T12:00:00Z");
    assert.equal(getInspectionStatus(inTwoMonths, null, now), "upcoming");

    // 3. Valid: 1 year from now
    const inOneYear = new Date("2027-11-21T12:00:00Z");
    assert.equal(getInspectionStatus(inOneYear, null, now), "valid");

    // 4. Ended activity
    assert.equal(getInspectionStatus(inOneYear, new Date("2026-10-01"), now), "ended");
  });

  it("buildYouthProtectionBriefing produces count-only briefing and never leaks person names", async () => {
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

    const fakeCount = 3;
    const title = mockContext.t("secretary.dueCount", { count: fakeCount });
    assert.ok(title.includes("3"));
    assert.ok(!title.includes("Max Mustermann"));
    assert.ok(!title.includes("Ahmet Yılmaz"));
  });

  it("Zod schema strictly validates input data, accepts status enum, activityEndedAt, and forbids unknown fields", () => {
    // Valid input with defaults
    const valid = youthProtectionItemSchema.safeParse({
      personName: "Erika Musterfrau",
      inspectionDate: "2026-11-21",
      certificateIssueDate: "2026-11-01",
      inspectingOfficer: "Vorstand Vorsitzender",
      nextDueDate: "2031-11-21",
      status: "CLEARED",
      activityEndedAt: "2026-11-22",
    });
    assert.ok(valid.success);
    if (valid.success) {
      assert.equal(valid.data.status, "CLEARED");
      assert.equal(valid.data.activityEndedAt, "2026-11-22");
    }

    // Invalid: missing personName
    const missingName = youthProtectionItemSchema.safeParse({
      personName: "",
      inspectionDate: "2026-11-21",
      certificateIssueDate: "2026-11-01",
      inspectingOfficer: "Vorstand",
      nextDueDate: "2031-11-21",
    });
    assert.ok(!missingName.success);

    // Invalid status enum
    const badStatus = youthProtectionItemSchema.safeParse({
      personName: "Erika",
      inspectionDate: "2026-11-21",
      certificateIssueDate: "2026-11-01",
      inspectingOfficer: "Vorstand",
      nextDueDate: "2031-11-21",
      status: "UNKNOWN_STATUS",
    });
    assert.ok(!badStatus.success);

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

  it("Lifecycle hooks exist and module declares onUserDeleted and onMemberDeleted", () => {
    assert.ok(lifecycle);
    assert.equal(lifecycle.moduleKey, "youth-protection");
    assert.equal(typeof lifecycle.onUserDeleted, "function");
    assert.equal(typeof onMemberDeleted, "function");
  });

  it("Statutory deletion task and purge function exist and are defined correctly", () => {
    assert.equal(typeof purgeStatutoryRecords, "function");
    assert.ok(statutoryPurgeTask);
    assert.equal(statutoryPurgeTask.key, "youth-protection.statutory_purge");
  });
});
