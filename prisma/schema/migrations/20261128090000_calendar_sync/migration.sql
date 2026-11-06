-- CreateEnum
CREATE TYPE "CalendarSyncStatus" AS ENUM ('PENDING', 'ACTIVE', 'ERROR', 'REAUTH');

-- CreateTable
CREATE TABLE "calendar_sync_apps" (
    "provider" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "clientSecretEnc" TEXT NOT NULL,
    "tenant" TEXT,
    "updatedById" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calendar_sync_apps_pkey" PRIMARY KEY ("provider")
);

-- CreateTable
CREATE TABLE "calendar_sync_accounts" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accountLabel" TEXT NOT NULL DEFAULT '',
    "credentialsEnc" TEXT,
    "stateHash" TEXT,
    "status" "CalendarSyncStatus" NOT NULL DEFAULT 'PENDING',
    "lastSyncAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calendar_sync_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calendar_sync_calendars" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "remoteId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#64748b',
    "enabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "calendar_sync_calendars_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calendar_sync_events" (
    "id" TEXT NOT NULL,
    "calendarId" TEXT NOT NULL,
    "remoteId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "location" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "allDay" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "calendar_sync_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "calendar_sync_accounts_stateHash_key" ON "calendar_sync_accounts"("stateHash");

-- CreateIndex
CREATE UNIQUE INDEX "calendar_sync_accounts_provider_userId_key" ON "calendar_sync_accounts"("provider", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "calendar_sync_calendars_accountId_remoteId_key" ON "calendar_sync_calendars"("accountId", "remoteId");

-- CreateIndex
CREATE INDEX "calendar_sync_events_calendarId_startsAt_idx" ON "calendar_sync_events"("calendarId", "startsAt");

-- CreateIndex
CREATE UNIQUE INDEX "calendar_sync_events_calendarId_remoteId_key" ON "calendar_sync_events"("calendarId", "remoteId");

-- AddForeignKey
ALTER TABLE "calendar_sync_calendars" ADD CONSTRAINT "calendar_sync_calendars_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "calendar_sync_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_sync_events" ADD CONSTRAINT "calendar_sync_events_calendarId_fkey" FOREIGN KEY ("calendarId") REFERENCES "calendar_sync_calendars"("id") ON DELETE CASCADE ON UPDATE CASCADE;

