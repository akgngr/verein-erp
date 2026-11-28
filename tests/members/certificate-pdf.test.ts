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
});
