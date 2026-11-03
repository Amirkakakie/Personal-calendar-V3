import { Router, Request, Response } from 'express';
import { db } from '../db.ts';
import type { TimeLog } from '../../src/types/index.ts';

const router = Router();

// GET all time logs
router.get('/', (_req: Request, res: Response) => {
  const logs = db.getTimeLogs();
  res.json({ success: true, count: logs.length, data: logs });
});

// LOG completed focus session / stopwatch run
router.post('/', (req: Request, res: Response) => {
  const body = req.body;
  if (!body.durationSeconds || body.durationSeconds <= 0) {
    return res.status(400).json({ success: false, error: 'Valid durationSeconds is required' });
  }

  const durationSeconds = Number(body.durationSeconds);
  const hourlyRate = Number(body.hourlyRate) || 85;
  const calculatedRoi = Number(((durationSeconds / 3600) * hourlyRate).toFixed(2));
  const efficiencyRate = Number(body.efficiencyRate) || 90;

  const newLog: TimeLog = {
    id: `timelog-${Date.now()}`,
    taskId: body.taskId,
    taskTitle: body.taskTitle,
    projectId: body.projectId,
    projectName: body.projectName,
    durationSeconds,
    hourlyRate,
    calculatedRoi,
    efficiencyRate,
    energyReported: body.energyReported || 'High Focus',
    note: body.note || '',
    startedAt: body.startedAt || new Date(Date.now() - durationSeconds * 1000).toISOString(),
    endedAt: body.endedAt || new Date().toISOString()
  };

  const saved = db.addTimeLog(newLog);

  // Award XP based on duration (1 XP per 30 seconds of deep work)
  const xpAward = Math.max(10, Math.floor(durationSeconds / 30));
  db.awardXp(xpAward);

  res.status(201).json({
    success: true,
    data: saved,
    xpAwarded: xpAward,
    currentStats: db.getProductivityStats()
  });
});

export default router;
