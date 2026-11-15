-- AlterTable
ALTER TABLE "ai_entity_references" ADD COLUMN     "alias" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "ai_entity_references_scopeId_alias_key" ON "ai_entity_references"("scopeId", "alias");

