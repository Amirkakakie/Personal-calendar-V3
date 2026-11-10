ALTER TABLE "ProjectInvitation" ADD COLUMN "recipientId" TEXT;
ALTER TABLE "ProjectInvitation"
  ADD CONSTRAINT "ProjectInvitation_recipientId_fkey"
  FOREIGN KEY ("recipientId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "ProjectInvitation_recipientId_idx" ON "ProjectInvitation"("recipientId");
