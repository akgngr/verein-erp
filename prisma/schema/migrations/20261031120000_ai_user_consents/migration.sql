-- CreateTable
CREATE TABLE "ai_user_consents" (
    "userId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_user_consents_pkey" PRIMARY KEY ("userId")
);

