-- CreateTable
CREATE TABLE "balance_history" (
    "id" TEXT NOT NULL,
    "bankAccountId" TEXT NOT NULL,
    "balance" DOUBLE PRECISION NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,

    CONSTRAINT "balance_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "balance_history_bankAccountId_idx" ON "balance_history"("bankAccountId");

-- AddForeignKey
ALTER TABLE "balance_history" ADD CONSTRAINT "balance_history_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "bank_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
