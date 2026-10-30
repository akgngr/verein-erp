-- AlterTable
ALTER TABLE "MeetingAttendee" ADD COLUMN     "memberId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "MeetingAttendee_meetingId_memberId_key" ON "MeetingAttendee"("meetingId", "memberId");

