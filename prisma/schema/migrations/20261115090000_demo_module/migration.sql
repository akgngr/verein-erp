-- CreateTable
CREATE TABLE "demo_records" (
    "id" TEXT NOT NULL,
    "moduleKey" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "demo_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "demo_records_moduleKey_idx" ON "demo_records"("moduleKey");

-- CreateIndex
CREATE UNIQUE INDEX "demo_records_model_recordId_key" ON "demo_records"("model", "recordId");

