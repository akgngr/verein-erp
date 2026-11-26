-- #603: "Sign out all devices" counter (mixed into the JWT session version) and the purpose of one-time
-- password links (INVITE = admin invitation, RESET = self-service password reset).
ALTER TABLE "User" ADD COLUMN "sessionEpoch" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "user_invitations" ADD COLUMN "purpose" TEXT NOT NULL DEFAULT 'INVITE';
