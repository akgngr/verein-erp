-- CreateTable
CREATE TABLE "widget_user_preferences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "widgetId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL,
    "order" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "widget_user_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "widget_policies" (
    "widgetId" TEXT NOT NULL,
    "disabled" BOOLEAN NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "widget_policies_pkey" PRIMARY KEY ("widgetId")
);

-- CreateIndex
CREATE INDEX "widget_user_preferences_userId_idx" ON "widget_user_preferences"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "widget_user_preferences_userId_widgetId_key" ON "widget_user_preferences"("userId", "widgetId");

