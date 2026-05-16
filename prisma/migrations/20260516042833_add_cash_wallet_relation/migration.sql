-- CreateTable
CREATE TABLE "cash_wallets" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "cashInHand" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "emergencyCash" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pettyCash" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cash_wallets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cash_wallets_userId_key" ON "cash_wallets"("userId");

-- AddForeignKey
ALTER TABLE "cash_wallets" ADD CONSTRAINT "cash_wallets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
