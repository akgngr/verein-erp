-- CreateTable
CREATE TABLE "user_profiles" (
    "userId" TEXT NOT NULL,
    "phone" TEXT,
    "mobile" TEXT,
    "street" TEXT,
    "houseNumber" TEXT,
    "postalCode" TEXT,
    "city" TEXT,
    "country" TEXT,
    "accountHolder" TEXT,
    "ibanEnc" TEXT,
    "bic" TEXT,
    "bankName" TEXT,
    "businessName" TEXT,
    "taxNumberEnc" TEXT,
    "vatId" TEXT,
    "isSmallBusiness" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("userId")
);
