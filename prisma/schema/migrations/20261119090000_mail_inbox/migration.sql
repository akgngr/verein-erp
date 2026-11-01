-- CreateTable
CREATE TABLE "mail_inbox_settings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "host" TEXT,
    "port" INTEGER NOT NULL DEFAULT 993,
    "security" TEXT NOT NULL DEFAULT 'SSL',
    "username" TEXT,
    "passwordEncrypted" TEXT,
    "mailbox" TEXT NOT NULL DEFAULT 'INBOX',
    "lastUid" INTEGER,
    "uidValidity" TEXT,
    "lastFetchAt" TIMESTAMP(3),
    "lastError" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mail_inbox_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mail_inbox_messages" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "externalKey" TEXT NOT NULL,
    "messageId" TEXT,
    "fromAddress" TEXT,
    "fromName" TEXT,
    "subject" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL,
    "snippet" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mail_inbox_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mail_inbox_attachments" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "extension" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "storagePath" TEXT NOT NULL,
    "importedTo" TEXT,
    "importedAt" TIMESTAMP(3),

    CONSTRAINT "mail_inbox_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "mail_inbox_messages_externalKey_key" ON "mail_inbox_messages"("externalKey");

-- CreateIndex
CREATE INDEX "mail_inbox_messages_status_receivedAt_idx" ON "mail_inbox_messages"("status", "receivedAt");

-- CreateIndex
CREATE INDEX "mail_inbox_attachments_messageId_idx" ON "mail_inbox_attachments"("messageId");

-- AddForeignKey
ALTER TABLE "mail_inbox_attachments" ADD CONSTRAINT "mail_inbox_attachments_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "mail_inbox_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

