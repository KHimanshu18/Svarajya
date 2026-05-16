-- AlterTable
ALTER TABLE "income_streams" ADD COLUMN     "familyMemberId" TEXT;

-- AddForeignKey
ALTER TABLE "income_streams" ADD CONSTRAINT "income_streams_familyMemberId_fkey" FOREIGN KEY ("familyMemberId") REFERENCES "family_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;
