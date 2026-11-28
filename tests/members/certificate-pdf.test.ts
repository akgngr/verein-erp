import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, test } from "node:test";

process.env.DATABASE_URL ??= "postgresql://unused/never-connected";
process.env.AUTH_SECRET ??= "test-members-certificate-pdf-secret-0123456789";

describe("Members — Membership Certificate & Card PDF (#588)", () => {
  test("certificate-pdf route bridge and handler exports are wired", () => {
    const root = process.cwd();
    assert.ok(
      fs.existsSync(path.join(root, "src/app/api/(modules)/members/[id]/certificate-pdf/route.ts")),
    );
    const serverTs = fs.readFileSync(path.join(root, "src/modules/members/server.ts"), "utf8");
    assert.match(serverTs, /exportMemberCertificatePdfHandler/);
    const actionsTs = fs.readFileSync(
      path.join(root, "src/modules/members/components/member-detail-actions.tsx"),
      "utf8",
    );
    assert.match(actionsTs, /certificate-pdf\?lang=/);
  });

  test("labels every real membership type and never certifies a class the member does not hold", async () => {
    const { CERTIFICATE_STRINGS } = await import("@/modules/members/pdf/certificate-strings");
    const types = ["ASIL", "ONURSAL", "FAHRI", "DESTEKCI"] as const;
    for (const lang of ["de", "tr"] as const) {
      const s = CERTIFICATE_STRINGS[lang];
      for (const type of types) {
        const label = s.types[type];
        assert.ok(label && label !== type, `${lang}.${type} has a translated label`);
      }
      // The introduction is shared by all classes, so it must not name one.
      for (const intro of [s.introActive, s.introInactive]) {
        assert.doesNotMatch(intro, /ordentlich|asıl/i, `${lang} introduction is class-neutral`);
      }
    }
    assert.equal(CERTIFICATE_STRINGS.de.types.ONURSAL, "Ehrenmitglied");
    assert.equal(CERTIFICATE_STRINGS.de.types.FAHRI, "Ehrenamtliches Mitglied");
  });
});

