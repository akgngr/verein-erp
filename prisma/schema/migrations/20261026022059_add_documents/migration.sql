-- CreateEnum
CREATE TYPE "DocumentDirection" AS ENUM ('INCOMING', 'OUTGOING');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'COMPLETED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "DeliveryMethod" AS ENUM ('POST', 'EMAIL', 'HAND', 'COURIER', 'KEP', 'OTHER');

-- CreateTable
CREATE TABLE "DocumentCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentCounter" (
    "direction" "DocumentDirection" NOT NULL,
    "year" INTEGER NOT NULL,
    "lastSeq" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "DocumentCounter_pkey" PRIMARY KEY ("direction","year")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "direction" "DocumentDirection" NOT NULL,
    "year" INTEGER NOT NULL,
    "sequence" INTEGER NOT NULL,
    "registryNumber" TEXT NOT NULL,
    "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "documentDate" DATE NOT NULL,
    "counterparty" TEXT NOT NULL,
    "referenceNumber" TEXT,
    "subject" TEXT NOT NULL,
    "summary" TEXT,
    "deliveryMethod" "DeliveryMethod",
    "status" "DocumentStatus" NOT NULL DEFAULT 'OPEN',
    "dueDate" DATE,
    "categoryId" TEXT,
    "assigneeId" TEXT,
    "assigneeLabel" TEXT,
    "replyToId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdByLabel" TEXT NOT NULL,
    "updatedById" TEXT,
    "updatedByLabel" TEXT,
    "deletedAt" TIMESTAMP(3),
    "deletedById" TEXT,
    "deletedByLabel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentFile" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "storedName" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "uploadedByLabel" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "DocumentFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentNote" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "authorLabel" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DocumentCategory_name_key" ON "DocumentCategory"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Document_registryNumber_key" ON "Document"("registryNumber");

-- CreateIndex
CREATE INDEX "Document_direction_idx" ON "Document"("direction");

-- CreateIndex
CREATE INDEX "Document_status_idx" ON "Document"("status");

-- CreateIndex
CREATE INDEX "Document_documentDate_idx" ON "Document"("documentDate");

-- CreateIndex
CREATE INDEX "Document_registeredAt_idx" ON "Document"("registeredAt");

-- CreateIndex
CREATE INDEX "Document_dueDate_idx" ON "Document"("dueDate");

-- CreateIndex
CREATE INDEX "Document_categoryId_idx" ON "Document"("categoryId");

-- CreateIndex
CREATE INDEX "Document_assigneeId_idx" ON "Document"("assigneeId");

-- CreateIndex
CREATE INDEX "Document_deletedAt_idx" ON "Document"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Document_direction_year_sequence_key" ON "Document"("direction", "year", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentFile_storedName_key" ON "DocumentFile"("storedName");

-- CreateIndex
CREATE INDEX "DocumentFile_documentId_idx" ON "DocumentFile"("documentId");

-- CreateIndex
CREATE INDEX "DocumentNote_documentId_createdAt_idx" ON "DocumentNote"("documentId", "createdAt");

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "DocumentCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_replyToId_fkey" FOREIGN KEY ("replyToId") REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentFile" ADD CONSTRAINT "DocumentFile_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentNote" ADD CONSTRAINT "DocumentNote_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;
