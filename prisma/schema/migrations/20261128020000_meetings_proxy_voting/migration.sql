-- AlterTable
ALTER TABLE "MeetingAttendee" ADD COLUMN "proxyToAttendeeId" TEXT;

-- CreateIndex
CREATE INDEX "MeetingAttendee_proxyToAttendeeId_idx" ON "MeetingAttendee"("proxyToAttendeeId");
