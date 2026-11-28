-- AlterTable
ALTER TABLE "inventory_items" ADD COLUMN "inspectionIntervalMonths" INTEGER,
ADD COLUMN "nextInspectionAt" DATE;

-- CreateTable
CREATE TABLE "inventory_loans" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "borrowerName" TEXT NOT NULL,
    "borrowerMemberId" TEXT,
    "lentAt" DATE NOT NULL,
    "dueAt" DATE,
    "returnedAt" DATE,
    "note" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_loans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_maintenances" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'DGUV_V3',
    "performedAt" DATE NOT NULL,
    "nextDueAt" DATE,
    "inspector" TEXT,
    "passed" BOOLEAN NOT NULL DEFAULT true,
    "note" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_maintenances_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "inventory_items_nextInspectionAt_idx" ON "inventory_items"("nextInspectionAt");

-- CreateIndex
CREATE INDEX "inventory_loans_itemId_idx" ON "inventory_loans"("itemId");

-- CreateIndex
CREATE INDEX "inventory_loans_returnedAt_idx" ON "inventory_loans"("returnedAt");

-- CreateIndex
CREATE INDEX "inventory_maintenances_itemId_idx" ON "inventory_maintenances"("itemId");

-- CreateIndex
CREATE INDEX "inventory_maintenances_performedAt_idx" ON "inventory_maintenances"("performedAt");

-- AddForeignKey
ALTER TABLE "inventory_loans" ADD CONSTRAINT "inventory_loans_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "inventory_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_maintenances" ADD CONSTRAINT "inventory_maintenances_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "inventory_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
