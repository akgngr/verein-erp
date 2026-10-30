-- CreateTable
CREATE TABLE "system_dashboard_layouts" (
    "userId" TEXT NOT NULL,
    "cards" TEXT[],
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_dashboard_layouts_pkey" PRIMARY KEY ("userId")
);

