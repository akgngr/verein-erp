import test, { describe } from "node:test";
import assert from "node:assert/strict";

import { SESSION_MAX_AGE_SECONDS, tokenToSessionUser } from "@/modules/auth/services/session";

describe("Session Güvenliği", () => {
  test("oturum süresi sekiz saat ile sınırlandırılır", () => {
    assert.equal(SESSION_MAX_AGE_SECONDS, 8 * 60 * 60);
  });

  test("kimlik veya rol bilgisi eksik JWT oturuma dönüştürülmez", () => {
    assert.equal(tokenToSessionUser({ role: "VIEWER" }), null);
    assert.equal(tokenToSessionUser({ id: "user-1" }), null);
  });

  test("JWT claim alanları güvenli varsayılanlarla SessionUser'a eşlenir", () => {
    assert.deepEqual(
      tokenToSessionUser({
        id: "user-1",
        name: "Test User",
        email: "test@example.com",
        role: "VIEWER",
      }),
      {
        id: "user-1",
        name: "Test User",
        email: "test@example.com",
        role: "VIEWER",
        mustChangePassword: true,
      },
    );
  });

  test("parola değiştirme bayrağı token'dan doğru aktarılır", () => {
    const user = tokenToSessionUser({
      id: "user-1",
      role: "VIEWER",
      mustChangePassword: false,
    });
    assert.equal(user?.mustChangePassword, false);
  });
});
