-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'DONE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TaskPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH');

-- CreateTable
CREATE TABLE "tasks_tasks" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "TaskStatus" NOT NULL DEFAULT 'OPEN',
    "priority" "TaskPriority" NOT NULL DEFAULT 'NORMAL',
    "dueDate" DATE,
    "memberId" TEXT,
    "memberName" TEXT,
    "meetingId" TEXT,
    "completedAt" TIMESTAMP(3),
    "completedById" TEXT,
    "completedByLabel" TEXT,
    "createdById" TEXT,
    "createdByLabel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tasks_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tasks_tasks_status_idx" ON "tasks_tasks"("status");

-- CreateIndex
CREATE INDEX "tasks_tasks_priority_idx" ON "tasks_tasks"("priority");

-- CreateIndex
CREATE INDEX "tasks_tasks_dueDate_idx" ON "tasks_tasks"("dueDate");

-- CreateIndex
CREATE INDEX "tasks_tasks_memberId_idx" ON "tasks_tasks"("memberId");

-- CreateIndex
CREATE INDEX "tasks_tasks_meetingId_idx" ON "tasks_tasks"("meetingId");
