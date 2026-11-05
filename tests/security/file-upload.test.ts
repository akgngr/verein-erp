import test, { describe } from "node:test";
import assert from "node:assert/strict";

/**
 * Dosya Upload Güvenlik Testleri
 * 
 * AMAÇ: Tehlikeli dosya türleri ve içeriklerinin engellenmesini sağlamak
 * KAPSAM: validateUpload fonksiyonu ve dosya tipi doğrulama
 */

describe("Dosya Upload Güvenliği", () => {
  test("Tehlikeli dosya türleri reddedilir", async () => {
    const { validateUpload } = await import("@/shared/files/validation");
    
    const dangerousFiles = [
      // Script dosyaları
      { name: "malicious.svg", mime: "image/svg+xml", ext: "svg", head: new Uint8Array([0x3C, 0x73, 0x76, 0x67]) },
      { name: "script.html", mime: "text/html", ext: "html", head: new Uint8Array([0x3C, 0x68, 0x74, 0x6D]) },
      { name: "virus.js", mime: "application/javascript", ext: "js", head: new Uint8Array([0x66, 0x75, 0x6E, 0x63]) },
      { name: "exploit.php", mime: "application/x-php", ext: "php", head: new Uint8Array([0x3F, 0x70, 0x68, 0x70]) },
      { name: "shell.sh", mime: "application/x-sh", ext: "sh", head: new Uint8Array([0x23, 0x21, 0x2F, 0x62]) },
      { name: "batch.bat", mime: "application/x-msdownload", ext: "bat", head: new Uint8Array([0x4D, 0x5A]) },
      { name: "vbs.vbs", mime: "text/vbscript", ext: "vbs", head: new Uint8Array([0x41, 0x74, 0x74, 0x72]) },
      
      // Yürütülebilir dosyalar
      { name: "virus.exe", mime: "application/x-msdownload", ext: "exe", head: new Uint8Array([0x4D, 0x5A]) },
      { name: "malware.dll", mime: "application/x-msdownload", ext: "dll", head: new Uint8Array([0x4D, 0x5A]) },
      { name: "payload.so", mime: "application/x-sharedlib", ext: "so", head: new Uint8Array([0x7F, 0x45, 0x4C, 0x46]) },
      
      // Konfigürasyon dosyaları
      { name: ".env", mime: "text/plain", ext: "env", head: new Uint8Array([0]) },
      { name: "config.yml", mime: "text/yaml", ext: "yml", head: new Uint8Array([0]) },
      { name: "settings.json", mime: "application/json", ext: "json", head: new Uint8Array([0]) },
      
      // Veritabanı dosyaları
      { name: "backup.sql", mime: "application/sql", ext: "sql", head: new Uint8Array([0]) },
      { name: "dump.db", mime: "application/x-sqlite3", ext: "db", head: new Uint8Array([0]) },
      
      // Arşiv dosyaları (izinsiz)
      { name: "archive.zip", mime: "application/zip", ext: "zip", head: new Uint8Array([0x50, 0x4B, 0x03, 0x04]) },
      { name: "backup.tar", mime: "application/x-tar", ext: "tar", head: new Uint8Array([0]) },
      { name: "compressed.rar", mime: "application/x-rar-compressed", ext: "rar", head: new Uint8Array([0]) },
    ];
    
    for (const file of dangerousFiles) {
      const result = validateUpload({
        file: {
          originalName: file.name,
          declaredMime: file.mime,
          size: 1024,
          head: file.head,
        },
        allowedExtensions: ["pdf", "jpg", "png"],
        maxBytes: 10 * 1024 * 1024,
      });
      
      assert.equal(result.ok, false, `Tehlikeli dosya reddedilmeli: ${file.name}`);
      assert.ok(
        result.error.includes("typeNotAllowed") || 
        result.error.includes("contentMismatch"),
        `Beklenmeyen hata: ${result.error}`
      );
    }
  });
  
  test("Magic byte uyumsuzluğu reddedilir", async () => {
    const { validateUpload } = await import("@/shared/files/validation");
    
    // PDF uzantılı ama JPEG magic byte'lı dosya
    const result = validateUpload({
      file: {
        originalName: "fake.pdf",
        declaredMime: "application/pdf",
        size: 1024,
        head: new Uint8Array([0xFF, 0xD8, 0xFF]), // JPEG signature
      },
      allowedExtensions: ["pdf"],
      maxBytes: 10 * 1024 * 1024,
    });
    
    assert.equal(result.ok, false);
    assert.ok(result.error.includes("contentMismatch"));
  });
  
  test("MIME type uyumsuzluğu reddedilir", async () => {
    const { validateUpload } = await import("@/shared/files/validation");
    
    // PNG uzantılı ama PDF MIME'li dosya
    const result = validateUpload({
      file: {
        originalName: "fake.png",
        declaredMime: "application/pdf",
        size: 1024,
        head: new Uint8Array([0x89, 0x50, 0x4E, 0x47]), // PNG signature
      },
      allowedExtensions: ["png"],
      maxBytes: 10 * 1024 * 1024,
    });
    
    assert.equal(result.ok, false);
    assert.ok(result.error.includes("contentMismatch"));
  });
  
  test("Dosya boyutu sınırı aşımı reddedilir", async () => {
    const { validateUpload } = await import("@/shared/files/validation");
    
    const result = validateUpload({
      file: {
        originalName: "large.pdf",
        declaredMime: "application/pdf",
        size: 21 * 1024 * 1024, // 21MB (limit 20MB)
        head: new Uint8Array([0x25, 0x50, 0x44, 0x46]), // PDF signature
      },
      allowedExtensions: ["pdf"],
      maxBytes: 20 * 1024 * 1024, // 20MB
    });
    
    assert.equal(result.ok, false);
    assert.ok(result.error.includes("tooLarge"));
  });
  
  test("Boş dosya reddedilir", async () => {
    const { validateUpload } = await import("@/shared/files/validation");
    
    const result = validateUpload({
      file: {
        originalName: "empty.pdf",
        declaredMime: "application/pdf",
        size: 0,
        head: new Uint8Array([]),
      },
      allowedExtensions: ["pdf"],
      maxBytes: 10 * 1024 * 1024,
    });
    
    assert.equal(result.ok, false);
    assert.ok(result.error.includes("empty"));
  });
  
  test("Geçerli dosyalar kabul edilir", async () => {
    const { validateUpload } = await import("@/shared/files/validation");
    
    const validFiles = [
      {
        name: "document.pdf",
        mime: "application/pdf",
        head: new Uint8Array([0x25, 0x50, 0x44, 0x46]), // %PDF
        ext: "pdf"
      },
      {
        name: "image.jpg",
        mime: "image/jpeg",
        head: new Uint8Array([0xFF, 0xD8, 0xFF]), // JPEG
        ext: "jpg"
      },
      {
        name: "screenshot.png",
        mime: "image/png",
        head: new Uint8Array([0x89, 0x50, 0x4E, 0x47]), // PNG
        ext: "png"
      },
    ];
    
    for (const file of validFiles) {
      const result = validateUpload({
        file: {
          originalName: file.name,
          declaredMime: file.mime,
          size: 1024,
          head: file.head,
        },
        allowedExtensions: ["pdf", "jpg", "png"],
        maxBytes: 10 * 1024 * 1024,
      });
      
      assert.equal(result.ok, true, `Geçerli dosya kabul edilmeli: ${file.name}`);
    }
  });
});
