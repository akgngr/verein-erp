-- Roller artık metin anahtarıdır (sistem, modül veya özel rol); mevcut değerler korunur.
ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "role" TYPE TEXT USING ("role"::text);
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'VIEWER';

-- DropEnum
DROP TYPE "Role";

-- CreateTable
CREATE TABLE "custom_roles" (
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT NOT NULL DEFAULT 'default',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "custom_roles_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "role_grants" (
    "roleKey" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "actions" TEXT[],
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "role_grants_pkey" PRIMARY KEY ("roleKey","resource")
);
