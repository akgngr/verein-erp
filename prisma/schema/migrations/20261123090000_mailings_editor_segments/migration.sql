-- AlterTable
ALTER TABLE "mailings_campaigns" ADD COLUMN     "bodyHtml" TEXT;

-- CreateTable
CREATE TABLE "mailings_segments" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "filter" JSONB NOT NULL DEFAULT '{}',
    "createdById" TEXT NOT NULL,
    "createdByLabel" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mailings_segments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "mailings_segments_source_name_key" ON "mailings_segments"("source", "name");

