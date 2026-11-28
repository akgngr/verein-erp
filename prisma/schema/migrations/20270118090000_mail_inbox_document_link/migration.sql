-- AlterTable
ALTER TABLE "mail_inbox_messages" ADD COLUMN     "documentImportStartedAt" TIMESTAMP(3),
ADD COLUMN     "importedDocumentId" TEXT;
