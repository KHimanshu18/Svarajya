/*
  Warnings:

  - You are about to drop the column `createdAt` on the `balance_history` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[userId,idType,familyMemberId]` on the table `identity_records` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `ownershipType` to the `property_assets` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "AuthProvider" AS ENUM ('EMAIL', 'GOOGLE');

-- AlterEnum
ALTER TYPE "AdminStatus" ADD VALUE 'INVITE_ACCEPTED';

-- DropForeignKey
ALTER TABLE "email_verification_codes" DROP CONSTRAINT "email_verification_codes_userId_fkey";

-- AlterTable
ALTER TABLE "admin_users" ADD COLUMN     "mobile" TEXT,
ADD COLUMN     "twoFactorOtpExpiresAt" TIMESTAMP(6);

-- AlterTable
ALTER TABLE "balance_history" DROP COLUMN "createdAt";

-- AlterTable
ALTER TABLE "document_meta" ADD COLUMN     "linkedFamilyMemberId" TEXT;

-- AlterTable
ALTER TABLE "email_verification_codes" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "expense_entries" ADD COLUMN     "frequency" TEXT;

-- AlterTable
ALTER TABLE "identity_records" ADD COLUMN     "familyMemberId" TEXT;

-- AlterTable
ALTER TABLE "loan_accounts" ADD COLUMN     "documentId" TEXT;

-- AlterTable
ALTER TABLE "notifications" ADD COLUMN     "link" TEXT;

-- AlterTable
ALTER TABLE "property_assets" ADD COLUMN     "coOwners" JSONB,
ADD COLUMN     "ownershipType" TEXT NOT NULL,
ADD COLUMN     "secretFieldId" TEXT,
ADD COLUMN     "vaultFileIds" JSONB;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "authProvider" TEXT DEFAULT 'EMAIL';

-- CreateTable
CREATE TABLE "expense_categories" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "emoji" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "expense_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tax_records" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "assessmentYear" TEXT NOT NULL,
    "financialYear" TEXT NOT NULL,
    "filingType" TEXT DEFAULT 'ITR',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "grossIncome" DOUBLE PRECISION,
    "taxableIncome" DOUBLE PRECISION,
    "taxPaid" DOUBLE PRECISION,
    "taxDue" DOUBLE PRECISION,
    "filingDate" DATE,
    "acknowledgementNumber" TEXT,
    "documentUrl" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tax_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gst_records" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "gstin" TEXT NOT NULL,
    "businessName" TEXT,
    "registrationType" TEXT,
    "filingFrequency" TEXT,
    "lastFilingDate" DATE,
    "nextDueDate" DATE,
    "gstr1Filed" BOOLEAN,
    "gstr3bFiled" BOOLEAN,
    "annualReturnFiled" BOOLEAN,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "documentUrl" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gst_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "din_records" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dinNumber" TEXT NOT NULL,
    "companyName" TEXT,
    "issueDate" DATE,
    "expiryDate" DATE,
    "dinKycStatus" TEXT,
    "dscExpiryDate" DATE,
    "mcaFilingStatus" TEXT,
    "directorSince" DATE,
    "status" TEXT NOT NULL DEFAULT 'VALID',
    "documentUrl" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "din_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "succession_nominees" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "assetType" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "nomineeId" TEXT NOT NULL,
    "nomineeName" TEXT NOT NULL,
    "relationship" TEXT NOT NULL,
    "sharePercentage" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "succession_nominees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "succession_wills" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "willExists" BOOLEAN NOT NULL DEFAULT false,
    "dateOfWill" DATE,
    "registered" BOOLEAN NOT NULL DEFAULT false,
    "executorName" TEXT,
    "executorContact" TEXT,
    "witnessNames" JSONB,
    "storageLocation" TEXT,
    "digitalCopyUrl" TEXT,
    "cloudConsent" BOOLEAN NOT NULL DEFAULT false,
    "secretHint" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "succession_wills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "succession_emergency" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "emergencyContactName" TEXT,
    "emergencyContactPhone" TEXT,
    "secondaryContactName" TEXT,
    "secondaryContactPhone" TEXT,
    "verificationMethod" TEXT,
    "activationWaitingPeriod" INTEGER NOT NULL DEFAULT 24,
    "assetAccessScope" JSONB,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "succession_emergency_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "expense_categories_userId_idx" ON "expense_categories"("userId");

-- CreateIndex
CREATE INDEX "tax_records_userId_idx" ON "tax_records"("userId");

-- CreateIndex
CREATE INDEX "tax_records_status_idx" ON "tax_records"("status");

-- CreateIndex
CREATE INDEX "gst_records_userId_idx" ON "gst_records"("userId");

-- CreateIndex
CREATE INDEX "gst_records_status_idx" ON "gst_records"("status");

-- CreateIndex
CREATE UNIQUE INDEX "gst_records_gstin_userId_key" ON "gst_records"("gstin", "userId");

-- CreateIndex
CREATE INDEX "din_records_userId_idx" ON "din_records"("userId");

-- CreateIndex
CREATE INDEX "din_records_status_idx" ON "din_records"("status");

-- CreateIndex
CREATE UNIQUE INDEX "din_records_dinNumber_userId_key" ON "din_records"("dinNumber", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "succession_nominees_userId_assetType_assetId_nomineeId_key" ON "succession_nominees"("userId", "assetType", "assetId", "nomineeId");

-- CreateIndex
CREATE UNIQUE INDEX "succession_wills_userId_key" ON "succession_wills"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "succession_emergency_userId_key" ON "succession_emergency"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "identity_records_userid_idtype_familymemberid_key" ON "identity_records"("userId", "idType", "familyMemberId");

-- AddForeignKey
ALTER TABLE "email_verification_codes" ADD CONSTRAINT "email_verification_codes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "income_streams" ADD CONSTRAINT "income_streams_creditedAccountId_fkey" FOREIGN KEY ("creditedAccountId") REFERENCES "bank_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_categories" ADD CONSTRAINT "expense_categories_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_records" ADD CONSTRAINT "tax_records_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gst_records" ADD CONSTRAINT "gst_records_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "din_records" ADD CONSTRAINT "din_records_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "succession_nominees" ADD CONSTRAINT "succession_nominees_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "succession_nominees" ADD CONSTRAINT "succession_nominees_nomineeId_fkey" FOREIGN KEY ("nomineeId") REFERENCES "family_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "succession_wills" ADD CONSTRAINT "succession_wills_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "succession_emergency" ADD CONSTRAINT "succession_emergency_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
