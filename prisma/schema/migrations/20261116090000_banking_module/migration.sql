-- CreateEnum
CREATE TYPE "BankConnectionStatus" AS ENUM ('PENDING', 'LINKED', 'EXPIRED', 'ERROR');

-- CreateTable
CREATE TABLE "banking_connections" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "institutionName" TEXT NOT NULL,
    "externalId" TEXT,
    "reference" TEXT NOT NULL,
    "status" "BankConnectionStatus" NOT NULL DEFAULT 'PENDING',
    "consentExpiresAt" TIMESTAMP(3),
    "lastSyncAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdById" TEXT NOT NULL,
    "createdByLabel" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "banking_connections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "banking_connection_accounts" (
    "id" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "iban" TEXT,
    "name" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "accountingAccountId" TEXT,
    "lastSyncAt" TIMESTAMP(3),
    "lastSyncCount" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "banking_connection_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "banking_settings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "provider" TEXT NOT NULL DEFAULT 'GOCARDLESS',
    "secretIdSealed" TEXT,
    "secretKeySealed" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "banking_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "banking_connections_externalId_key" ON "banking_connections"("externalId");

-- CreateIndex
CREATE UNIQUE INDEX "banking_connections_reference_key" ON "banking_connections"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "banking_connection_accounts_connectionId_externalId_key" ON "banking_connection_accounts"("connectionId", "externalId");

-- AddForeignKey
ALTER TABLE "banking_connection_accounts" ADD CONSTRAINT "banking_connection_accounts_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "banking_connections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

