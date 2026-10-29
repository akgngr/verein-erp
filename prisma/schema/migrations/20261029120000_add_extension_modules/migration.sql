-- A-1.1: events, inventory, mail ve system modüllerinin tabloları.
-- Bu modüller daha önce yalnızca `prisma db push` ile oluşturulmuştu; üretimdeki
-- `prisma migrate deploy` bu tabloları hiç oluşturmuyordu.

-- CreateTable
CREATE TABLE "events_items" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL DEFAULT 'OTHER',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "location" TEXT,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "onlineUrl" TEXT,
    "capacity" INTEGER,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "events_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events_attendees" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "memberId" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "status" TEXT NOT NULL DEFAULT 'REGISTERED',
    "notes" TEXT,
    "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "events_attendees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_items" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'OTHER',
    "serialNumber" TEXT,
    "location" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'IDLE',
    "purchaseDate" DATE,
    "purchasePrice" DECIMAL(12,2),
    "description" TEXT,
    "assignedMemberId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventory_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mail_settings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "transport" TEXT NOT NULL DEFAULT 'SMTP',
    "host" TEXT,
    "port" INTEGER NOT NULL DEFAULT 587,
    "security" TEXT NOT NULL DEFAULT 'STARTTLS',
    "username" TEXT,
    "passwordEncrypted" TEXT,
    "fromAddress" TEXT,
    "fromName" TEXT,
    "replyTo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mail_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mail_logs" (
    "id" TEXT NOT NULL,
    "toAddress" TEXT NOT NULL,
    "toName" TEXT,
    "subject" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "error" TEXT,
    "messageId" TEXT,
    "module" TEXT NOT NULL,
    "reference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mail_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_module_states" (
    "id" TEXT NOT NULL,
    "moduleKey" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "settings" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_module_states_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_settings" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX "events_items_status_idx" ON "events_items"("status");

-- CreateIndex
CREATE INDEX "events_items_startDate_idx" ON "events_items"("startDate");

-- CreateIndex
CREATE INDEX "events_items_type_idx" ON "events_items"("type");

-- CreateIndex
CREATE INDEX "events_attendees_eventId_idx" ON "events_attendees"("eventId");

-- CreateIndex
CREATE INDEX "events_attendees_memberId_idx" ON "events_attendees"("memberId");

-- CreateIndex
CREATE INDEX "events_attendees_status_idx" ON "events_attendees"("status");

-- CreateIndex
CREATE INDEX "inventory_items_category_idx" ON "inventory_items"("category");

-- CreateIndex
CREATE INDEX "inventory_items_status_idx" ON "inventory_items"("status");

-- CreateIndex
CREATE INDEX "inventory_items_assignedMemberId_idx" ON "inventory_items"("assignedMemberId");

-- CreateIndex
CREATE INDEX "mail_logs_status_idx" ON "mail_logs"("status");

-- CreateIndex
CREATE INDEX "mail_logs_module_idx" ON "mail_logs"("module");

-- CreateIndex
CREATE INDEX "mail_logs_createdAt_idx" ON "mail_logs"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "system_module_states_moduleKey_key" ON "system_module_states"("moduleKey");

-- AddForeignKey
ALTER TABLE "events_attendees" ADD CONSTRAINT "events_attendees_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

