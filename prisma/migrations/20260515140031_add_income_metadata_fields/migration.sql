-- AlterTable
ALTER TABLE "income_streams" ADD COLUMN     "allocationMonths" INTEGER,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "expectedGrowthPct" INTEGER,
ADD COLUMN     "historicalIncome" JSONB,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "riskLevel" TEXT,
ADD COLUMN     "tdsAmount" DOUBLE PRECISION;
