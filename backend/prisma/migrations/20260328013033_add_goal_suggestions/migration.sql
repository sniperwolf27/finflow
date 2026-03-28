-- CreateTable
CREATE TABLE "GoalSuggestion" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "categoryId" TEXT,
    "targetAmount" DOUBLE PRECISION NOT NULL,
    "monthlySaving" DOUBLE PRECISION NOT NULL,
    "yearlySaving" DOUBLE PRECISION NOT NULL,
    "currentSpend" DOUBLE PRECISION,
    "suggestedSpend" DOUBLE PRECISION,
    "confidence" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'DOP',
    "accepted" BOOLEAN NOT NULL DEFAULT false,
    "dismissed" BOOLEAN NOT NULL DEFAULT false,
    "goalId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GoalSuggestion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GoalSuggestion_userId_idx" ON "GoalSuggestion"("userId");

-- AddForeignKey
ALTER TABLE "GoalSuggestion" ADD CONSTRAINT "GoalSuggestion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoalSuggestion" ADD CONSTRAINT "GoalSuggestion_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
