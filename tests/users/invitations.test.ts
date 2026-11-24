/** Invitation links (Kassenprüfer / tax advisor): one-time, 72 h, hash-only, no password or finance data in mail. */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import test, { describe } from "node:test";

import { getDb } from "@/shared/db";

describe("invitation (pure)", () => {
  test("link is https-only on the app origin; mail has only the link", async () => {
    const { invitationLink, inviteMail } = await import("@/modules/users/services/invitations");
    assert.equal(invitationLink("https://erp.example.de/x", "tok"), "https://erp.example.de/davet/tok");
    assert.equal(invitationLink("http://erp.example.de", "tok"), null);
    assert.equal(invitationLink("not a url", "tok"), null);
    const mail = inviteMail("de", { name: "Pat", link: "https://erp.example.de/davet/tok", expiresAt: new Date("2031-01-04T10:00:00Z") });
    assert.match(mail.text, /https:\/\/erp\.example\.de\/davet\/tok/);
    assert.doesNotMatch(mail.text, /passwor[dt]:|€|EUR/i);
  });

  test("create form: invite needs no password, password mode enforces the password policy", async () => {
    const { userCreateSchema } = await import("@/modules/users/schemas/user");
    const base = { name: "Pat", email: "pat@example.test", role: "AUDITOR" };
    assert.equal(userCreateSchema.safeParse({ ...base, setupMode: "invite" }).success, true, "invite needs no password");
    assert.equal(userCreateSchema.safeParse({ ...base }).success, false, "mode must be chosen explicitly");
    assert.equal(userCreateSchema.safeParse({ ...base, setupMode: "password" }).success, false);
    assert.equal(userCreateSchema.safeParse({ ...base, setupMode: "password", password: "short" }).success, false);
    assert.equal(userCreateSchema.safeParse({ ...base, setupMode: "password", password: "Sehr-sicheres-Passwort-2031!" }).success, true);
    assert.equal(userCreateSchema.safeParse({ ...base, setupMode: "magic" }).success, false);
  });

  test("helper that sends mail is not a server action (no client-callable mail sender)", () => {
    assert.doesNotMatch(fs.readFileSync("src/modules/users/services/invitation-mail.ts", "utf8"), /"use server"/);
    assert.doesNotMatch(fs.readFileSync("src/modules/users/actions/invitations.ts", "utf8"), /export async function sendInvitationTo/);
  });

  test("auth gate lets /davet/* through without a session", () => {
    assert.match(fs.readFileSync("src/modules/auth/auth.config.ts", "utf8"), /path\.startsWith\("\/davet\/"\)\) return true/);
  });
});

const enabled = Boolean(process.env.AI_TEST_DATABASE_URL);
if (enabled && process.env.DATABASE_URL !== process.env.AI_TEST_DATABASE_URL) throw new Error("AI_TEST_DATABASE_URL must match the isolated DATABASE_URL");

test("db: one-time use, expiry, revoke on re-invite, inactive user, hash-only storage", { skip: !enabled }, async () => {
  const { createInvitation, acceptInvitation, findUsableInvitation } = await import("@/modules/users/services/invitations");
  const db = getDb();
  const user = await db.user.create({ data: { name: "Invitee", email: `${randomUUID()}@invite.example.test`, passwordHash: "x", role: "AUDITOR", isActive: true } });
  try {
    const now = new Date("2031-01-01T10:00:00Z");
    const first = await createInvitation(user.id, "admin", now);
    assert.equal(await db.userInvitation.count({ where: { tokenHash: first.token } }), 0, "raw token never stored");
    const second = await createInvitation(user.id, "admin", now);
    assert.equal(await findUsableInvitation(first.token, now), null, "re-invite revokes the older link");
    assert.equal((await findUsableInvitation(second.token, now))?.userId, user.id);
    assert.equal(await findUsableInvitation(second.token, new Date(now.getTime() + 73 * 3_600_000)), null, "expired after 72 h");
    await acceptInvitation(second.token, "Sehr-sicheres-Passwort-2031!", now);
    const updated = await db.user.findUniqueOrThrow({ where: { id: user.id } });
    assert.notEqual(updated.passwordHash, "x");
    assert.equal(updated.mustChangePassword, false);
    await assert.rejects(acceptInvitation(second.token, "Sehr-sicheres-Passwort-2031!", now), /invalid/, "second use fails");
    const third = await createInvitation(user.id, "admin", now);
    await db.user.update({ where: { id: user.id }, data: { isActive: false } });
    assert.equal(await findUsableInvitation(third.token, now), null, "inactive user cannot accept");
    assert.equal(await findUsableInvitation("short", now), null);
  } finally {
    await db.userInvitation.deleteMany({ where: { userId: user.id } });
    await db.user.delete({ where: { id: user.id } });
  }
});
