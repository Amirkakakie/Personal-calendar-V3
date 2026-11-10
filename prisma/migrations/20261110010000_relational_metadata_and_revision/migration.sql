-- Add lossless source metadata columns while the relational importer is introduced.
ALTER TABLE "User" ADD COLUMN "legacyData" JSONB;
ALTER TABLE "Domain" ADD COLUMN "legacyData" JSONB;
ALTER TABLE "GoalOKR" ADD COLUMN "legacyData" JSONB;
ALTER TABLE "Project" ADD COLUMN "legacyData" JSONB;
ALTER TABLE "Task" ADD COLUMN "legacyData" JSONB;
ALTER TABLE "TimeLog" ADD COLUMN "legacyData" JSONB;
ALTER TABLE "Skill" ADD COLUMN "legacyData" JSONB;
ALTER TABLE "UserSkill" ADD COLUMN "legacyData" JSONB;
ALTER TABLE "UserBadge" ADD COLUMN "legacyData" JSONB;
ALTER TABLE "CalendarEvent" ADD COLUMN "legacyData" JSONB;
ALTER TABLE "Workspace" ADD COLUMN "legacyData" JSONB;
ALTER TABLE "TeamProject" ADD COLUMN "legacyData" JSONB;
ALTER TABLE "TeamTask" ADD COLUMN "legacyData" JSONB;
ALTER TABLE "TeamTaskComment" ADD COLUMN "legacyData" JSONB;
ALTER TABLE "ProjectInvitation" ADD COLUMN "legacyData" JSONB;

ALTER TABLE "TeamTaskComment" ADD COLUMN "authorName" TEXT NOT NULL DEFAULT '';
ALTER TABLE "TeamTaskComment" ADD COLUMN "authorInitials" TEXT NOT NULL DEFAULT '';
ALTER TABLE "TeamTaskComment" ADD COLUMN "authorColor" TEXT NOT NULL DEFAULT '';

-- Skills can be independently authored by different users and may share a display name.
DROP INDEX IF EXISTS "Skill_name_key";
CREATE INDEX IF NOT EXISTS "Skill_name_idx" ON "Skill"("name");

CREATE TABLE "DatabaseRevision" (
  "id" TEXT NOT NULL,
  "version" BIGINT NOT NULL DEFAULT 1,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DatabaseRevision_pkey" PRIMARY KEY ("id")
);
