-- AlterTable
ALTER TABLE "mail_inbox_messages" ADD COLUMN     "category" TEXT,
ADD COLUMN     "triagedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "mail_inbox_settings" ADD COLUMN     "triageEnabled" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "mail_triage_opt_ins" (
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mail_triage_opt_ins_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "mail_reply_drafts" (
    "id" TEXT NOT NULL,
    "inboxMessageId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "bodyEnc" TEXT,
    "sentAt" TIMESTAMP(3),
    "mailLogId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mail_reply_drafts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mail_triage_tasks" (
    "inboxMessageId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mail_triage_tasks_pkey" PRIMARY KEY ("inboxMessageId","userId")
);

-- CreateIndex
CREATE INDEX "mail_reply_drafts_userId_status_idx" ON "mail_reply_drafts"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "mail_reply_drafts_inboxMessageId_userId_key" ON "mail_reply_drafts"("inboxMessageId", "userId");

-- AddForeignKey
ALTER TABLE "mail_reply_drafts" ADD CONSTRAINT "mail_reply_drafts_inboxMessageId_fkey" FOREIGN KEY ("inboxMessageId") REFERENCES "mail_inbox_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mail_triage_tasks" ADD CONSTRAINT "mail_triage_tasks_inboxMessageId_fkey" FOREIGN KEY ("inboxMessageId") REFERENCES "mail_inbox_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

