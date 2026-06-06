-- AddForeignKey
ALTER TABLE "expense_entries" ADD CONSTRAINT "expense_entries_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "bank_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
