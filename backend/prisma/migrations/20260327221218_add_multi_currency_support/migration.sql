/*
  Warnings:

  - You are about to drop the column `amountUsd` on the `Transaction` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Transaction" DROP COLUMN "amountUsd",
ADD COLUMN     "originalAmount" DOUBLE PRECISION,
ALTER COLUMN "currency" SET DEFAULT 'DOP';

-- CreateTable
CREATE TABLE "UserSettings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "baseCurrency" TEXT NOT NULL DEFAULT 'DOP',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExchangeRate" (
    "id" TEXT NOT NULL,
    "from" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "rate" DOUBLE PRECISION NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT NOT NULL DEFAULT 'manual',

    CONSTRAINT "ExchangeRate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserSettings_userId_key" ON "UserSettings"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ExchangeRate_from_to_date_key" ON "ExchangeRate"("from", "to", "date");

-- AddForeignKey
ALTER TABLE "UserSettings" ADD CONSTRAINT "UserSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- BACKFILL MULTI-CURRENCY DATA
UPDATE "Transaction" SET "originalAmount" = "amount" WHERE "originalAmount" IS NULL;
UPDATE "Transaction" SET "currency" = COALESCE((SELECT "baseCurrency" FROM "UserSettings" WHERE "UserSettings"."userId" = "Transaction"."userId"), 'DOP');
