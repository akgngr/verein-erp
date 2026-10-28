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
CREATE UNIQUE INDEX "system_module_states_moduleKey_key" ON "system_module_states"("moduleKey");

-- AddForeignKey
ALTER TABLE "events_attendees" ADD CONSTRAINT "events_attendees_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
