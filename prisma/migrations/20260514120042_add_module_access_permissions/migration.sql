/*
  Warnings:

  - You are about to drop the `access_mappings` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "access_mappings" DROP CONSTRAINT "access_mappings_familyMemberId_fkey";

-- DropForeignKey
ALTER TABLE "access_mappings" DROP CONSTRAINT "access_mappings_portalId_fkey";

-- DropForeignKey
ALTER TABLE "access_mappings" DROP CONSTRAINT "access_mappings_userId_fkey";

-- DropTable
DROP TABLE "access_mappings";

-- CreateTable
CREATE TABLE "module_access_permissions" (
    "id" TEXT NOT NULL,
    "adminUserId" TEXT NOT NULL,
    "moduleCode" TEXT NOT NULL,
    "granted" BOOLEAN NOT NULL DEFAULT true,
    "grantedBy" TEXT,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "module_access_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "module_access_permissions_adminUserId_idx" ON "module_access_permissions"("adminUserId");

-- CreateIndex
CREATE UNIQUE INDEX "module_access_permissions_adminUserId_moduleCode_key" ON "module_access_permissions"("adminUserId", "moduleCode");

-- AddForeignKey
ALTER TABLE "module_access_permissions" ADD CONSTRAINT "module_access_permissions_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES "admin_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
