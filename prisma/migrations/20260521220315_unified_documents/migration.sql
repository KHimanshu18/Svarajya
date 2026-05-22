-- AddColumn cloudId to document_meta
ALTER TABLE "document_meta" ADD COLUMN IF NOT EXISTS "cloudId" TEXT;
-- AddColumn localId to document_meta
ALTER TABLE "document_meta" ADD COLUMN IF NOT EXISTS "localId" TEXT;
-- AddColumn storageType to document_meta
ALTER TABLE "document_meta" ADD COLUMN IF NOT EXISTS "storageType" TEXT DEFAULT 'local';
-- CreateIndex
CREATE INDEX IF NOT EXISTS "document_meta_linkedEntityId_idx" ON "document_meta"("linkedEntityId");
