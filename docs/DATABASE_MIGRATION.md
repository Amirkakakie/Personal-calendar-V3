# CHRONOS — Database Schema & PostgreSQL Migration Strategy

## 1. Overview

Chronos currently operates a **Hybrid Database Adapter** (`server/db.ts`) providing per-user partitioned isolation (`data/db.json`). This ensures full tenant boundaries, zero mock data, and atomic read/write guarantees in local, preview, and standalone container environments.

This document outlines the **PostgreSQL Production Target Architecture**, Prisma schema specifications, legacy data quarantine procedures, and the zero-downtime migration pipeline for Cloud SQL / PostgreSQL deployment.

---

## 2. Target PostgreSQL Relational Schema (`prisma/schema.prisma`)

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

enum Role {
  USER
  ADMIN
}

enum WorkspaceRole {
  OWNER
  ADMIN
  MEMBER
  VIEWER
}

enum Priority {
  urgent
  high
  medium
  low
}

model User {
  id             String           @id @default(uuid())
  email          String           @unique
  passwordHash   String
  name           String
  role           Role             @default(USER)
  avatar         String?
  createdAt      DateTime         @default(now())
  updatedAt      DateTime         @updatedAt

  // Personal Relationships
  tasks          Task[]
  projects       PersonalProject[]
  goals          Goal[]
  habits         Habit[]
  calendarEvents CalendarEvent[]
  timeLogs       TimeLog[]
  skills         UserSkill[]

  // Team Relationships
  workspaceMembers WorkspaceMember[]
  ownedProjects    TeamProject[]
  sentInvites      ProjectInvitation[] @relation("SentInvites")
  receivedInvites  ProjectInvitation[] @relation("ReceivedInvites")

  @@index([email])
}

model Workspace {
  id          String            @id @default(uuid())
  name        String
  type        String            @default("team") // "personal" | "team"
  ownerId     String
  createdAt   DateTime          @default(now())
  updatedAt   DateTime          @updatedAt

  members     WorkspaceMember[]
  projects    TeamProject[]

  @@index([ownerId])
}

model WorkspaceMember {
  id          String        @id @default(uuid())
  workspaceId String
  userId      String
  role        WorkspaceRole @default(MEMBER)
  joinedAt    DateTime      @default(now())

  workspace   Workspace     @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  user        User          @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([workspaceId, userId])
  @@index([userId])
}

model PersonalProject {
  id          String    @id @default(uuid())
  userId      String
  name        String
  color       String    @default("#6366f1")
  targetDate  String?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  tasks       Task[]

  @@index([userId])
}

model Task {
  id          String           @id @default(uuid())
  userId      String
  projectId   String?
  goalId      String?
  title       String
  description String?
  priority    Priority         @default(medium)
  category    String           @default("work")
  completed   Boolean          @default(false)
  dueDate     String?
  timeEstimate Int             @default(0)
  timeSpent   Int              @default(0)
  createdAt   DateTime         @default(now())
  updatedAt   DateTime         @updatedAt

  user        User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  project     PersonalProject? @relation(fields: [projectId], references: [id], onDelete: SetNull)
  goal        Goal?            @relation(fields: [goalId], references: [id], onDelete: SetNull)
  calendarEvents CalendarEvent[]
  timeLogs    TimeLog[]

  @@index([userId])
  @@index([projectId])
}

model Goal {
  id          String    @id @default(uuid())
  userId      String
  title       String
  category    String    @default("General")
  target      Int       @default(100)
  current     Int       @default(0)
  deadline    String?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  tasks       Task[]

  @@index([userId])
}

model TeamProject {
  id          String        @id @default(uuid())
  workspaceId String
  ownerId     String
  ownerEmail  String
  name        String
  key         String
  description String?
  color       String        @default("#6366f1")
  icon        String        @default("ShieldCheck")
  targetDate  String?
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt

  workspace   Workspace     @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  owner       User          @relation(fields: [ownerId], references: [id], onDelete: Restrict)
  tasks       TeamTask[]
  invitations ProjectInvitation[]

  @@index([workspaceId])
  @@index([ownerId])
}

model TeamTask {
  id             String      @id @default(uuid())
  projectId      String
  taskNumber     Int
  columnId       String      @default("todo")
  title          String
  description    String?
  priority       Priority    @default(medium)
  assigneeId     String?
  dueDate        String?
  estimatedHours Float       @default(0)
  subtasksJson   Json?
  tagsJson       Json?
  commentsJson   Json?
  order          Int         @default(0)
  createdAt      DateTime    @default(now())
  updatedAt      DateTime    @updatedAt

  project        TeamProject @relation(fields: [projectId], references: [id], onDelete: Cascade)

  @@index([projectId])
  @@index([columnId])
}

model ProjectInvitation {
  id              String        @id @default(uuid())
  projectId       String
  invitedEmail    String
  invitedByUserId String
  role            WorkspaceRole @default(MEMBER)
  status          String        @default("PENDING") // PENDING, ACCEPTED, DECLINED
  createdAt       DateTime      @default(now())

  project         TeamProject   @relation(fields: [projectId], references: [id], onDelete: Cascade)
  invitedBy       User          @relation("SentInvites", fields: [invitedByUserId], references: [id], onDelete: Cascade)
  recipient       User?         @relation("ReceivedInvites", fields: [invitedEmail], references: [email])

  @@index([invitedEmail])
  @@index([projectId])
}

model CalendarEvent {
  id          String    @id @default(uuid())
  userId      String
  taskId      String?
  title       String
  startTime   DateTime
  endTime     DateTime
  color       String?

  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  task        Task?     @relation(fields: [taskId], references: [id], onDelete: SetNull)

  @@index([userId])
  @@index([startTime, endTime])
}

model TimeLog {
  id          String    @id @default(uuid())
  userId      String
  taskId      String?
  projectId   String?
  durationMinutes Int
  note        String?
  timestamp   DateTime  @default(now())

  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  task        Task?     @relation(fields: [taskId], references: [id], onDelete: SetNull)

  @@index([userId])
}
```

---

## 3. Step-by-Step Migration Pipeline

### Phase 1: Environment & Cloud SQL Provisioning
1. Set up Cloud SQL PostgreSQL instance (Version 15+).
2. Export `DATABASE_URL="postgresql://user:pass@host:5432/chronos?sslmode=require"`.
3. Run schema push:
   ```bash
   npx prisma db push --skip-generate
   ```

### Phase 2: Legacy Data Quarantine & Migration Script
1. Inspect `data/db.json` from the hybrid adapter.
2. Filter out any demo or unverified legacy records.
3. Execute the migration script (`scripts/migrate-to-postgres.ts`):
   - Reads partitioned entities from `data/db.json`.
   - Maps each partition to `User`, `Task`, `PersonalProject`, `Goal`, `CalendarEvent`.
   - Inserts records within a single PostgreSQL transaction (`prisma.$transaction`).
   - Verifies record counts match 1:1.

### Phase 3: Zero-Downtime Cutover
1. Enable dual-write mode (writes go to both Postgres and local file; reads pull from Postgres).
2. Validate consistency metrics across 1,000 transactions.
3. Switch read traffic 100% to PostgreSQL.
4. Archive `data/db.json` as an encrypted snapshot backup.

---

## 4. Rollback Strategy

If database connection latency or connection pool saturation occurs:
1. Chronos server detects PostgreSQL failure upon startup.
2. Server automatically falls back to the hybrid file-based multi-tenant storage adapter without downtime.
3. Zero data loss: All user partitions maintain transactional JSON integrity.
