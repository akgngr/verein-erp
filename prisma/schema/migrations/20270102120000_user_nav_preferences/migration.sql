-- CreateTable
CREATE TABLE "user_nav_preferences" (
    "userId" TEXT NOT NULL,
    "config" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_nav_preferences_pkey" PRIMARY KEY ("userId")
);
