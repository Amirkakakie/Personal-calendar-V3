import { Prisma, PrismaClient } from '@prisma/client';
import { buildLegacyArchiveRow, validateLegacyExport, type LegacySnapshotExport } from './legacySnapshot.ts';

type Tx = Prisma.TransactionClient;
type Row = Record<string, any>;

const text = (v: any, fallback = ''): string => typeof v === 'string' ? v : v == null ? fallback : String(v);
const number = (v: any, fallback = 0): number => Number.isFinite(Number(v)) ? Number(v) : fallback;
const bool = (v: any): boolean => Boolean(v);
const date = (v: any, fallback = new Date(0)): Date => {
  if (v instanceof Date && !Number.isNaN(v.getTime())) return v;
  if (v != null) { const d = new Date(v); if (!Number.isNaN(d.getTime())) return d; }
  return fallback;
};
const nullable = (v: any): string | null => v == null || v === '' ? null : text(v);
const json = (v: any): Prisma.InputJsonValue => JSON.parse(JSON.stringify(v ?? null)) as Prisma.InputJsonValue;
const array = (v: any): any[] => Array.isArray(v) ? v : [];
const object = (v: any): Row => v && typeof v === 'object' && !Array.isArray(v) ? v : {};

function category(v: any): 'WORK_CAREER'|'ACADEMIC_STUDY'|'PERSONAL_GROWTH'|'HEALTH_HABITS' {
  const s = text(v).toLowerCase();
  if (s.includes('academic') || s.includes('study')) return 'ACADEMIC_STUDY';
  if (s.includes('personal')) return 'PERSONAL_GROWTH';
  if (s.includes('health') || s.includes('habit')) return 'HEALTH_HABITS';
  return 'WORK_CAREER';
}
function status(v: any): 'TODO'|'IN_PROGRESS'|'COMPLETED'|'ARCHIVED' {
  const s = text(v).toLowerCase();
  if (s === 'completed' || s === 'done') return 'COMPLETED';
  if (s === 'archived') return 'ARCHIVED';
  if (s === 'in_progress' || s === 'in-progress' || s === 'doing') return 'IN_PROGRESS';
  return 'TODO';
}
function priority(v: any): 'HIGH'|'MEDIUM'|'LOW' {
  const s = text(v).toLowerCase();
  return s === 'high' || s === 'urgent' ? 'HIGH' : s === 'low' ? 'LOW' : 'MEDIUM';
}
function timeframe(v: any): 'YEARLY'|'QUARTERLY'|'MONTHLY' {
  const s = text(v).toLowerCase();
  return s === 'yearly' ? 'YEARLY' : s === 'monthly' ? 'MONTHLY' : 'QUARTERLY';
}
function quadrant(v: any): 'Q1_URGENT_IMPORTANT'|'Q2_NOT_URGENT_IMPORTANT'|'Q3_URGENT_NOT_IMPORTANT'|'Q4_NEITHER' {
  const s = text(v).toLowerCase();
  if (s.includes('q1')) return 'Q1_URGENT_IMPORTANT';
  if (s.includes('q3')) return 'Q3_URGENT_NOT_IMPORTANT';
  if (s.includes('q4')) return 'Q4_NEITHER';
  return 'Q2_NOT_URGENT_IMPORTANT';
}
function energy(v: any): 'HIGH_FOCUS'|'CREATIVE'|'LOW_ADMIN' {
  const s = text(v).toLowerCase();
  return s.includes('creative') ? 'CREATIVE' : s.includes('low') || s.includes('admin') ? 'LOW_ADMIN' : 'HIGH_FOCUS';
}
function role(v: any): 'OWNER'|'ADMIN'|'MEMBER'|'VIEWER' {
  const s = text(v).toUpperCase();
  return s === 'OWNER' || s === 'ADMIN' || s === 'VIEWER' ? s : 'MEMBER';
}
function skillTier(level: any): 'NOVICE'|'APPRENTICE'|'PRACTITIONER'|'EXPERT'|'MASTER' {
  const n = number(level, 1);
  return n >= 10 ? 'MASTER' : n >= 7 ? 'EXPERT' : n >= 4 ? 'PRACTITIONER' : n >= 2 ? 'APPRENTICE' : 'NOVICE';
}
function legacy(row: Row): Prisma.InputJsonValue { return json(row); }

async function countTarget(tx: Tx) {
  const models = ['user','workspace','domain','goalOKR','project','task','subTask','timeLog','skill','userSkill','userBadge','calendarEvent','workspaceMember','teamProject','teamTask','projectMember','teamTaskSubtask','teamTaskComment','teamTaskTag','teamTaskTagAssignment','projectInvitation','userStats','googleConnection','legacySnapshot','databaseRevision'] as const;
  const result: Record<string, number> = {};
  for (const model of models) result[model] = await (tx as any)[model].count();
  return result;
}

export async function importLegacySnapshotToRelational(
  prisma: PrismaClient,
  exported: LegacySnapshotExport,
  options: { dryRun?: boolean } = {}
) {
  validateLegacyExport(exported);
  const archive = buildLegacyArchiveRow(exported);
  const snapshot = exported.snapshot;
  const partitions = object(snapshot.partitions);
  const userRows = array(snapshot.users).map(object);
  const userIds = new Set(userRows.map(u => text(u.id)).filter(Boolean));
  const report = {
    users: 0, workspaces: 0, personalTasks: 0, goals: 0, personalProjects: 0,
    subtasks: 0, keyResults: 0, calendarEvents: 0, timeLogs: 0, skills: 0,
    userSkills: 0, badges: 0, teamProjects: 0, teamTasks: 0, teamSubtasks: 0,
    teamComments: 0, teamTags: 0, invitations: 0, googleConnections: 0,
    stats: 0, preservedOrphanPartitions: 0
  };

  if (options.dryRun) return { status: 'DRY_RUN', archiveId: archive.id, checksum: archive.checksum, report };

  return prisma.$transaction(async (tx) => {
    const existingArchive = await tx.legacySnapshot.findUnique({ where: { id: archive.id } });
    if (existingArchive) {
      if (existingArchive.checksum !== archive.checksum) throw new Error('Legacy archive ID already exists with a different checksum.');
      return { status: 'ALREADY_IMPORTED', archiveId: archive.id, checksum: archive.checksum, report };
    }

    const target = await countTarget(tx);
    if (Object.values(target).some(count => count !== 0)) {
      throw new Error('Relational target is not empty. Import is all-or-nothing and will not mix existing data.');
    }

    await tx.legacySnapshot.create({ data: {
      id: archive.id, userId: null, sourceVersion: archive.sourceVersion,
      payload: json(archive.payload), checksum: archive.checksum
    }});

    // Users are inserted first so all ownership and collaboration foreign keys can be checked.
    for (const u of userRows) {
      if (!u.id || !u.email) throw new Error('A legacy user is missing its stable ID or email; import aborted.');
      const p = object(partitions[u.id]);
      const stats = object(p.stats);
      await tx.user.create({ data: {
        id: text(u.id), email: text(u.email).trim().toLowerCase(), name: text(u.name, text(u.email).split('@')[0]),
        avatarUrl: nullable(u.avatarUrl), avatarColor: text(u.avatarColor, 'from-violet-600 to-indigo-600'),
        initials: text(u.initials), title: text(u.title), role: text(u.role, 'Member'),
        joinedAt: date(u.joinedAt), passwordHash: nullable(u.passwordHash),
        googleId: nullable(u.googleId), totalXp: number(stats.totalXp), level: number(stats.userLevel, 1),
        rpgTitle: text(stats.rpgTitle, 'Novice Pioneer'), focusScore: number(stats.focusScore, 100),
        legacyData: legacy(u)
      }});
      report.users++;
    }

    // Workspaces and their membership edges.
    const workspaceRows = array(snapshot.workspaces).map(object);
    const workspaceIds = new Set(workspaceRows.map(w => text(w.id)));
    const usedSlugs = new Set<string>();
    for (const w of workspaceRows) {
      if (!userIds.has(text(w.ownerId))) throw new Error('Workspace owner is missing; refusing to orphan workspace '+text(w.id));
      let slug = text(w.slug, 'workspace-'+text(w.id)).toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');
      if (!slug) slug = 'workspace-'+text(w.id);
      const originalSlug = slug;
      let suffix = 1;
      while (usedSlugs.has(slug)) slug = originalSlug+'-'+(++suffix);
      usedSlugs.add(slug);
      await tx.workspace.create({ data: {
        id: text(w.id), name: text(w.name, 'Workspace'), slug,
        type: bool(w.isPersonal) ? 'PERSONAL' : 'TEAM', isPersonal: bool(w.isPersonal), ownerId: text(w.ownerId),
        createdAt: date(w.createdAt), legacyData: legacy(w)
      }});
      report.workspaces++;
    }
    for (const w of workspaceRows) {
      const members = array(w.members).map(object);
      const seen = new Set<string>();
      for (const m of members) {
        const userId = text(m.userId);
        if (!userIds.has(userId) || seen.has(userId)) continue;
        seen.add(userId);
        await tx.workspaceMember.create({ data: {
          id: text(m.id, 'wm-'+text(w.id)+'-'+userId), workspaceId: text(w.id), userId,
          role: role(m.role), joinedAt: date(m.joinedAt)
        }});
      }
      if (!seen.has(text(w.ownerId))) await tx.workspaceMember.create({ data: {
        id: 'wm-'+text(w.id)+'-'+text(w.ownerId), workspaceId: text(w.id), userId: text(w.ownerId), role: 'OWNER', joinedAt: date(w.createdAt)
      }});
    }

    // Personal resources are partitioned by user ID in the source snapshot.
    for (const [userId, rawPartition] of Object.entries(partitions)) {
      const p = object(rawPartition);
      if (!userIds.has(userId)) { report.preservedOrphanPartitions++; continue; }
      const taskRows = array(p.tasks).map(object);
      const projectRows = array(p.projects).map(object);
      const goalRows = array(p.goals).map(object);
      const taskIds = new Set(taskRows.map(t => text(t.id)));
      const projectIds = new Set(projectRows.map(x => text(x.id)));
      const goalIds = new Set(goalRows.map(x => text(x.id)));

      for (const g of goalRows) {
        await tx.goalOKR.create({ data: {
          id: text(g.id), userId, category: category(g.category), title: text(g.title, 'Untitled goal'),
          description: nullable(g.description), timeframe: timeframe(g.timeframe), targetDate: date(g.targetDate),
          progressPercent: number(g.progressPercent), createdAt: date(g.createdAt), updatedAt: date(g.updatedAt, date(g.createdAt)),
          legacyData: legacy(g)
        }});
        report.goals++;
      }
      for (const g of goalRows) for (const kr of array(g.keyResults).map(object)) {
        await tx.keyResult.create({ data: {
          id: text(kr.id), goalId: text(g.id), title: text(kr.title, 'Key result'),
          currentValue: number(kr.currentValue), targetValue: number(kr.targetValue, 100),
          unit: text(kr.unit, '%'), completed: bool(kr.completed), createdAt: date(kr.createdAt, date(g.createdAt)),
          updatedAt: date(kr.updatedAt, date(g.updatedAt, date(g.createdAt)))
        }});
        report.keyResults++;
      }
      for (const pjt of projectRows) {
        await tx.project.create({ data: {
          id: text(pjt.id), userId, goalId: goalIds.has(text(pjt.goalId)) ? text(pjt.goalId) : null,
          name: text(pjt.name, 'Untitled project'), description: nullable(pjt.description),
          color: text(pjt.color, 'blue'), status: status(pjt.status), targetHours: number(pjt.targetHours, 20),
          loggedHours: number(pjt.loggedHours), hourlyValuation: number(pjt.hourlyValuation, 85),
          driveFolderUrl: nullable(pjt.driveFolderUrl), createdAt: date(pjt.createdAt),
          updatedAt: date(pjt.updatedAt, date(pjt.createdAt)), legacyData: legacy(pjt)
        }});
        report.personalProjects++;
      }

      // Skills are shared catalog entities with per-user progress stored in UserSkill.
      const skillRows = array(p.skills).map(object);
      const skillIds = new Set(skillRows.map(x => text(x.id)));
      for (const sk of skillRows) {
        const existing = await tx.skill.findUnique({ where: { id: text(sk.id) } });
        if (!existing) {
          await tx.skill.create({ data: {
            id: text(sk.id), name: text(sk.name, 'Skill '+text(sk.id)), category: text(sk.category, 'General'),
            tier: skillTier(sk.level), icon: text(sk.icon, 'Zap'), description: text(sk.description),
            parentSkillId: null, requiredXp: number(sk.requiredXp, 500), legacyData: legacy(sk)
          }});
          report.skills++;
        }
      }
      for (const sk of skillRows) {
        if (sk.parentSkillId && skillIds.has(text(sk.parentSkillId))) {
          await tx.skill.update({ where: { id: text(sk.id) }, data: { parentSkillId: text(sk.parentSkillId) } });
        }
        await tx.userSkill.create({ data: {
          id: 'us-'+userId+'-'+text(sk.id), userId, skillId: text(sk.id),
          currentXp: number(sk.currentXp), level: number(sk.level, 1), masteryPct: number(sk.masteryPct, 10),
          isUnlocked: bool(sk.unlocked), unlockedAt: date(sk.unlockedAt), legacyData: legacy(sk)
        }});
        report.userSkills++;
      }

      for (const t of taskRows) {
        const validSkillId = skillIds.has(text(t.linkedSkillId)) ? text(t.linkedSkillId) : null;
        await tx.task.create({ data: {
          id: text(t.id), userId, goalId: goalIds.has(text(t.goalId)) ? text(t.goalId) : null,
          projectId: projectIds.has(text(t.projectId)) ? text(t.projectId) : null, title: text(t.title, 'Untitled task'),
          description: nullable(t.description), category: category(t.category), priority: priority(t.priority), status: status(t.status),
          eisenhower: quadrant(t.eisenhower), energyLevel: energy(t.energyLevel), dueDate: nullable(t.dueDate), dueTime: nullable(t.dueTime),
          durationMinutes: number(t.durationMinutes, 45), googleCalendarEventId: nullable(t.googleCalendarEventId),
          syncedToGoogle: bool(t.syncedToGoogle), calendarOverlay: text(t.calendarOverlay, 'work'), xpReward: number(t.xpReward, 50),
          linkedSkillId: validSkillId, driveDocUrl: nullable(t.driveDocUrl), tags: array(t.tags).map(x=>text(x)),
          completedAt: t.completedAt ? date(t.completedAt) : null, createdAt: date(t.createdAt), updatedAt: date(t.updatedAt, date(t.createdAt)),
          legacyData: legacy(t)
        }});
        report.personalTasks++;
        for (const st of array(t.subtasks).map(object)) {
          await tx.subTask.create({ data: {
            id: text(st.id), taskId: text(t.id), title: text(st.title, 'Subtask'), completed: bool(st.completed),
            estimatedMinutes: number(st.estimatedMinutes, 20), createdAt: date(st.createdAt, date(t.createdAt)),
            updatedAt: date(st.updatedAt, date(t.updatedAt, date(t.createdAt)))
          }});
          report.subtasks++;
        }
      }

      for (const ev of array(p.calendarEvents).map(object)) {
        const taskId = taskIds.has(text(ev.taskId)) ? text(ev.taskId) : null;
        await tx.calendarEvent.create({ data: {
          id: text(ev.id), userId, title: text(ev.title, 'Calendar event'), description: nullable(ev.description),
          startTime: date(ev.startTime), endTime: date(ev.endTime, date(ev.startTime)), category: text(ev.category, 'work'),
          calendarType: text(ev.calendarOverlay, 'work'), isGoogleEvent: bool(ev.isGoogleEvent),
          googleEventId: nullable(ev.googleEventId), htmlLink: nullable(ev.htmlLink), taskId,
          createdAt: date(ev.createdAt), updatedAt: date(ev.updatedAt, date(ev.createdAt)), legacyData: legacy(ev)
        }});
        report.calendarEvents++;
      }
      for (const log of array(p.timeLogs).map(object)) {
        await tx.timeLog.create({ data: {
          id: text(log.id), userId, taskId: taskIds.has(text(log.taskId)) ? text(log.taskId) : null,
          projectId: projectIds.has(text(log.projectId)) ? text(log.projectId) : null,
          durationSeconds: number(log.durationSeconds), hourlyRate: number(log.hourlyRate, 75),
          calculatedRoi: number(log.calculatedRoi), efficiencyRate: number(log.efficiencyRate, 90),
          energyReported: text(log.energyReported, 'High'), note: nullable(log.note), startedAt: date(log.startedAt),
          endedAt: date(log.endedAt), legacyData: legacy(log)
        }});
        report.timeLogs++;
      }
      for (const badge of array(p.badges).map(object)) {
        await tx.userBadge.create({ data: {
          id: 'badge-'+userId+'-'+text(badge.id), userId, badgeId: text(badge.id), name: text(badge.name),
          description: text(badge.description), icon: text(badge.icon), category: text(badge.category),
          xpBonus: number(badge.xpBonus, 100), unlockedAt: date(badge.unlockedAt), legacyData: legacy(badge)
        }});
        report.badges++;
      }
      const stats = object(p.stats);
      await tx.userStats.create({ data: {
        id: 'stats-'+userId, userId, focusMinutes: number(stats.focusMinutes), pomodoroSessions: number(stats.pomodoroSessions),
        totalXp: number(stats.totalXp), userLevel: number(stats.userLevel, 1), rpgTitle: text(stats.rpgTitle, 'Novice Pioneer'),
        focusScore: number(stats.focusScore, 100), totalRoiDollars: number(stats.totalRoiDollars),
        activityHistory: json(object(stats.activityHistory))
      }});
      report.stats++;
      const google = object(p.googleAuth);
      await tx.googleConnection.create({ data: {
        id: 'google-'+userId, userId, email: text(google.email), isConnected: bool(google.isConnected),
        googleId: nullable(object(userRows.find(u=>text(u.id)===userId)).googleId)
      }});
      report.googleConnections++;
    }

    // Team workspaces may be represented by a legacy sentinel ID; create a safe owner workspace if missing.
    const teamProjects = array(snapshot.teamProjects).map(object);
    for (const p of teamProjects) {
      const ownerId = text(p.ownerId);
      if (!userIds.has(ownerId)) throw new Error('Team project owner is missing; import aborted for '+text(p.id));
      let workspaceId = text(p.workspaceId);
      if (!workspaceIds.has(workspaceId)) {
        workspaceId = 'legacy-team-workspace-'+ownerId;
        if (!workspaceIds.has(workspaceId)) {
          await tx.workspace.create({ data: {
            id: workspaceId, name: 'Imported team workspace', slug: 'legacy-team-'+ownerId,
            type: 'TEAM', isPersonal: false, ownerId, createdAt: date(p.createdAt),
            legacyData: json({ sourceWorkspaceId: p.workspaceId })
          }});
          workspaceIds.add(workspaceId);
          report.workspaces++;
          await tx.workspaceMember.create({ data: {
            id: 'wm-'+workspaceId+'-'+ownerId, workspaceId, userId: ownerId, role: 'OWNER', joinedAt: date(p.createdAt)
          }});
        }
      }
      await tx.teamProject.create({ data: {
        id: text(p.id), workspaceId, ownerId, ownerEmail: text(p.ownerEmail, text(userRows.find(u=>text(u.id)===ownerId)?.email)),
        name: text(p.name, 'Untitled team project'), key: text(p.key, 'TEAM'), description: nullable(p.description),
        color: text(p.color, '#6366f1'), icon: text(p.icon, 'ShieldCheck'), targetDate: nullable(p.targetDate),
        createdAt: date(p.createdAt), legacyData: legacy(p)
      }});
      const memberIds = Array.from(new Set([ownerId, ...array(p.memberIds).map(x=>text(x))]));
      for (const memberId of memberIds) if (userIds.has(memberId)) {
        await tx.projectMember.create({ data: {
          id: 'pm-'+text(p.id)+'-'+memberId, projectId: text(p.id), userId: memberId,
          role: role(object(p.memberRoles)[memberId] || (memberId===ownerId?'OWNER':'MEMBER')), joinedAt: date(p.createdAt)
        }});
      }
      report.teamProjects++;
    }

    const teamTaskRows = array(snapshot.teamTasks).map(object);
    const teamProjectIds = new Set(teamProjects.map(p=>text(p.id)));
    const usedTaskNumbersByProject = new Map<string, Set<number>>();
    for (const t of teamTaskRows) {
      if (!teamProjectIds.has(text(t.projectId))) throw new Error('Team task references a missing project: '+text(t.id));
      const ownerId = text(teamProjects.find(p=>text(p.id)===text(t.projectId))?.ownerId);
      const assigneeId = userIds.has(text(t.assigneeId)) ? text(t.assigneeId) : null;
      const subtasks = array(t.subtasks).map(object), comments = array(t.comments).map(object), tags = array(t.tags).map(x=>text(x));
      const projectTaskNumbers = usedTaskNumbersByProject.get(text(t.projectId)) || new Set<number>();
      let taskNumber = Math.max(1, Math.floor(number(t.taskNumber, report.teamTasks+1)));
      while (projectTaskNumbers.has(taskNumber)) taskNumber++;
      projectTaskNumbers.add(taskNumber);
      usedTaskNumbersByProject.set(text(t.projectId), projectTaskNumbers);
      await tx.teamTask.create({ data: {
        id: text(t.id), projectId: text(t.projectId), taskNumber,
        columnId: text(t.columnId, 'todo'), title: text(t.title, 'Untitled team task'), description: nullable(t.description),
        priority: text(t.priority, 'medium'), assigneeId, dueDate: nullable(t.dueDate), estimatedHours: number(t.estimatedHours),
        subtasksJson: json(subtasks), tagsJson: json(tags), commentsJson: json(comments), order: number(t.order),
        createdAt: date(t.createdAt), updatedAt: date(t.updatedAt, date(t.createdAt)), legacyData: legacy(t)
      }});
      report.teamTasks++;
      for (let i=0;i<subtasks.length;i++) {
        const st=subtasks[i];
        await tx.teamTaskSubtask.create({data:{id:text(st.id),taskId:text(t.id),title:text(st.title,'Subtask'),completed:bool(st.completed),position:i}});
        report.teamSubtasks++;
      }
      for (const c of comments) {
        if (!userIds.has(text(c.authorId))) continue; // Full original comment remains in commentsJson and LegacySnapshot.
        await tx.teamTaskComment.create({data:{
          id:text(c.id),taskId:text(t.id),authorId:text(c.authorId),body:text(c.text),
          authorName:text(c.authorName),authorInitials:text(c.authorInitials),authorColor:text(c.authorColor),
          createdAt:date(c.createdAt),legacyData:legacy(c)
        }});
        report.teamComments++;
      }
      for (const tagName of Array.from(new Set(tags))) {
        const tagId='tag-'+text(t.projectId)+'-'+Buffer.from(tagName).toString('hex').slice(0,32);
        await tx.teamTaskTag.upsert({where:{projectId_name:{projectId:text(t.projectId),name:tagName}},create:{id:tagId,projectId:text(t.projectId),name:tagName},update:{}});
        const tag=await tx.teamTaskTag.findUnique({where:{projectId_name:{projectId:text(t.projectId),name:tagName}}});
        if(tag) await tx.teamTaskTagAssignment.upsert({where:{taskId_tagId:{taskId:text(t.id),tagId:tag.id}},create:{id:'tta-'+text(t.id)+'-'+tag.id,taskId:text(t.id),tagId:tag.id},update:{}});
        report.teamTags++;
      }
    }

    for (const inv of array(snapshot.teamInvitations).map(object)) {
      if (!teamProjectIds.has(text(inv.projectId)) || !userIds.has(text(inv.invitedByUserId))) continue;
      await tx.projectInvitation.create({ data: {
        id: text(inv.id), projectId: text(inv.projectId), invitedEmail: text(inv.invitedEmail).trim().toLowerCase(),
        invitedByUserId: text(inv.invitedByUserId), recipientId: text(userRows.find(u=>text(u.email).toLowerCase()===text(inv.invitedEmail).toLowerCase())?.id) || null, projectName: text(inv.projectName), projectKey: text(inv.projectKey),
        projectColor: text(inv.projectColor, '#6366f1'), invitedByName: text(inv.invitedByName),
        invitedByEmail: text(inv.invitedByEmail), role: role(inv.role), status: text(inv.status, 'PENDING'),
        createdAt: date(inv.createdAt), legacyData: legacy(inv)
      }});
      report.invitations++;
    }

    await tx.databaseRevision.create({ data: { id: 'root', version: 1n } });
    const verify = await countTarget(tx);
    if (verify.user !== report.users || verify.goalOKR !== report.goals || verify.project !== report.personalProjects ||
        verify.task !== report.personalTasks || verify.calendarEvent !== report.calendarEvents ||
        verify.timeLog !== report.timeLogs || verify.teamProject !== report.teamProjects ||
        verify.teamTask !== report.teamTasks || verify.legacySnapshot !== 1) {
      throw new Error('Post-import row-count reconciliation failed; transaction rolled back. '+JSON.stringify({verify,report}));
    }
    return { status: 'IMPORTED', archiveId: archive.id, checksum: archive.checksum, report, targetCounts: verify };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 120000 });
}
