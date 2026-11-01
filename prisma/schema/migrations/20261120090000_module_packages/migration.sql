-- CreateTable
CREATE TABLE "system_module_packages" (
    "id" TEXT NOT NULL,
    "moduleKey" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "publisher" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "sha256" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "verified" BOOLEAN NOT NULL,
    "errors" TEXT[],
    "storagePath" TEXT,
    "uploadedById" TEXT NOT NULL,
    "uploadedByLabel" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_module_packages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "system_module_packages_sha256_key" ON "system_module_packages"("sha256");

-- CreateIndex
CREATE INDEX "system_module_packages_moduleKey_idx" ON "system_module_packages"("moduleKey");

