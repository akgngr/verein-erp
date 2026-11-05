import test, { describe } from "node:test";
import assert from "node:assert/strict";

/**
 * Input Validation Güvenlik Testleri
 * 
 * AMAÇ: Kullanıcı girişlerinin doğru şekilde doğrulanmasını sağlamak
 * KAPSAM: Zod şemaları, form validasyonu, XSS ve SQL injection koruması
 */

describe("Input Validation Güvenliği", () => {
  describe("Login Şeması", () => {
    test("SQL injection girişimleri engellenir", async () => {
      const { loginSchema } = await import("@/modules/auth/schemas/login");
      
      const maliciousInputs = [
        // SQL Injection
        { email: "' OR '1'='1", password: "test" },
        { email: "test@test.com; DROP TABLE users", password: "test" },
        { email: "test@test.com", password: "password'; --" },
        { email: "' OR 1=1 --", password: "test" },
        { email: "admin'--", password: "test" },
        { email: "' UNION SELECT * FROM users --", password: "test" },
        
        // XSS
        { email: "<script>alert('XSS')</script>", password: "test" },
        { email: "test@test.com", password: "<img src=x onerror=alert(1)>" },
        { email: "<svg onload=alert(1)>", password: "test" },
        
        // Command Injection
        { email: "test; rm -rf /", password: "test" },
        { email: "test@test.com", password: "password; cat /etc/passwd" },
        { email: "test|cat /etc/passwd", password: "test" },
        
        // Path Traversal
        { email: "../../../etc/passwd", password: "test" },
        { email: "test@test.com", password: "..\\..\\windows\\system32" },
      ];
      
      for (const input of maliciousInputs) {
        const result = loginSchema.safeParse(input);
        assert.equal(result.success, false, `SQL injection/XSS engellenmeli: ${input.email}`);
      }
    });
    
    test("Geçerli girişler kabul edilir", async () => {
      const { loginSchema } = await import("@/modules/auth/schemas/login");
      
      const validInputs = [
        { email: "user@example.com", password: "SecurePass123" },
        { email: "test@test.com", password: "MyPassword123" },
        { email: "admin@domain.org", password: "AdminPass2024" },
      ];
      
      for (const input of validInputs) {
        const result = loginSchema.safeParse(input);
        assert.equal(result.success, true, `Geçerli giriş kabul edilmeli: ${input.email}`);
      }
    });
    
    test("E-posta formatı doğru doğrulanır", async () => {
      const { loginSchema } = await import("@/modules/auth/schemas/login");
      
      const invalidEmails = [
        "not-an-email",
        "missing@dot",
        "@missing-local.com",
        "spaces not@allowed.com",
        "special@chars!.com",
      ];
      
      for (const email of invalidEmails) {
        const result = loginSchema.safeParse({ email, password: "Test12345" });
        assert.equal(result.success, false, `Geçersiz e-posta engellenmeli: ${email}`);
      }
    });
  });
  
  describe("Parola Şeması", () => {
    test("Zayıf parolalar reddedilir", async () => {
      const { passwordSchema } = await import("@/shared/security/password");
      
      const weakPasswords = [
        // Çok kısa
        "12345678",       // 8 karakter (min 10)
        "short",          // Çok kısa
        
        // Büyük harf yok
        "password123",    // Sadece küçük harf + rakam
        "test12345",       // Sadece küçük harf + rakam
        
        // Küçük harf yok
        "PASSWORD123",    // Sadece büyük harf + rakam
        "TEST12345",       // Sadece büyük harf + rakam
        
        // Rakam yok
        "Password",       // 8 karakter, rakam yok
        "SecurePass",     // Rakam yok
        
        // Özel karakter yok (izlenmiyor, ama yine de zayıf)
        "Pass12345",      // 9 karakter
        "Test123456",     // 10 karakter
        
        // Tekrarlayan karakterler
        "1111111111",     // Sadece rakam
        "aaaaaaaaaa",     // Sadece harf
      ];
      
      for (const pwd of weakPasswords) {
        const result = passwordSchema.safeParse(pwd);
        assert.equal(result.success, false, `Zayıf parola reddedilmeli: ${pwd}`);
      }
    });
    
    test("Güçlü parolalar kabul edilir", async () => {
      const { passwordSchema } = await import("@/shared/security/password");
      
      const strongPasswords = [
        "SecurePass123",
        "ComplexP@ssw0rd",
        "MyP@ssw0rd2024",
        "StrongPassword123",
        "TestPassword2024",
      ];
      
      for (const pwd of strongPasswords) {
        const result = passwordSchema.safeParse(pwd);
        assert.equal(result.success, true, `Güçlü parola kabul edilmeli: ${pwd}`);
      }
    });
    
    test("Parola gereksinimleri doğru uygulanır", async () => {
      const { passwordSchema } = await import("@/shared/security/password");
      
      // Minimum 10 karakter
      const tooShort = "Aa1";
      const result1 = passwordSchema.safeParse(tooShort);
      assert.equal(result1.success, false);
      
      // En az 1 büyük harf
      const noUpper = "testpassword123";
      const result2 = passwordSchema.safeParse(noUpper);
      assert.equal(result2.success, false);
      
      // En az 1 küçük harf
      const noLower = "TESTPASSWORD123";
      const result3 = passwordSchema.safeParse(noLower);
      assert.equal(result3.success, false);
      
      // En az 1 rakam
      const noDigit = "TestPassword";
      const result4 = passwordSchema.safeParse(noDigit);
      assert.equal(result4.success, false);
      
      // Tüm gereksinimler karşılanıyor
      const valid = "TestPass123";
      const result5 = passwordSchema.safeParse(valid);
      assert.equal(result5.success, true);
    });
  });
  
  describe("XSS Koruması", () => {
    test("HTML tag'ları temizlenir", async () => {
      const { sanitizeOriginalName } = await import("@/shared/files/validation");
      
      const maliciousNames = [
        "<script>alert('XSS')</script>.pdf",
        "file.jpg<script>",
        "<img src=x onerror=alert(1)>.png",
        "..<script>..",
        "<!DOCTYPE html>.pdf",
        "<svg onload=alert(1)>.svg",
        "<body onload=alert(1)>.html",
      ];
      
      for (const name of maliciousNames) {
        const sanitized = sanitizeOriginalName(name);
        assert.ok(
          !sanitized.includes("<") &&
          !sanitized.includes(">") &&
          !sanitized.includes("script") &&
          !sanitized.includes("onerror") &&
          !sanitized.includes("onload"),
          `XSS temizlenmemiş: ${sanitized}`
        );
      }
    });
    
    test("JavaScript kodları temizlenir", async () => {
      const { sanitizeOriginalName } = await import("@/shared/files/validation");
      
      const jsNames = [
        "file.js",
        "malicious/javascript.js",
        "exploit.js.pdf",
      ];
      
      for (const name of jsNames) {
        const sanitized = sanitizeOriginalName(name);
        // .js uzantısı temizlenmez, sadece path traversal ve kontrol karakterleri
        assert.ok(!sanitized.includes(".."));
        assert.ok(!sanitized.includes("/"));
        assert.ok(!sanitized.includes("\\"));
      }
    });
  });
  
  describe("SQL Injection Koruması", () => {
    test("Zod şemaları SQL injection engeller", async () => {
      const { loginSchema } = await import("@/modules/auth/schemas/login");
      
      const sqlInjections = [
        "' OR '1'='1",
        "'; DROP TABLE users; --",
        "1' UNION SELECT * FROM passwords --",
        "admin'--",
        "' OR 1=1 --",
        "'; SELECT * FROM users WHERE '1'='1",
      ];
      
      for (const injection of sqlInjections) {
        const result = loginSchema.safeParse({ email: injection, password: "test" });
        assert.equal(result.success, false, `SQL injection engellenmeli: ${injection}`);
      }
    });
    
    test("Prisma ORM SQL injection'a karşı korur", async () => {
      // Prisma ORM parametreli sorgular kullanır, dolayısıyla SQL injection'a karşı korunur
      // Bu test, Prisma'nın raw query'lerinde bile parametreli sorgular kullandığını doğrular
      
      const { getDb } = await import("@/shared/db");
      const db = getDb();
      
      // SQL injection girişimi
      const maliciousInput = "' OR '1'='1";
      
      // Prisma raw query ile test - parametreli sorgu kullanılır
      const result = await db.$queryRaw`
        SELECT * FROM users WHERE email = ${maliciousInput}
      `;
      
      // Sonuç boş olmalı (güvenli)
      assert.equal(result.length, 0);
    });
  });
});
