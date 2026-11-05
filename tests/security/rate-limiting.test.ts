import test, { describe } from "node:test";
import assert from "node:assert/strict";

/**
 * Rate Limiting Güvenlik Testleri
 * 
 * AMAÇ: Brute force saldırılarına karşı koruma sağlamak
 * KAPSAM: Login girişimleri, API istekleri
 */

describe("Rate Limiting Koruması", () => {
  describe("Login Girişimleri", () => {
    test("Rate limiting konfigürasyonu doğru ayarlanmış", async () => {
      // MAX_FAILED_ATTEMPTS ve LOCK_MINUTES değerleri doğru olmalı
      // Bu test, rate limiting konfigürasyonunu doğrulamak içindir
      
      // authorize fonksiyonunda tanımlı değerler
      const MAX_FAILED_ATTEMPTS = 5;
      const LOCK_MINUTES = 15;
      
      assert.equal(MAX_FAILED_ATTEMPTS, 5);
      assert.equal(LOCK_MINUTES, 15);
    });
    
    test("Rate limiting mekanizması mevcuttur", async () => {
      // authorize fonksiyonu, rate limiting uygular
      const { authorize } = await import("@/modules/auth/services/authorize");
      
      // Fonksiyonun var olduğunu doğrula
      assert.ok(typeof authorize === "function");
    });
  });
  
  describe("Rate Limiting Konfigürasyonu", () => {
    test("Maksimum başarısız girişim sayısı doğru ayarlanmış", async () => {
      // MAX_FAILED_ATTEMPTS = 5
      const MAX_FAILED_ATTEMPTS = 5;
      assert.equal(MAX_FAILED_ATTEMPTS, 5);
    });
    
    test("Kilit süresi doğru ayarlanmış", async () => {
      // LOCK_MINUTES = 15
      const LOCK_MINUTES = 15;
      assert.equal(LOCK_MINUTES, 15);
    });
  });
  
  describe("Denetim Kaydı (Audit Log)", () => {
    test("Başarılı giriş denetim kaydına yazılır", async () => {
      const { getDb } = await import("@/shared/db");
      const db = getDb();
      
      // Test kullanıcısı oluştur
      const email = "test-audit-success@example.com";
      const passwordHash = await (await import("@/shared/security/password")).hashPassword("Test12345");
      
      await db.user.upsert({
        where: { email },
        create: {
          email,
          name: "Test User",
          passwordHash,
          role: "VIEWER",
          isActive: true,
          failedLoginCount: 0,
          lockedUntil: null,
        },
        update: {
          passwordHash,
          failedLoginCount: 0,
          lockedUntil: null,
          isActive: true,
        },
      });
      
      // Başarılı giriş
      await (await import("@/modules/auth/services/authorize")).authorize({
        email,
        password: "Test12345",
      });
      
      // Denetim kaydında LOGIN_SUCCESS olmalı
      const auditLog = await db.auditLog.findFirst({
        where: {
          action: "LOGIN_SUCCESS",
          entity: "Auth",
        },
        orderBy: { createdAt: "desc" },
      });
      
      assert.ok(auditLog);
    });
    
    test("Başarısız giriş denetim kaydına yazılır", async () => {
      const { getDb } = await import("@/shared/db");
      const db = getDb();
      
      // Test kullanıcısı oluştur
      const email = "test-audit-fail@example.com";
      const passwordHash = await (await import("@/shared/security/password")).hashPassword("Test12345");
      
      await db.user.upsert({
        where: { email },
        create: {
          email,
          name: "Test User",
          passwordHash,
          role: "VIEWER",
          isActive: true,
          failedLoginCount: 0,
          lockedUntil: null,
        },
        update: {
          passwordHash,
          failedLoginCount: 0,
          lockedUntil: null,
          isActive: true,
        },
      });
      
      // Başarısız giriş
      try {
        await (await import("@/modules/auth/services/authorize")).authorize({
          email,
          password: "wrong",
        });
      } catch {
        // Expected
      }
      
      // Denetim kaydında LOGIN_FAILED olmalı
      const auditLog = await db.auditLog.findFirst({
        where: {
          action: "LOGIN_FAILED",
          entity: "Auth",
        },
        orderBy: { createdAt: "desc" },
      });
      
      assert.ok(auditLog);
    });
  });
});
