import test, { describe } from "node:test";
import assert from "node:assert/strict";

/**
 * Path Traversal Güvenlik Testleri
 * 
 * AMAÇ: Dosya yol manipülasyon saldırılarına karşı koruma sağlamak
 * KAPSAM: resolveSafePath fonksiyonu ve dosya işlemleri
 */

describe("Path Traversal Koruması", () => {
  test("resolveSafePath tehlikeli yolları engeller", async () => {
    const { resolveSafePath } = await import("@/shared/files/storage");
    
    const maliciousPaths = [
      // Klasik path traversal girişimleri
      "../../../etc/passwd",
      "..\\..\\windows\\system32",
      "../../etc/passwd",
      "../etc/passwd",
      "./../etc/passwd",
      
      // URL encoding ile
      "..%2F..%2Fetc%2Fpasswd",
      "%2e%2e%2fetc%2fpasswd",
      
      // Null byte injection
      "../etc/passwd\0",
      
      // Çoklu nokta
      "....//....//etc/passwd",
      ".....//etc/passwd",
      
      // Kök dizin erişimi
      "/etc/passwd",
      "/home/user/.ssh/id_rsa",
      "C:\\Windows\\System32\\config",
      
      // Mevcut dizin
      "../",
      "..",
      ".",
      "./",
      
      // Boşluk ve özel karakterler
      ".. /etc/passwd",
      "..\t/etc/passwd",
      "..\n/etc/passwd",
    ];
    
    for (const path of maliciousPaths) {
      try {
        resolveSafePath(path);
        assert.fail(`Path traversal engellenmedi: ${path}`);
      } catch (error) {
        const err = error as Error;
        assert.ok(
          err.message.includes("Geçersiz depolama yolu") ||
          err.message.includes("invalid"),
          `Beklenmeyen hata mesajı: ${err.message}`
        );
      }
    }
  });
  
  test("resolveSafePath güvenli yolları kabul eder", async () => {
    const { resolveSafePath, getUploadRoot } = await import("@/shared/files/storage");
    
    const safePaths = [
      "uploads/file.pdf",
      "2024/documents/report.pdf",
      "meetings/2024-001/protocol.pdf",
      "members/avatars/user-123.jpg",
      "accounting/invoices/2024/inv-001.pdf",
      "", // Boş yol
      ".", // Mevcut dizin (göreli)
    ];
    
    for (const path of safePaths) {
      const resolved = resolveSafePath(path);
      assert.ok(
        resolved.startsWith(getUploadRoot()),
        `Güvenli yol UPLOAD_DIR dışında: ${resolved}`
      );
    }
  });
  
  test("resolveSafePath UPLOAD_DIR sınırları içinde kalır", async () => {
    const { resolveSafePath, getUploadRoot } = await import("@/shared/files/storage");
    
    const root = getUploadRoot();
    
    // Normal yol
    const normalPath = resolveSafePath("test/file.txt");
    assert.ok(normalPath.startsWith(root));
    
    // Nested yol
    const nestedPath = resolveSafePath("a/b/c/d/file.txt");
    assert.ok(nestedPath.startsWith(root));
    
    // Boş yol
    const emptyPath = resolveSafePath("");
    assert.equal(emptyPath, root);
  });
  
  test("sanitizeOriginalName tehlikeli karakterleri temizler", async () => {
    const { sanitizeOriginalName } = await import("@/shared/files/validation");
    
    const maliciousNames = [
      { input: "<script>alert('XSS')</script>.pdf", expected: "alert('XSS').pdf" },
      { input: "file; rm -rf /.pdf", expected: "file; rm -rf .pdf" },
      { input: "file|cat /etc/passwd.pdf", expected: "file|cat /etc/passwd.pdf" },
      { input: "file&&rm -rf.pdf", expected: "file&&rm -rf.pdf" },
      { input: "../../../etc/passwd", expected: "etc/passwd" },
      { input: "..\\..\\windows\\system32", expected: "windows/system32" },
      { input: "/etc/passwd", expected: "etc/passwd" },
      { input: "file\0.pdf", expected: "file.pdf" },
      { input: "file\x00.pdf", expected: "file.pdf" },
      { input: "....file.pdf", expected: "file.pdf" },
      { input: ".hidden.pdf", expected: ".hidden.pdf" },
      { input: "..", expected: "dosya" },
      { input: ".", expected: "dosya" },
      { input: "", expected: "dosya" },
    ];
    
    for (const { input, expected } of maliciousNames) {
      const result = sanitizeOriginalName(input);
      assert.ok(
        !result.includes("..") &&
        !result.includes("/") &&
        !result.includes("\\") &&
        !result.includes("\0"),
        `Temizlenmemiş karakterler: ${result}`
      );
    }
  });
});
