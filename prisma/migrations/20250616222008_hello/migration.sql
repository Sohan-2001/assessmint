/*
  Warnings:

  - You are about to drop the column `isCorrect` on the `UserAnswer` table. All the data in the column will be lost.
  - You are about to drop the column `pointsAwarded` on the `UserAnswer` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `UserSubmission` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `UserSubmission` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Question" DROP CONSTRAINT "Question_examId_fkey";

-- DropForeignKey
ALTER TABLE "QuestionOption" DROP CONSTRAINT "QuestionOption_questionId_fkey";

-- DropForeignKey
ALTER TABLE "UserAnswer" DROP CONSTRAINT "UserAnswer_questionId_fkey";

-- DropForeignKey
ALTER TABLE "UserAnswer" DROP CONSTRAINT "UserAnswer_submissionId_fkey";

-- DropForeignKey
ALTER TABLE "UserSubmission" DROP CONSTRAINT "UserSubmission_examId_fkey";

-- AlterTable
ALTER TABLE "Exam" ADD COLUMN     "openAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "UserAnswer" DROP COLUMN "isCorrect",
DROP COLUMN "pointsAwarded";

-- AlterTable
ALTER TABLE "UserSubmission" DROP COLUMN "createdAt",
DROP COLUMN "updatedAt";

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionOption" ADD CONSTRAINT "QuestionOption_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSubmission" ADD CONSTRAINT "UserSubmission_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAnswer" ADD CONSTRAINT "UserAnswer_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "UserSubmission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAnswer" ADD CONSTRAINT "UserAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
