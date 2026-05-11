/*
  Warnings:

  - You are about to drop the column `maxValue` on the `calculation_parameters` table. All the data in the column will be lost.
  - You are about to drop the column `minValue` on the `calculation_parameters` table. All the data in the column will be lost.
  - You are about to drop the column `unit` on the `calculation_parameters` table. All the data in the column will be lost.
  - You are about to drop the column `createdBy` on the `iks_assets` table. All the data in the column will be lost.
  - You are about to drop the column `fileSize` on the `iks_assets` table. All the data in the column will be lost.
  - You are about to drop the column `metadata` on the `iks_assets` table. All the data in the column will be lost.
  - You are about to drop the column `mimeType` on the `iks_assets` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `iks_assets` table. All the data in the column will be lost.
  - You are about to drop the column `createdBy` on the `notification_templates` table. All the data in the column will be lost.
  - You are about to drop the column `updatedBy` on the `notification_templates` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "iks_assets" DROP CONSTRAINT "iks_assets_createdBy_fkey";

-- DropForeignKey
ALTER TABLE "notification_templates" DROP CONSTRAINT "notification_templates_createdBy_fkey";

-- DropForeignKey
ALTER TABLE "notification_templates" DROP CONSTRAINT "notification_templates_updatedBy_fkey";

-- DropIndex
DROP INDEX "iks_assets_name_idx";

-- AlterTable
ALTER TABLE "admin_users" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "inviteExpiresAt" TIMESTAMP(3),
ADD COLUMN     "inviteToken" TEXT,
ADD COLUMN     "previousPassword" TEXT,
ADD COLUMN     "twoFactorRecoveryCodes" TEXT;

-- AlterTable
ALTER TABLE "calculation_parameters" DROP COLUMN "maxValue",
DROP COLUMN "minValue",
DROP COLUMN "unit";

-- AlterTable
ALTER TABLE "credential_records" ADD COLUMN     "nomineeAwareness" BOOLEAN DEFAULT true,
ADD COLUMN     "twoFAStatus" TEXT DEFAULT 'unknown',
ADD COLUMN     "twoFAType" TEXT DEFAULT 'none';

-- AlterTable
ALTER TABLE "education" ADD COLUMN     "certificateUrl" TEXT,
ADD COLUMN     "familyMemberId" TEXT;

-- AlterTable
ALTER TABLE "identity_records" ADD COLUMN     "dobOnDoc" DATE,
ADD COLUMN     "nameOnDoc" TEXT,
ADD COLUMN     "placeOfIssue" TEXT,
ADD COLUMN     "vaultFileId" TEXT;

-- AlterTable
ALTER TABLE "iks_assets" DROP COLUMN "createdBy",
DROP COLUMN "fileSize",
DROP COLUMN "metadata",
DROP COLUMN "mimeType",
DROP COLUMN "name";

-- AlterTable
ALTER TABLE "notification_templates" DROP COLUMN "createdBy",
DROP COLUMN "updatedBy";

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "googleAccessToken" TEXT,
ADD COLUMN     "googleLinked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "googleRefreshToken" TEXT,
ADD COLUMN     "googleTokenExpiry" TIMESTAMP(3),
ADD COLUMN     "is_first_login" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "secondaryMobile" TEXT,
ADD COLUMN     "settings" JSONB,
ADD COLUMN     "twoFactorRecoveryCodes" TEXT,
ADD COLUMN     "twoFactorSecret" TEXT;

-- CreateTable
CREATE TABLE "access_mappings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "portalId" TEXT NOT NULL,
    "familyMemberId" TEXT NOT NULL,
    "accessLevel" TEXT NOT NULL DEFAULT 'viewer',
    "emergencyRule" TEXT NOT NULL DEFAULT 'manual',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "access_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "access_mappings_userId_idx" ON "access_mappings"("userId");

-- CreateIndex
CREATE INDEX "access_mappings_portalId_idx" ON "access_mappings"("portalId");

-- CreateIndex
CREATE INDEX "access_mappings_familyMemberId_idx" ON "access_mappings"("familyMemberId");

-- AddForeignKey
ALTER TABLE "education" ADD CONSTRAINT "education_familyMemberId_fkey" FOREIGN KEY ("familyMemberId") REFERENCES "family_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "access_mappings" ADD CONSTRAINT "access_mappings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "access_mappings" ADD CONSTRAINT "access_mappings_portalId_fkey" FOREIGN KEY ("portalId") REFERENCES "credential_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "access_mappings" ADD CONSTRAINT "access_mappings_familyMemberId_fkey" FOREIGN KEY ("familyMemberId") REFERENCES "family_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
