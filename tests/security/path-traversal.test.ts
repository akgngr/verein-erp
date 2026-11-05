import test, { describe } from "node:test";
import assert from "node:assert/strict";

describe("Path Traversal Koruması", () => {
  test("resolveSafePath dışarı çıkan ve kontrol karakteri içeren yolları engeller", async () => {
    const { resolveSafePath } = await import("@/shared/files/storage");

    const maliciousPaths = [
      "../../../etc/passwd",
      "..\\..\\windows\\system32",
      "../../etc/passwd",
      "../etc/passwd",
      "./../etc/passwd",
      "../etc/passwd\0",
      "/etc/passwd",
      "/home/user/.ssh/id_rsa",
      "..",
      "../",
      "..\\",
      "..\t/etc/passwd",
      "..\n/etc/passwd",
    ];

    for (const candidate of maliciousPaths) {
      assert.throws(
        () => resolveSafePath(candidate),
        /Geçersiz depolama yolu|invalid/i,
        `Path traversal engellenmeli: ${candidate}`,
      );
    }
  });

  test("resolveSafePath güvenli yolları yükleme kökü içinde tutar", async () => {
    const { resolveSafePath, getUploadRoot } = await import("@/shared/files/storage");
    const root = getUploadRoot();

    for (const candidate of [
      "uploads/file.pdf",
      "2024/documents/report.pdf",
      "meetings/2024-001/protocol.pdf",
      "members/avatars/user-123.jpg",
      "accounting/invoices/2024/inv-001.pdf",
      "",
      ".",
      "....//report.pdf",
    ]) {
      const resolved = resolveSafePath(candidate);
      assert.ok(resolved === root || resolved.startsWith(root + "/"));
    }
  });

  test("sanitizeOriginalName yol ayırıcılarını ve markup etiketlerini kaldırır", async () => {
    const { sanitizeOriginalName } = await import("@/shared/files/validation");
    const maliciousNames = [
      "<script>alert('XSS')</script>.pdf",
      "file.jpg<script>",
      "../../../etc/passwd",
      "..\\..\\windows\\system32",
      "/etc/passwd",
      "file\0.pdf",
      "....file.pdf",
      ".hidden.pdf",
      "..",
      ".",
      "",
    ];

    for (const input of maliciousNames) {
      const result = sanitizeOriginalName(input);
      assert.ok(!result.includes("<") && !result.includes(">"));
      assert.ok(!result.includes(".."));
      assert.ok(!result.includes("/") && !result.includes("\\"));
      assert.ok(!result.includes("\0"));
    }
  });
});
