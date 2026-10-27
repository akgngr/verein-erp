/*
  Warnings:

  - You are about to drop the column `address` on the `Member` table. All the data in the column will be lost.
  - You are about to drop the column `tcKimlikNo` on the `Member` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Member_tcKimlikNo_key";

-- AlterTable
ALTER TABLE "Member" DROP COLUMN "address",
DROP COLUMN "tcKimlikNo",
ADD COLUMN     "city" TEXT,
ADD COLUMN     "houseNumber" TEXT,
ADD COLUMN     "kimlikNo" TEXT,
ADD COLUMN     "postalCode" TEXT,
ADD COLUMN     "state" TEXT,
ADD COLUMN     "street" TEXT;

-- CreateIndex
CREATE INDEX "Member_postalCode_city_idx" ON "Member"("postalCode", "city");
