import { Prisma, PrismaClient } from '@prisma/client';
import type { DatabaseSchema, UserPartition, WorkspaceRecord, TeamProjectRecord, TeamTaskRecord, ProjectInvitationRecord, UserRecord } from '../db.ts';

type Tx = Prisma.TransactionClient;
type Row = Record<string, any>;
const obj = (v: any): Row => v && typeof v === 'object' && !Array.isArray(v) ? v : {};
const arr = (v: any): any[] => Array.isArray(v) ? v : [];
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));
const iso = (v: any): string => v instanceof Date ? v.toISOString() : typeof v === 'string' ? v : new Date(0).toISOString();
const asDate = (v: any): Date => { const d = v instanceof Date ? v : new Date(v || Date.now()); return Number.isNaN(d.getTime()) ? new Date() : d; };
const nullable = (v: any): string | null => v == null || v === '' ? null : String(v);
const metadata = (v: any): any => v == null ? {} : clone(v);
const text = (v: any, fallback = ''): string => typeof v === 'string' ? v : v == null ? fallback : String(v);
const num = (v: any, fallback = 0): number => Number.isFinite(Number(v)) ? Number(v) : fallback;
const bool = (v: any): boolean => Boolean(v);

function category(v: any): 'WORK_CAREER'|'ACADEMIC_STUDY'|'PERSONAL_GROWTH'|'HEALTH_HABITS' {
  const s=text(v).toLowerCase();
  if(s.includes('academic')||s.includes('study')) return 'ACADEMIC_STUDY';
  if(s.includes('personal')) return 'PERSONAL_GROWTH';
  if(s.includes('health')||s.includes('habit')) return 'HEALTH_HABITS';
  return 'WORK_CAREER';
}
function taskStatus(v: any): 'TODO'|'IN_PROGRESS'|'COMPLETED'|'ARCHIVED' {
  const s=text(v).toLowerCase();
  return s==='completed'?'COMPLETED':s==='archived'?'ARCHIVED':s==='in_progress'?'IN_PROGRESS':'TODO';
}
function priority(v: any): 'HIGH'|'MEDIUM'|'LOW' {
  const s=text(v).toLowerCase(); return s==='high'||s==='urgent'?'HIGH':s==='low'?'LOW':'MEDIUM';
}
function timeframe(v: any): 'YEARLY'|'QUARTERLY'|'MONTHLY' {
  const s=text(v).toLowerCase(); return s==='yearly'?'YEARLY':s==='monthly'?'MONTHLY':'QUARTERLY';
}
function quadrant(v: any): 'Q1_URGENT_IMPORTANT'|'Q2_NOT_URGENT_IMPORTANT'|'Q3_URGENT_NOT_IMPORTANT'|'Q4_NEITHER' {
  const s=text(v).toLowerCase(); return s.includes('q1')?'Q1_URGENT_IMPORTANT':s.includes('q3')?'Q3_URGENT_NOT_IMPORTANT':s.includes('q4')?'Q4_NEITHER':'Q2_NOT_URGENT_IMPORTANT';
}
function energy(v: any): 'HIGH_FOCUS'|'CREATIVE'|'LOW_ADMIN' {
  const s=text(v).toLowerCase(); return s.includes('creative')?'CREATIVE':s.includes('low')||s.includes('admin')?'LOW_ADMIN':'HIGH_FOCUS';
}
function role(v: any): 'OWNER'|'ADMIN'|'MEMBER'|'VIEWER' {
  const s=text(v).toUpperCase(); return s==='OWNER'||s==='ADMIN'||s==='VIEWER'?s:'MEMBER';
}
function tier(level: any): 'NOVICE'|'APPRENTICE'|'PRACTITIONER'|'EXPERT'|'MASTER' {
  const n=num(level,1); return n>=10?'MASTER':n>=7?'EXPERT':n>=4?'PRACTITIONER':n>=2?'APPRENTICE':'NOVICE';
}
function json(v: any): Prisma.InputJsonValue { return JSON.parse(JSON.stringify(v ?? null)) as Prisma.InputJsonValue; }
function legacy(row: any): any { return metadata(row); }

export async function loadRelationalSnapshot(prisma: PrismaClient): Promise<{ data: DatabaseSchema; version: bigint }> {
  const [users,workspaces,workspaceMembers,goals,keyResults,projects,tasks,subtasks,timeLogs,skills,userSkills,badges,events,stats,googleConnections,teamProjects,projectMembers,teamTasks,teamSubtasks,teamComments,teamTags,teamTagAssignments,invitations,revision] = await Promise.all([
    prisma.user.findMany(), prisma.workspace.findMany(), prisma.workspaceMember.findMany(),
    prisma.goalOKR.findMany(), prisma.keyResult.findMany(), prisma.project.findMany(), prisma.task.findMany(),
    prisma.subTask.findMany(), prisma.timeLog.findMany(), prisma.skill.findMany(), prisma.userSkill.findMany(),
    prisma.userBadge.findMany(), prisma.calendarEvent.findMany(), prisma.userStats.findMany(),
    prisma.googleConnection.findMany(), prisma.teamProject.findMany(), prisma.projectMember.findMany(),
    prisma.teamTask.findMany(), prisma.teamTaskSubtask.findMany(), prisma.teamTaskComment.findMany(),
    prisma.teamTaskTag.findMany(), prisma.teamTaskTagAssignment.findMany(), prisma.projectInvitation.findMany(),
    prisma.databaseRevision.findUnique({where:{id:'root'}})
  ]);
  if(!revision) throw new Error('Prisma relational revision row is missing.');
  const userById=new Map(users.map(u=>[u.id,u]));
  const partitionFor=(id:string):UserPartition => {
    if(!partitions[id]) partitions[id]={tasks:[],goals:[],projects:[],calendarEvents:[],timeLogs:[],skills:[],badges:[],stats:{focusMinutes:0,pomodoroSessions:0,totalXp:0,userLevel:1,rpgTitle:'Novice Pioneer',focusScore:100,totalRoiDollars:0,activityHistory:{}},googleAuth:{isConnected:false,email:''}};
    return partitions[id];
  };
  const partitions: Record<string,UserPartition>={};
  const userRecords: UserRecord[]=users.map(u=>{
    const raw=legacy(u.legacyData);
    const personalWorkspaceId=text(raw.personalWorkspaceId);
    partitionFor(u.id);
    return {...raw,id:u.id,email:u.email,name:u.name,passwordHash:u.passwordHash||'',role:u.role,title:u.title,avatarColor:u.avatarColor,avatarUrl:u.avatarUrl||undefined,googleId:u.googleId||undefined,initials:u.initials,joinedAt:iso(u.joinedAt),personalWorkspaceId} as UserRecord;
  });

  const workspaceRecords: WorkspaceRecord[]=workspaces.map(w=>{
    const raw=legacy(w.legacyData);
    const members=workspaceMembers.filter(m=>m.workspaceId===w.id).map(m=>({userId:m.userId,role:role(m.role),joinedAt:iso(m.joinedAt)}));
    return {...raw,id:w.id,name:w.name,slug:w.slug,ownerId:w.ownerId,isPersonal:w.isPersonal,createdAt:iso(w.createdAt),members} as WorkspaceRecord;
  });

  const goalById=new Map<string,any>();
  for(const g of goals){
    const raw=legacy(g.legacyData);
    const keyResultsForGoal=keyResults.filter(k=>k.goalId===g.id).map(k=>({...legacy(k.legacyData),id:k.id,title:k.title,currentValue:k.currentValue,targetValue:k.targetValue,unit:k.unit,completed:k.completed}));
    const record={...raw,id:g.id,userId:g.userId,title:g.title,description:g.description||'',category:raw.category||g.category,timeframe:raw.timeframe||g.timeframe.toLowerCase(),targetDate:iso(g.targetDate),progressPercent:g.progressPercent,keyResults:keyResultsForGoal,createdAt:iso(g.createdAt)};
    goalById.set(g.id,record); partitionFor(g.userId).goals.push(record);
  }
  for(const p of projects){
    const raw=legacy(p.legacyData);
    partitionFor(p.userId).projects.push({...raw,id:p.id,userId:p.userId,name:p.name,description:p.description||'',goalId:p.goalId||undefined,status:raw.status||p.status.toLowerCase(),targetHours:p.targetHours,loggedHours:p.loggedHours,hourlyValuation:p.hourlyValuation,color:p.color,driveFolderUrl:p.driveFolderUrl||undefined,createdAt:iso(p.createdAt)});
  }
  for(const t of tasks){
    const raw=legacy(t.legacyData);
    const children=subtasks.filter(st=>st.taskId===t.id).map(st=>({...legacy(st.legacyData),id:st.id,title:st.title,completed:st.completed,estimatedMinutes:st.estimatedMinutes}));
    partitionFor(t.userId).tasks.push({...raw,id:t.id,userId:t.userId,title:t.title,description:t.description||undefined,category:raw.category||t.category,priority:raw.priority||t.priority.toLowerCase(),status:raw.status||t.status.toLowerCase(),eisenhower:raw.eisenhower||t.eisenhower.toLowerCase(),energyLevel:raw.energyLevel||t.energyLevel.toLowerCase(),dueDate:t.dueDate||'',dueTime:t.dueTime||undefined,durationMinutes:t.durationMinutes,subtasks:children,goalId:t.goalId||undefined,projectId:t.projectId||undefined,tags:t.tags,googleCalendarEventId:t.googleCalendarEventId||undefined,syncedToGoogle:t.syncedToGoogle,calendarOverlay:t.calendarOverlay as any,recurrence:raw.recurrence,xpReward:t.xpReward,linkedSkillId:t.linkedSkillId||undefined,driveDocUrl:t.driveDocUrl||undefined,completedAt:t.completedAt?iso(t.completedAt):undefined,createdAt:iso(t.createdAt),updatedAt:iso(t.updatedAt)});
  }
  for(const e of events){
    const raw=legacy(e.legacyData);
    partitionFor(e.userId).calendarEvents.push({...raw,id:e.id,userId:e.userId,title:e.title,description:e.description||undefined,startTime:iso(e.startTime),endTime:iso(e.endTime),category:e.category,isGoogleEvent:e.isGoogleEvent,googleEventId:e.googleEventId||undefined,htmlLink:e.htmlLink||undefined,taskId:e.taskId||undefined,calendarOverlay:e.calendarType as any});
  }
  for(const l of timeLogs){
    const raw=legacy(l.legacyData);
    partitionFor(l.userId).timeLogs.push({...raw,id:l.id,userId:l.userId,taskId:l.taskId||undefined,projectId:l.projectId||undefined,durationSeconds:l.durationSeconds,hourlyRate:l.hourlyRate,calculatedRoi:l.calculatedRoi,efficiencyRate:l.efficiencyRate,energyReported:l.energyReported,note:l.note||undefined,startedAt:iso(l.startedAt),endedAt:iso(l.endedAt)});
  }
  for(const us of userSkills){
    const sk=skills.find(s=>s.id===us.skillId); if(!sk) continue;
    const raw=legacy(us.legacyData), skillRaw=legacy(sk.legacyData);
    partitionFor(us.userId).skills.push({...skillRaw,...raw,id:sk.id,name:sk.name,category:sk.category,level:us.level,currentXp:us.currentXp,requiredXp:sk.requiredXp,masteryPct:us.masteryPct,icon:sk.icon,description:sk.description,unlocked:us.isUnlocked,parentSkillId:sk.parentSkillId||undefined});
  }
  for(const b of badges){
    const raw=legacy(b.legacyData);
    partitionFor(b.userId).badges.push({...raw,id:b.badgeId,name:b.name,description:b.description,icon:b.icon,category:b.category,xpBonus:b.xpBonus,unlocked:true,unlockedAt:iso(b.unlockedAt)});
  }
  for(const st of stats){
    const history=obj(st.activityHistory);
    partitionFor(st.userId).stats={focusMinutes:st.focusMinutes,pomodoroSessions:st.pomodoroSessions,totalXp:st.totalXp,userLevel:st.userLevel,rpgTitle:st.rpgTitle,focusScore:st.focusScore,totalRoiDollars:st.totalRoiDollars,activityHistory:history};
  }
  for(const g of googleConnections) partitionFor(g.userId).googleAuth={isConnected:g.isConnected,email:g.email};

  const teamProjectRecords: TeamProjectRecord[]=teamProjects.map(p=>{
    const raw=legacy(p.legacyData), members=projectMembers.filter(m=>m.projectId===p.id);
    const memberRoles:Record<string,any>={}; for(const m of members) memberRoles[m.userId]=m.role;
    return {...raw,id:p.id,workspaceId:p.workspaceId,ownerId:p.ownerId,ownerEmail:p.ownerEmail,name:p.name,key:p.key,description:p.description||'',color:p.color,icon:p.icon,memberIds:members.map(m=>m.userId),memberRoles,targetDate:p.targetDate||undefined,createdAt:iso(p.createdAt)} as TeamProjectRecord;
  });
  const teamTaskRecords: TeamTaskRecord[]=teamTasks.map(t=>{
    const raw=legacy(t.legacyData);
    const children=teamSubtasks.filter(x=>x.taskId===t.id).sort((a,b)=>a.position-b.position).map(x=>({...legacy(x.legacyData),id:x.id,title:x.title,completed:x.completed}));
    const comments=teamComments.filter(x=>x.taskId===t.id).map(x=>({...legacy(x.legacyData),id:x.id,authorId:x.authorId,authorName:x.authorName,authorInitials:x.authorInitials,authorColor:x.authorColor,text:x.body,createdAt:iso(x.createdAt)}));
    const tags=teamTagAssignments.filter(a=>a.taskId===t.id).map(a=>teamTags.find(tag=>tag.id===a.tagId)?.name).filter(Boolean) as string[];
    return {...raw,id:t.id,taskNumber:t.taskNumber,projectId:t.projectId,columnId:t.columnId,title:t.title,description:t.description||undefined,priority:t.priority,assigneeId:t.assigneeId||undefined,dueDate:t.dueDate||undefined,estimatedHours:t.estimatedHours,subtasks:children,tags,comments,order:t.order,createdAt:iso(t.createdAt),updatedAt:iso(t.updatedAt)} as TeamTaskRecord;
  });
  const invitations: ProjectInvitationRecord[]=invitationsRows.map(i=>({...legacy(i.legacyData),id:i.id,projectId:i.projectId,projectName:i.projectName,projectKey:i.projectKey,projectColor:i.projectColor,invitedEmail:i.invitedEmail,invitedByUserId:i.invitedByUserId,invitedByName:i.invitedByName,invitedByEmail:i.invitedByEmail,role:i.role,status:i.status,createdAt:iso(i.createdAt)})) as any;
  const data: DatabaseSchema={version:'3.0-prisma-relational',users:userRecords,workspaces:workspaceRecords,partitions,teamProjects:teamProjectRecords,teamTasks:teamTaskRecords,teamInvitations:invitations};
  return {data,version:revision.version};
}

const invitationsRowsPlaceholder = null;

export async function persistRelationalSnapshot(prisma: PrismaClient, snapshot: DatabaseSchema, expectedVersion: bigint): Promise<bigint> {
  return prisma.$transaction(async (tx)=>{
    const claimed=await tx.databaseRevision.updateMany({where:{id:'root',version:expectedVersion},data:{version:{increment:1}}});
    if(claimed.count!==1) throw new Error('Chronos data changed in another instance. Refresh and retry; no write was committed.');
    const upsert=async(model:string,id:string,data:Row)=>{
      await (tx as any)[model].upsert({where:{id},create:{id,...data},update:data});
    };
    const deleteMissing=async(model:string,ids:string[])=>{
      await (tx as any)[model].deleteMany({where:ids.length?{id:{notIn:ids}}:{}});
    };
    const users=arr(snapshot.users).map(obj), workspaces=arr(snapshot.workspaces).map(obj);
    const partitions=obj(snapshot.partitions), allTasks:Row[]=[], allProjects:Row[]=[], allGoals:Row[]=[], allEvents:Row[]=[], allLogs:Row[]=[], allSkills:Row[]=[], allBadges:Row[]=[], allSubtasks:Row[]=[], allKeyResults:Row[]=[];
    for(const [userId,pRaw] of Object.entries(partitions)){
      const p=obj(pRaw);
      allTasks.push(...arr(p.tasks).map(t=>({...obj(t),userId})));
      allProjects.push(...arr(p.projects).map(t=>({...obj(t),userId})));
      allGoals.push(...arr(p.goals).map(t=>({...obj(t),userId})));
      allEvents.push(...arr(p.calendarEvents).map(t=>({...obj(t),userId})));
      allLogs.push(...arr(p.timeLogs).map(t=>({...obj(t),userId})));
      allSkills.push(...arr(p.skills).map(t=>({...obj(t),userId})));
      allBadges.push(...arr(p.badges).map(t=>({...obj(t),userId})));
    }
    const usersById=new Map(users.map(u=>[text(u.id),u]));
    const workspaceIds=new Set(workspaces.map(w=>text(w.id)));
    const teamProjects=arr(snapshot.teamProjects).map(obj);
    for(const p of teamProjects) if(!workspaceIds.has(text(p.workspaceId))){
      const owner=usersById.get(text(p.ownerId)); if(!owner) throw new Error('Cannot persist team project with missing owner: '+text(p.id));
      const wid='legacy-team-workspace-'+text(p.ownerId);
      if(!workspaceIds.has(wid)){
        const ws={id:wid,name:'Imported team workspace',slug:'legacy-team-'+text(p.ownerId),ownerId:text(p.ownerId),isPersonal:false,members:[{userId:text(p.ownerId),role:'OWNER',joinedAt:iso(p.createdAt)}],createdAt:iso(p.createdAt)};
        workspaces.push(ws); workspaceIds.add(wid);
      }
      p.workspaceId=wid;
    }
    for(const g of allGoals) allKeyResults.push(...arr(g.keyResults).map(k=>({...obj(k),goalId:text(g.id)})));
    for(const t of allTasks) allSubtasks.push(...arr(t.subtasks).map(k=>({...obj(k),taskId:text(t.id)})));

    for(const u of users){
      const p=obj(partitions[text(u.id)]), stats=obj(p.stats);
      await upsert('user',text(u.id),{email:text(u.email).trim().toLowerCase(),name:text(u.name),avatarUrl:nullable(u.avatarUrl),avatarColor:text(u.avatarColor,'from-violet-600 to-indigo-600'),initials:text(u.initials),title:text(u.title),role:text(u.role,'Member'),joinedAt:asDate(u.joinedAt),passwordHash:nullable(u.passwordHash),googleId:nullable(u.googleId),totalXp:num(stats.totalXp),level:num(stats.userLevel,1),rpgTitle:text(stats.rpgTitle,'Novice Pioneer'),focusScore:num(stats.focusScore,100),legacyData:json(u)});
    }
    for(const w of workspaces){
      await upsert('workspace',text(w.id),{name:text(w.name,'Workspace'),slug:text(w.slug,'workspace-'+text(w.id)),type:bool(w.isPersonal)?'PERSONAL':'TEAM',isPersonal:bool(w.isPersonal),ownerId:text(w.ownerId),createdAt:asDate(w.createdAt),legacyData:json(w)});
      for(const m of arr(w.members).map(obj)) await (tx as any).workspaceMember.upsert({where:{workspaceId_userId:{workspaceId:text(w.id),userId:text(m.userId)}},create:{id:'wm-'+text(w.id)+'-'+text(m.userId),workspaceId:text(w.id),userId:text(m.userId),role:role(m.role),joinedAt:asDate(m.joinedAt)},update:{role:role(m.role),joinedAt:asDate(m.joinedAt)}});
    }
    for(const g of allGoals){
      await upsert('goalOKR',text(g.id),{userId:text(g.userId),category:category(g.category),title:text(g.title,'Untitled goal'),description:nullable(g.description),timeframe:timeframe(g.timeframe),targetDate:asDate(g.targetDate),progressPercent:num(g.progressPercent),createdAt:asDate(g.createdAt),updatedAt:asDate(g.updatedAt||g.createdAt),legacyData:json(g)});
      for(const kr of arr(g.keyResults).map(obj)) await upsert('keyResult',text(kr.id),{goalId:text(g.id),title:text(kr.title),currentValue:num(kr.currentValue),targetValue:num(kr.targetValue,100),unit:text(kr.unit,'%'),completed:bool(kr.completed),createdAt:asDate(kr.createdAt||g.createdAt),updatedAt:asDate(kr.updatedAt||g.updatedAt||g.createdAt)});
    }
    for(const p of allProjects) await upsert('project',text(p.id),{userId:text(p.userId),goalId:nullable(p.goalId),name:text(p.name,'Untitled project'),description:nullable(p.description),color:text(p.color,'blue'),status:taskStatus(p.status),targetHours:num(p.targetHours,20),loggedHours:num(p.loggedHours),hourlyValuation:num(p.hourlyValuation,85),driveFolderUrl:nullable(p.driveFolderUrl),createdAt:asDate(p.createdAt),updatedAt:asDate(p.updatedAt||p.createdAt),legacyData:json(p)});
    for(const sk of allSkills){
      await upsert('skill',text(sk.id),{name:text(sk.name,'Skill'),category:text(sk.category,'General'),tier:tier(sk.level),icon:text(sk.icon,'Zap'),description:text(sk.description),parentSkillId:nullable(sk.parentSkillId),requiredXp:num(sk.requiredXp,500),legacyData:json(sk)});
      await (tx as any).userSkill.upsert({where:{userId_skillId:{userId:text(sk.userId),skillId:text(sk.id)}},create:{id:'us-'+text(sk.userId)+'-'+text(sk.id),userId:text(sk.userId),skillId:text(sk.id),currentXp:num(sk.currentXp),level:num(sk.level,1),masteryPct:num(sk.masteryPct,10),isUnlocked:bool(sk.unlocked),legacyData:json(sk)},update:{currentXp:num(sk.currentXp),level:num(sk.level,1),masteryPct:num(sk.masteryPct,10),isUnlocked:bool(sk.unlocked),legacyData:json(sk)}});
    }
    for(const t of allTasks){
      const skillId=allSkills.some(sk=>text(sk.id)===text(t.linkedSkillId))?nullable(t.linkedSkillId):null;
      await upsert('task',text(t.id),{userId:text(t.userId),goalId:nullable(t.goalId),projectId:nullable(t.projectId),title:text(t.title,'Untitled task'),description:nullable(t.description),category:category(t.category),priority:priority(t.priority),status:taskStatus(t.status),eisenhower:quadrant(t.eisenhower),energyLevel:energy(t.energyLevel),dueDate:nullable(t.dueDate),dueTime:nullable(t.dueTime),durationMinutes:num(t.durationMinutes,45),googleCalendarEventId:nullable(t.googleCalendarEventId),syncedToGoogle:bool(t.syncedToGoogle),calendarOverlay:text(t.calendarOverlay,'work'),xpReward:num(t.xpReward,50),linkedSkillId:skillId,driveDocUrl:nullable(t.driveDocUrl),tags:arr(t.tags).map(x=>text(x)),completedAt:t.completedAt?asDate(t.completedAt):null,createdAt:asDate(t.createdAt),updatedAt:asDate(t.updatedAt||t.createdAt),legacyData:json(t)});
      for(const st of arr(t.subtasks).map(obj)) await upsert('subTask',text(st.id),{taskId:text(t.id),title:text(st.title),completed:bool(st.completed),estimatedMinutes:num(st.estimatedMinutes,20),legacyData:json(st)});
    }
    for(const e of allEvents) await upsert('calendarEvent',text(e.id),{userId:text(e.userId),title:text(e.title),description:nullable(e.description),startTime:asDate(e.startTime),endTime:asDate(e.endTime),category:text(e.category,'work'),calendarType:text(e.calendarOverlay,'work'),isGoogleEvent:bool(e.isGoogleEvent),googleEventId:nullable(e.googleEventId),htmlLink:nullable(e.htmlLink),taskId:nullable(e.taskId),legacyData:json(e)});
    for(const l of allLogs) await upsert('timeLog',text(l.id),{userId:text(l.userId),taskId:nullable(l.taskId),projectId:nullable(l.projectId),durationSeconds:num(l.durationSeconds),hourlyRate:num(l.hourlyRate,75),calculatedRoi:num(l.calculatedRoi),efficiencyRate:num(l.efficiencyRate,90),energyReported:text(l.energyReported,'High'),note:nullable(l.note),startedAt:asDate(l.startedAt),endedAt:asDate(l.endedAt),legacyData:json(l)});
    for(const b of allBadges) await upsert('userBadge','badge-'+text(b.userId)+'-'+text(b.id),{userId:text(b.userId),badgeId:text(b.id),name:text(b.name),description:text(b.description),icon:text(b.icon),category:text(b.category),xpBonus:num(b.xpBonus,100),unlockedAt:asDate(b.unlockedAt),legacyData:json(b)});
    for(const u of users){
      const p=obj(partitions[text(u.id)]), st=obj(p.stats), ga=obj(p.googleAuth);
      await upsert('userStats','stats-'+text(u.id),{userId:text(u.id),focusMinutes:num(st.focusMinutes),pomodoroSessions:num(st.pomodoroSessions),totalXp:num(st.totalXp),userLevel:num(st.userLevel,1),rpgTitle:text(st.rpgTitle,'Novice Pioneer'),focusScore:num(st.focusScore,100),totalRoiDollars:num(st.totalRoiDollars),activityHistory:json(obj(st.activityHistory))});
      await upsert('googleConnection','google-'+text(u.id),{userId:text(u.id),email:text(ga.email),isConnected:bool(ga.isConnected),googleId:nullable(u.googleId),accessToken:null,refreshToken:null,tokenExpiry:null,calendarId:'primary'});
    }
    const teamProjectIds=new Set(teamProjects.map(p=>text(p.id)));
    for(const p of teamProjects){
      await upsert('teamProject',text(p.id),{workspaceId:text(p.workspaceId),ownerId:text(p.ownerId),ownerEmail:text(p.ownerEmail,text(usersById.get(text(p.ownerId))?.email)),name:text(p.name),key:text(p.key),description:nullable(p.description),color:text(p.color,'#6366f1'),icon:text(p.icon,'ShieldCheck'),targetDate:nullable(p.targetDate),createdAt:asDate(p.createdAt),legacyData:json(p)});
      for(const memberId of Array.from(new Set([text(p.ownerId),...arr(p.memberIds).map(x=>text(x))]))){
        if(!usersById.has(memberId)) continue;
        await (tx as any).projectMember.upsert({where:{projectId_userId:{projectId:text(p.id),userId:memberId}},create:{id:'pm-'+text(p.id)+'-'+memberId,projectId:text(p.id),userId:memberId,role:role(obj(p.memberRoles)[memberId]||(memberId===text(p.ownerId)?'OWNER':'MEMBER'))},update:{role:role(obj(p.memberRoles)[memberId]||(memberId===text(p.ownerId)?'OWNER':'MEMBER'))}});
      }
    }
    const teamTasks=arr(snapshot.teamTasks).map(obj), numbers=new Map<string,Set<number>>();
    for(const t of teamTasks){
      if(!teamProjectIds.has(text(t.projectId))) throw new Error('Team task references a missing team project: '+text(t.id));
      const set=numbers.get(text(t.projectId))||new Set<number>(); let n=Math.max(1,Math.floor(num(t.taskNumber,1))); while(set.has(n))n++; set.add(n); numbers.set(text(t.projectId),set);
      const subs=arr(t.subtasks).map(obj), comments=arr(t.comments).map(obj), tags=arr(t.tags).map(x=>text(x));
      await upsert('teamTask',text(t.id),{projectId:text(t.projectId),taskNumber:n,columnId:text(t.columnId,'todo'),title:text(t.title),description:nullable(t.description),priority:text(t.priority,'medium'),assigneeId:usersById.has(text(t.assigneeId))?nullable(t.assigneeId):null,dueDate:nullable(t.dueDate),estimatedHours:num(t.estimatedHours),subtasksJson:json(subs),tagsJson:json(tags),commentsJson:json(comments),order:num(t.order),createdAt:asDate(t.createdAt),updatedAt:asDate(t.updatedAt||t.createdAt),legacyData:json(t)});
      for(let i=0;i<subs.length;i++) await upsert('teamTaskSubtask',text(subs[i].id),{taskId:text(t.id),title:text(subs[i].title),completed:bool(subs[i].completed),position:i});
      for(const c of comments) if(usersById.has(text(c.authorId))) await upsert('teamTaskComment',text(c.id),{taskId:text(t.id),authorId:text(c.authorId),body:text(c.text),authorName:text(c.authorName),authorInitials:text(c.authorInitials),authorColor:text(c.authorColor),createdAt:asDate(c.createdAt),legacyData:json(c)});
      for(const tagName of Array.from(new Set(tags))){
        const tagId='tag-'+text(t.projectId)+'-'+Buffer.from(tagName).toString('hex').slice(0,32);
        await (tx as any).teamTaskTag.upsert({where:{projectId_name:{projectId:text(t.projectId),name:tagName}},create:{id:tagId,projectId:text(t.projectId),name:tagName},update:{}});
        const tag=await (tx as any).teamTaskTag.findUnique({where:{projectId_name:{projectId:text(t.projectId),name:tagName}}});
        if(tag) await (tx as any).teamTaskTagAssignment.upsert({where:{taskId_tagId:{taskId:text(t.id),tagId:tag.id}},create:{id:'tta-'+text(t.id)+'-'+tag.id,taskId:text(t.id),tagId:tag.id},update:{}});
      }
    }
    const userByEmail=new Map(users.map(u=>[text(u.email).toLowerCase(),text(u.id)]));
    for(const inv of arr(snapshot.teamInvitations).map(obj)){
      if(!teamProjectIds.has(text(inv.projectId))||!usersById.has(text(inv.invitedByUserId))) continue;
      await upsert('projectInvitation',text(inv.id),{projectId:text(inv.projectId),invitedEmail:text(inv.invitedEmail).trim().toLowerCase(),recipientId:userByEmail.get(text(inv.invitedEmail).toLowerCase())||null,invitedByUserId:text(inv.invitedByUserId),projectName:text(inv.projectName),projectKey:text(inv.projectKey),projectColor:text(inv.projectColor,'#6366f1'),invitedByName:text(inv.invitedByName),invitedByEmail:text(inv.invitedByEmail),role:role(inv.role),status:text(inv.status,'PENDING'),createdAt:asDate(inv.createdAt),legacyData:json(inv)});
    }

    const ids=(rows:any[])=>rows.map(x=>text(x.id)).filter(Boolean);
    const wsMemberIds=workspaces.flatMap(w=>arr(w.members).map(m=>'wm-'+text(w.id)+'-'+text(obj(m).userId)));
    const pMemberIds=teamProjects.flatMap(p=>Array.from(new Set([text(p.ownerId),...arr(p.memberIds).map(x=>text(x))])).filter(id=>usersById.has(id)).map(id=>'pm-'+text(p.id)+'-'+id));
    const subIds=allSubtasks.map(x=>text(x.id)), krIds=allKeyResults.map(x=>text(x.id));
    const teamSubIds=teamTasks.flatMap(t=>arr(t.subtasks).map(x=>text(obj(x).id)));
    const teamCommentIds=teamTasks.flatMap(t=>arr(t.comments).filter(c=>usersById.has(text(obj(c).authorId))).map(c=>text(obj(c).id)));
    const teamTagRows=teamTasks.flatMap(t=>Array.from(new Set(arr(t.tags).map(x=>text(x)))).map(tag=>'tag-'+text(t.projectId)+'-'+Buffer.from(tag).toString('hex').slice(0,32)));
    const tagAssignmentIds=teamTasks.flatMap(t=>Array.from(new Set(arr(t.tags).map(x=>text(x)))).map(tag=>'tta-'+text(t.id)+'-tag-'+text(t.projectId)+'-'+Buffer.from(tag).toString('hex').slice(0,32)));
    // Child and parent deletions are ordered to respect foreign keys and cascade rules.
    await deleteMissing('teamTaskTagAssignment',tagAssignmentIds); await deleteMissing('teamTaskComment',teamCommentIds); await deleteMissing('teamTaskSubtask',teamSubIds);
    await deleteMissing('teamTask',ids(teamTasks)); await deleteMissing('projectInvitation',ids(arr(snapshot.teamInvitations)));
    await deleteMissing('projectMember',pMemberIds); await deleteMissing('teamTaskTag',teamTagRows); await deleteMissing('teamProject',ids(teamProjects));
    await deleteMissing('workspaceMember',wsMemberIds); await deleteMissing('workspace',ids(workspaces));
    await deleteMissing('subTask',subIds); await deleteMissing('calendarEvent',ids(allEvents)); await deleteMissing('timeLog',ids(allLogs));
    await deleteMissing('task',ids(allTasks)); await deleteMissing('keyResult',krIds); await deleteMissing('goalOKR',ids(allGoals));
    await deleteMissing('project',ids(allProjects)); await deleteMissing('userBadge',allBadges.map(b=>'badge-'+text(b.userId)+'-'+text(b.id)));
    await deleteMissing('userSkill',allSkills.map(s=>'us-'+text(s.userId)+'-'+text(s.id))); await deleteMissing('skill',ids(allSkills));
    await deleteMissing('userStats',users.map(u=>'stats-'+text(u.id))); await deleteMissing('googleConnection',users.map(u=>'google-'+text(u.id)));
    await deleteMissing('user',ids(users));
    return expectedVersion+1n;
  },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable,timeout:120000});
}
