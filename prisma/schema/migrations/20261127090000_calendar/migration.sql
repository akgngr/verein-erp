-- CreateEnum
CREATE TYPE "CalendarKind" AS ENUM ('PERSONAL', 'SHARED');

-- CreateEnum
CREATE TYPE "CalendarRecurrence" AS ENUM ('NONE', 'DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY');

-- CreateTable
CREATE TABLE "calendar_calendars" (
    "id" TEXT NOT NULL,
    "kind" "CalendarKind" NOT NULL DEFAULT 'PERSONAL',
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#3b82f6',
    "ownerId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calendar_calendars_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calendar_entries" (
    "id" TEXT NOT NULL,
    "calendarId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "location" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "allDay" BOOLEAN NOT NULL DEFAULT false,
    "recurrence" "CalendarRecurrence" NOT NULL DEFAULT 'NONE',
    "recurrenceInterval" INTEGER NOT NULL DEFAULT 1,
    "recurrenceUntil" TIMESTAMP(3),
    "eventId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdByLabel" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calendar_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calendar_feed_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3),

    CONSTRAINT "calendar_feed_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "calendar_calendars_kind_ownerId_idx" ON "calendar_calendars"("kind", "ownerId");

-- CreateIndex
CREATE INDEX "calendar_entries_calendarId_startsAt_idx" ON "calendar_entries"("calendarId", "startsAt");

-- CreateIndex
CREATE INDEX "calendar_entries_startsAt_endsAt_idx" ON "calendar_entries"("startsAt", "endsAt");

-- CreateIndex
CREATE UNIQUE INDEX "calendar_feed_tokens_userId_key" ON "calendar_feed_tokens"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "calendar_feed_tokens_tokenHash_key" ON "calendar_feed_tokens"("tokenHash");

-- AddForeignKey
ALTER TABLE "calendar_entries" ADD CONSTRAINT "calendar_entries_calendarId_fkey" FOREIGN KEY ("calendarId") REFERENCES "calendar_calendars"("id") ON DELETE CASCADE ON UPDATE CASCADE;

