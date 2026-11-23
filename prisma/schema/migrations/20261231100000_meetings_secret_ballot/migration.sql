-- RFC-004 aşama 3 (#522): yüz yüze gizli oylama. Yalnız yeni tablolar; mevcut veriye dokunmaz.
-- CreateEnum
CREATE TYPE "MeetingVoteStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateTable
CREATE TABLE "MeetingVote" (
    "id" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "agendaItemId" TEXT,
    "question" TEXT NOT NULL,
    "options" TEXT[],
    "minBallots" INTEGER NOT NULL DEFAULT 5,
    "minBallotsReason" TEXT,
    "status" "MeetingVoteStatus" NOT NULL DEFAULT 'OPEN',
    "totals" JSONB,
    "ballotCount" INTEGER NOT NULL DEFAULT 0,
    "ballotHash" TEXT,
    "receipts" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "retainUntil" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdByLabel" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MeetingVote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MeetingVoteEligibility" (
    "voteId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "weight" INTEGER NOT NULL DEFAULT 1,
    "usedAt" TIMESTAMP(3),

    CONSTRAINT "MeetingVoteEligibility_pkey" PRIMARY KEY ("voteId","memberId")
);

-- CreateTable
CREATE TABLE "MeetingVoteCredential" (
    "credentialHash" TEXT NOT NULL,
    "voteId" TEXT NOT NULL,
    "weight" INTEGER NOT NULL DEFAULT 1,
    "spent" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "MeetingVoteCredential_pkey" PRIMARY KEY ("credentialHash")
);

-- CreateTable
CREATE TABLE "MeetingVoteBallot" (
    "id" TEXT NOT NULL,
    "voteId" TEXT NOT NULL,
    "choice" TEXT NOT NULL,
    "weight" INTEGER NOT NULL DEFAULT 1,
    "batch" INTEGER NOT NULL DEFAULT 1,
    "ballotNonce" TEXT NOT NULL,

    CONSTRAINT "MeetingVoteBallot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MeetingVote_meetingId_idx" ON "MeetingVote"("meetingId");

-- CreateIndex
CREATE INDEX "MeetingVote_status_retainUntil_idx" ON "MeetingVote"("status", "retainUntil");

-- CreateIndex
CREATE INDEX "MeetingVoteCredential_voteId_idx" ON "MeetingVoteCredential"("voteId");

-- CreateIndex
CREATE UNIQUE INDEX "MeetingVoteBallot_ballotNonce_key" ON "MeetingVoteBallot"("ballotNonce");

-- CreateIndex
CREATE INDEX "MeetingVoteBallot_voteId_idx" ON "MeetingVoteBallot"("voteId");

-- AddForeignKey
ALTER TABLE "MeetingVote" ADD CONSTRAINT "MeetingVote_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingVoteEligibility" ADD CONSTRAINT "MeetingVoteEligibility_voteId_fkey" FOREIGN KEY ("voteId") REFERENCES "MeetingVote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingVoteCredential" ADD CONSTRAINT "MeetingVoteCredential_voteId_fkey" FOREIGN KEY ("voteId") REFERENCES "MeetingVote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingVoteBallot" ADD CONSTRAINT "MeetingVoteBallot_voteId_fkey" FOREIGN KEY ("voteId") REFERENCES "MeetingVote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

