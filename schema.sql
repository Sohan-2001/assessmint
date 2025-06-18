-- schema.sql

-- Drop existing tables and types if they exist (optional, for a clean start)
-- DROP TABLE IF EXISTS "UserAnswer" CASCADE;
-- DROP TABLE IF EXISTS "UserSubmission" CASCADE;
-- DROP TABLE IF EXISTS "QuestionOption" CASCADE;
-- DROP TABLE IF EXISTS "Question" CASCADE;
-- DROP TABLE IF EXISTS "ExamAllowedTaker" CASCADE; -- New table
-- DROP TABLE IF EXISTS "Exam" CASCADE;
-- DROP TABLE IF EXISTS "User" CASCADE;
-- DROP TYPE IF EXISTS "QuestionEnumType" CASCADE;
-- DROP TYPE IF EXISTS "RoleType" CASCADE;

-- Create ENUM types
CREATE TYPE "RoleType" AS ENUM ('SETTER', 'TAKER');
CREATE TYPE "QuestionEnumType" AS ENUM ('MULTIPLE_CHOICE', 'SHORT_ANSWER', 'ESSAY');

-- Create tables
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL UNIQUE,
    "password" TEXT NOT NULL,
    "role" "RoleType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "Exam" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "passcode" TEXT NOT NULL,
    "setterId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "durationMinutes" INTEGER,
    "openAt" TIMESTAMP(3)
);

-- New table for allowed takers
CREATE TABLE "ExamAllowedTaker" (
    "examId" TEXT NOT NULL REFERENCES "Exam"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "takerEmail" TEXT NOT NULL, -- Storing email directly
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("examId", "takerEmail")
);

CREATE TABLE "Question" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "examId" TEXT NOT NULL REFERENCES "Exam"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "text" TEXT NOT NULL,
    "type" "QuestionEnumType" NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 0,
    "correctAnswer" TEXT, -- For MCQs, this will store the ID of the correct QuestionOption. For ShortAnswer/Essay, it's the model answer text.
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "QuestionOption" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "questionId" TEXT NOT NULL REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "UserSubmission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "examId" TEXT NOT NULL REFERENCES "Exam"("id") ON DELETE RESTRICT ON UPDATE CASCADE, -- Prevent deleting exam if submissions exist
    "takerId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE, -- Prevent deleting user if submissions exist
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isEvaluated" BOOLEAN NOT NULL DEFAULT FALSE,
    "evaluatedScore" INTEGER
);

CREATE TABLE "UserAnswer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "submissionId" TEXT NOT NULL REFERENCES "UserSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "questionId" TEXT NOT NULL REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE, -- If a question is deleted, its answers are less meaningful
    "answer" JSONB, -- Storing answer as JSONB to accommodate different answer types (string for text, array for MCQ selections if needed)
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "awardedMarks" INTEGER,
    "feedback" TEXT
);

-- Create Indexes for performance
CREATE INDEX "idx_user_email" ON "User"("email");
CREATE INDEX "idx_exam_setter_id" ON "Exam"("setterId");
CREATE INDEX "idx_exam_allowed_taker_exam_id" ON "ExamAllowedTaker"("examId"); -- New index
CREATE INDEX "idx_exam_allowed_taker_email" ON "ExamAllowedTaker"("takerEmail"); -- New index
CREATE INDEX "idx_question_exam_id" ON "Question"("examId");
CREATE INDEX "idx_questionoption_question_id" ON "QuestionOption"("questionId");
CREATE INDEX "idx_usersubmission_exam_id" ON "UserSubmission"("examId");
CREATE INDEX "idx_usersubmission_taker_id" ON "UserSubmission"("takerId");
CREATE INDEX "idx_useranswer_submission_id" ON "UserAnswer"("submissionId");
CREATE INDEX "idx_useranswer_question_id" ON "UserAnswer"("questionId");


-- Optional: Function and Trigger to auto-update "updatedAt" timestamps
-- This might not be supported on all PostgreSQL services or free tiers,
-- or you might prefer to handle updatedAt in application logic.
/*
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_timestamp_user
BEFORE UPDATE ON "User"
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_timestamp_exam
BEFORE UPDATE ON "Exam"
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_timestamp_question
BEFORE UPDATE ON "Question"
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_timestamp_questionoption
BEFORE UPDATE ON "QuestionOption"
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_timestamp_usersubmission
BEFORE UPDATE ON "UserSubmission"
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_timestamp_useranswer
BEFORE UPDATE ON "UserAnswer"
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();
*/
