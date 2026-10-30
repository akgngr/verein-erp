-- CreateEnum
CREATE TYPE "InvoiceKind" AS ENUM ('INVOICE', 'PROFORMA');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'ISSUED', 'PAID', 'CANCELLED');

-- CreateTable
CREATE TABLE "AccountingInvoiceCounter" (
    "kind" "InvoiceKind" NOT NULL,
    "year" INTEGER NOT NULL,
    "lastSeq" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "AccountingInvoiceCounter_pkey" PRIMARY KEY ("kind","year")
);

-- CreateTable
CREATE TABLE "AccountingInvoice" (
    "id" TEXT NOT NULL,
    "kind" "InvoiceKind" NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "number" TEXT,
    "year" INTEGER,
    "sequence" INTEGER,
    "issueDate" DATE NOT NULL,
    "dueDate" DATE,
    "serviceDate" TEXT,
    "recipientName" TEXT NOT NULL,
    "recipientAddress" TEXT,
    "recipientEmail" TEXT,
    "subject" TEXT,
    "introText" TEXT,
    "footerText" TEXT,
    "taxNote" TEXT,
    "netCents" INTEGER NOT NULL DEFAULT 0,
    "taxCents" INTEGER NOT NULL DEFAULT 0,
    "grossCents" INTEGER NOT NULL DEFAULT 0,
    "categoryId" TEXT,
    "bookingId" TEXT,
    "sourceProformaId" TEXT,
    "issuedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "cancelReason" TEXT,
    "createdById" TEXT NOT NULL,
    "createdByLabel" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountingInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountingInvoiceLine" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL,
    "unit" TEXT,
    "unitPriceCents" INTEGER NOT NULL,
    "taxRate" INTEGER NOT NULL,
    "totalCents" INTEGER NOT NULL,

    CONSTRAINT "AccountingInvoiceLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountingInvoiceSettings" (
    "id" TEXT NOT NULL,
    "defaultTaxRate" INTEGER NOT NULL DEFAULT 0,
    "taxNote" TEXT,
    "paymentDays" INTEGER NOT NULL DEFAULT 14,
    "bankDetails" TEXT,
    "footerText" TEXT,
    "incomeCategoryId" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountingInvoiceSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AccountingInvoice_number_key" ON "AccountingInvoice"("number");

-- CreateIndex
CREATE INDEX "AccountingInvoice_status_idx" ON "AccountingInvoice"("status");

-- CreateIndex
CREATE INDEX "AccountingInvoice_issueDate_idx" ON "AccountingInvoice"("issueDate");

-- CreateIndex
CREATE UNIQUE INDEX "AccountingInvoice_kind_year_sequence_key" ON "AccountingInvoice"("kind", "year", "sequence");

-- CreateIndex
CREATE INDEX "AccountingInvoiceLine_invoiceId_idx" ON "AccountingInvoiceLine"("invoiceId");

-- AddForeignKey
ALTER TABLE "AccountingInvoiceLine" ADD CONSTRAINT "AccountingInvoiceLine_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "AccountingInvoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

