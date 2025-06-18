
-- schema.sql
-- SQL DDL statements for creating tables in PostgreSQL (NeonDB)

-- Drop existing tables and types if they exist (optional, for a clean start)
-- Be careful with this in a production environment!
/*
DROP TABLE IF EXISTS "UserAnswer" CASCADE;
DROP TABLE IF EXISTS "UserSubmission" CASCADE;
DROP TABLE IF EXISTS "QuestionOption" CASCADE;
DROP TABLE IF EXISTS "Question" CASCADE;
DROP TABLE IF EXISTS "Exam" CASCADE;
DROP TABLE IF EXISTS "User" CASCADE;
DROP TYPE IF EXISTS "QuestionEnumType" CASCADE;
DROP TYPE IF EXISTS "RoleType" CASCADE;
*/

-- Create ENUM types
CREATE TYPE "RoleType" AS ENUM ('SETTER', 'TAKER');
CREATE TYPE "QuestionEnumType" AS ENUM ('MULTIPLE_CHOICE', 'SHORT_ANSWER', 'ESSAY');

-- Create User table
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL UNIQUE,
    "password" TEXT NOT NULL,
    "role" "RoleType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP -- Default to CURRENT_TIMESTAMP, app should update it
);

-- Create Exam table
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

-- Create Question table
CREATE TABLE "Question" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "examId" TEXT NOT NULL REFERENCES "Exam"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "text" TEXT NOT NULL,
    "type" "QuestionEnumType" NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 0,
    "correctAnswer" TEXT, -- For short/essay actual answer, or QuestionOption.id for MCQ
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create QuestionOption table
CREATE TABLE "QuestionOption" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "questionId" TEXT NOT NULL REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create UserSubmission table
CREATE TABLE "UserSubmission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "examId" TEXT NOT NULL REFERENCES "Exam"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    "takerId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isEvaluated" BOOLEAN NOT NULL DEFAULT FALSE,
    "evaluatedScore" INTEGER
);

-- Create UserAnswer table
CREATE TABLE "UserAnswer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "submissionId" TEXT NOT NULL REFERENCES "UserSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "questionId" TEXT NOT NULL REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE, -- Or RESTRICT if answers should persist if a question is deleted?
    "answer" JSONB, -- Storing string, or array of strings for MCQ (future-proof)
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "awardedMarks" INTEGER,
    "feedback" TEXT
);

-- Add indexes for frequently queried columns (optional but recommended)
CREATE INDEX "idx_user_email" ON "User"("email");
CREATE INDEX "idx_exam_setter_id" ON "Exam"("setterId");
CREATE INDEX "idx_question_exam_id" ON "Question"("examId");
CREATE INDEX "idx_questionoption_question_id" ON "QuestionOption"("questionId");
CREATE INDEX "idx_usersubmission_exam_id" ON "UserSubmission"("examId");
CREATE INDEX "idx_usersubmission_taker_id" ON "UserSubmission"("takerId");
CREATE INDEX "idx_useranswer_submission_id" ON "UserAnswer"("submissionId");
CREATE INDEX "idx_useranswer_question_id" ON "UserAnswer"("questionId");

-- Function to automatically update "updatedAt" timestamps (optional, can be handled by app logic)
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply the trigger to tables
-- Note: Neon's free tier might not support custom triggers or functions easily.
-- If these fail, remove them and handle "updatedAt" updates in your application code.
/*
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

-- You might need to generate UUIDs for primary keys if you prefer them over client-generated text IDs.
-- Example for User table using UUIDs:
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp"; -- Enable UUID generation if not already enabled
-- CREATE TABLE "User" (
--     "id" UUID NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
-- ...
-- );
-- However, the current code uses client-generated string IDs (e.g., from cuid or nanoid in a real app).
-- For simplicity and consistency with the previous Prisma setup, TEXT IDs are used here.
-- If you used `auto()` or `@default(dbgenerated())` with Prisma for IDs,
-- you would use `SERIAL` or `BIGSERIAL` (for auto-incrementing integers) or `TEXT DEFAULT gen_random_uuid()` (for UUIDs) in PostgreSQL.
-- Given our current code structure for actions, client-generated TEXT IDs are assumed for now.
