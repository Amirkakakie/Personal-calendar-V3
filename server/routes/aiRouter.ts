import { Router, Request, Response } from 'express';
import { db } from '../db.ts';
import { geminiService } from '../services/geminiService.ts';

const router = Router();

// DECOMPOSE goal into actionable tasks
router.post('/decompose', async (req: Request, res: Response) => {
  const { goalTitle, context, category } = req.body;
  if (!goalTitle || typeof goalTitle !== 'string' || !goalTitle.trim()) {
    return res.status(400).json({ success: false, error: 'goalTitle is required' });
  }

  if (goalTitle.length > 300) {
    return res.status(400).json({ success: false, error: 'goalTitle must not exceed 300 characters' });
  }

  const safeContext = (context && typeof context === 'string') ? context.slice(0, 1000) : undefined;

  try {
    const result = await geminiService.decomposeGoal(goalTitle.trim(), safeContext, category);
    res.json({ success: true, data: result });
  } catch (error: any) {
    console.error('Goal decomposition route failed:', error);
    res.status(500).json({ success: false, error: error.message || 'Decomposition failed' });
  }
});

// GENERATE daily productivity briefing and tailored schedule (user-scoped)
router.post('/daily-brief', async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { energyLevel = 'High' } = req.body;
  const tasks = db.getTasks(userId);
  const goals = db.getGoals(userId);

  try {
    const briefing = await geminiService.generateDailyBriefing(tasks, goals, energyLevel);
    res.json({ success: true, data: briefing });
  } catch (error: any) {
    console.error('Daily briefing route failed:', error);
    res.status(500).json({ success: false, error: error.message || 'Briefing failed' });
  }
});

// ASK productivity coach
router.post('/coach', async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { message } = req.body;
  if (!message || typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ success: false, error: 'Message is required' });
  }

  if (message.length > 1000) {
    return res.status(400).json({ success: false, error: 'Message must not exceed 1000 characters' });
  }

  const tasks = db.getTasks(userId);
  const stats = db.getProductivityStats(userId);
  const contextSummary = `Total Tasks: ${tasks.length}, Completed: ${stats.completedCount}, Streak: ${stats.currentStreakDays} days, Completion Rate: ${stats.completionRate}%, Focus Minutes: ${stats.focusMinutesToday}`;

  try {
    const advice = await geminiService.askCoach(message.trim(), contextSummary);
    res.json({ success: true, advice });
  } catch (error: any) {
    console.error('AI Coach route failed:', error);
    res.status(500).json({ success: false, error: error.message || 'Coach request failed' });
  }
});

// STREAM productivity coach responses via Server-Sent Events (SSE)
router.post('/coach/stream', async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { message } = req.body;
  if (!message || typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ success: false, error: 'Message is required' });
  }

  if (message.length > 1000) {
    return res.status(400).json({ success: false, error: 'Message must not exceed 1000 characters' });
  }

  const tasks = db.getTasks(userId);
  const stats = db.getProductivityStats(userId);
  const contextSummary = `Total Tasks: ${tasks.length}, Completed: ${stats.completedCount}, Streak: ${stats.currentStreakDays} days, Completion Rate: ${stats.completionRate}%, Focus Minutes: ${stats.focusMinutesToday}`;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  try {
    for await (const chunk of geminiService.askCoachStream(message.trim(), contextSummary)) {
      res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
    }
    res.write(`data: [DONE]\n\n`);
    res.end();
  } catch (err: any) {
    res.write(`data: ${JSON.stringify({ error: err.message || 'Stream terminated' })}\n\n`);
    res.end();
  }
});

// PREDICTIVE BURNOUT & 48-HOUR DEADLINE RISK ALERT (user-scoped)
router.get('/burnout-risk', async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const tasks = db.getTasks(userId);
  const pending = tasks.filter(t => t.status !== 'completed');
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const in48h = new Date(now.getTime() + 48 * 3600 * 1000).toISOString().split('T')[0];

  // Detect tasks due within 48h
  const imminentTasks = pending.filter(t => t.dueDate && t.dueDate <= in48h);
  const totalImminentMinutes = imminentTasks.reduce((acc, t) => acc + (t.durationMinutes || 45), 0);
  const highFocusMinutes = imminentTasks.filter(t => t.energyLevel === 'High Focus' || t.priority === 'High')
    .reduce((acc, t) => acc + (t.durationMinutes || 45), 0);

  // Calculate Burnout Index (0 - 100)
  let burnoutIndex = Math.min(100, Math.round((totalImminentMinutes / 480) * 85));
  if (imminentTasks.length > 6) burnoutIndex = Math.min(100, burnoutIndex + 15);

  const riskLevel = burnoutIndex >= 75 ? 'Critical' : burnoutIndex >= 45 ? 'Moderate' : 'Low';

  const deadlineAlerts = imminentTasks.map(t => {
    const isToday = t.dueDate === todayStr;
    const severity = isToday && t.priority === 'High' ? 'Critical' : t.priority === 'High' ? 'Warning' : 'Healthy';
    return {
      taskId: t.id,
      taskTitle: t.title,
      dueDate: t.dueDate,
      category: t.category,
      estimatedRemainingMinutes: t.durationMinutes || 45,
      riskSeverity: severity,
      reason: isToday 
        ? 'Due today! High risk of delay if not blocked in morning circadian window.' 
        : 'Due within 48 hours with high cognitive requirement.',
      recommendedAction: t.energyLevel === 'High Focus' 
        ? 'Protect 90m uninterrupted deep work block at 09:00 AM.' 
        : 'Batch with related tasks or break into micro-subtasks.'
    };
  });

  res.json({
    success: true,
    data: {
      burnoutIndex,
      riskLevel,
      imminentTasksCount: imminentTasks.length,
      totalImminentMinutes,
      highFocusMinutes,
      deadlineAlerts,
      recommendation: riskLevel === 'Critical'
        ? 'Workload exceeds cognitive threshold for the next 48h. Delegate or reschedule non-essential Q3/Q4 items.'
        : riskLevel === 'Moderate'
        ? 'Balanced workload. Maintain 25m Pomodoro cycles to protect energy.'
        : 'Workload is optimal. Ideal window for creative exploratory sprints.'
    }
  });
});

// DYNAMIC TASK ATOMIZATION
router.post('/atomize', async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { taskId, taskTitle, category } = req.body;
  let title = taskTitle;
  let cat = category;

  if (taskId) {
    const t = db.getTaskById(taskId, userId);
    if (t) {
      title = t.title;
      cat = t.category;
    }
  }

  if (!title || typeof title !== 'string') {
    return res.status(400).json({ success: false, error: 'taskId or taskTitle is required' });
  }

  const cleanTitle = title.trim().slice(0, 300);

  try {
    const result = await geminiService.decomposeGoal(title, 'Atomize this into immediate tactical 15-45 minute execution subtasks', cat);
    
    if (taskId) {
      const task = db.getTaskById(taskId, userId);
      if (task) {
        const newSubtasks = (result.subtasks || []).map((st: any, i: number) => ({
          id: `st-atom-${Date.now()}-${i}`,
          title: st.title,
          completed: false,
          estimatedMinutes: st.estimatedMinutes || 25
        }));
        db.updateTask(taskId, {
          subtasks: [...task.subtasks, ...newSubtasks]
        }, userId);
      }
    }

    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Atomization failed' });
  }
});

// GET productivity statistics
router.get('/stats', (req: Request, res: Response) => {
  const userId = req.user!.id;
  const stats = db.getProductivityStats(userId);
  res.json({ success: true, data: stats });
});

export default router;
