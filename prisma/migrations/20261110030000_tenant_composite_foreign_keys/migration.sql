-- Composite ownership keys prevent cross-tenant references even if a route misses a check.
CREATE UNIQUE INDEX "Domain_id_userId_key" ON "Domain"("id", "userId");
CREATE UNIQUE INDEX "GoalOKR_id_userId_key" ON "GoalOKR"("id", "userId");
CREATE UNIQUE INDEX "Project_id_userId_key" ON "Project"("id", "userId");
CREATE UNIQUE INDEX "Task_id_userId_key" ON "Task"("id", "userId");

ALTER TABLE "GoalOKR" DROP CONSTRAINT IF EXISTS "GoalOKR_domainId_fkey";
ALTER TABLE "GoalOKR"
  ADD CONSTRAINT "GoalOKR_domainId_userId_fkey"
  FOREIGN KEY ("domainId", "userId") REFERENCES "Domain"("id", "userId")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Project" DROP CONSTRAINT IF EXISTS "Project_domainId_fkey";
ALTER TABLE "Project" DROP CONSTRAINT IF EXISTS "Project_goalId_fkey";
ALTER TABLE "Project"
  ADD CONSTRAINT "Project_domainId_userId_fkey"
  FOREIGN KEY ("domainId", "userId") REFERENCES "Domain"("id", "userId")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Project"
  ADD CONSTRAINT "Project_goalId_userId_fkey"
  FOREIGN KEY ("goalId", "userId") REFERENCES "GoalOKR"("id", "userId")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Task" DROP CONSTRAINT IF EXISTS "Task_domainId_fkey";
ALTER TABLE "Task" DROP CONSTRAINT IF EXISTS "Task_goalId_fkey";
ALTER TABLE "Task" DROP CONSTRAINT IF EXISTS "Task_projectId_fkey";
ALTER TABLE "Task"
  ADD CONSTRAINT "Task_domainId_userId_fkey"
  FOREIGN KEY ("domainId", "userId") REFERENCES "Domain"("id", "userId")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Task"
  ADD CONSTRAINT "Task_goalId_userId_fkey"
  FOREIGN KEY ("goalId", "userId") REFERENCES "GoalOKR"("id", "userId")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Task"
  ADD CONSTRAINT "Task_projectId_userId_fkey"
  FOREIGN KEY ("projectId", "userId") REFERENCES "Project"("id", "userId")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "TimeLog" DROP CONSTRAINT IF EXISTS "TimeLog_taskId_fkey";
ALTER TABLE "TimeLog" DROP CONSTRAINT IF EXISTS "TimeLog_projectId_fkey";
ALTER TABLE "TimeLog"
  ADD CONSTRAINT "TimeLog_taskId_userId_fkey"
  FOREIGN KEY ("taskId", "userId") REFERENCES "Task"("id", "userId")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TimeLog"
  ADD CONSTRAINT "TimeLog_projectId_userId_fkey"
  FOREIGN KEY ("projectId", "userId") REFERENCES "Project"("id", "userId")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "CalendarEvent" DROP CONSTRAINT IF EXISTS "CalendarEvent_taskId_fkey";
ALTER TABLE "CalendarEvent"
  ADD CONSTRAINT "CalendarEvent_taskId_userId_fkey"
  FOREIGN KEY ("taskId", "userId") REFERENCES "Task"("id", "userId")
  ON DELETE RESTRICT ON UPDATE CASCADE;
