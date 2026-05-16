/*
  Warnings:

  - Added the required column `accountLast4` to the `bank_accounts` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "bank_accounts" ADD COLUMN     "accountLast4" TEXT NOT NULL,
ADD COLUMN     "isPrimary" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "latestBalanceAsOf" TIMESTAMP(3),
ADD COLUMN     "nickname" TEXT,
ADD COLUMN     "notes" TEXT;
