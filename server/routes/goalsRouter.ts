import { Router, Request, Response } from 'express';
import { db } from '../db.ts';
import type { GoalOKR } from '../../src/types/index.ts';

const router = Router();

// GET all goals for the authenticated user
router.get('/', (req: Request, res: Response) => {
  const userId = req.user!.id;
  const goals = db.getGoals(userId);
  const tasks = db.getTasks(userId);

  const enriched = goals.map(goal => {
    const linkedTasks = tasks.filter(t => t.goalId === goal.id);
    let calculatedProgress = goal.progressPercent;

    if (goal.keyResults && goal.keyResults.length > 0) {
      const krProgress = goal.keyResults.reduce((acc: number, kr: any) => {
        const p = Math.min(100, Math.round((kr.currentValue / (kr.targetValue || 1)) * 100));
        return acc + p;
      }, 0) / goal.keyResults.length;
      calculatedProgress = Math.round(krProgress);
    } else if (linkedTasks.length > 0) {
      const completed = linkedTasks.filter(t => t.status === 'completed').length;
      calculatedProgress = Math.round((completed / linkedTasks.length) * 100);
    }

    return {
      ...goal,
      progressPercent: calculatedProgress,
      linkedTasksCount: linkedTasks.length,
      completedTasksCount: linkedTasks.filter(t => t.status === 'completed').length
    };
  });

  res.json({ success: true, count: enriched.length, data: enriched });
});

// CREATE goal
router.post('/', (req: Request, res: Response) => {
  const userId = req.user!.id;
  const body = req.body;
  if (!body.title || !body.category) {
    return res.status(400).json({ success: false, error: 'Title and category are required' });
  }

  const id = (body.id && typeof body.id === 'string' && body.id.trim())
    ? body.id.trim()
    : `goal-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const newGoal: GoalOKR = {
    id,
    userId,
    title: body.title.trim(),
    description: body.description?.trim() || '',
    category: body.category,
    timeframe: body.timeframe || 'quarterly',
    targetDate: body.targetDate || new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0],
    progressPercent: Number(body.progressPercent) || 0,
    keyResults: Array.isArray(body.keyResults) ? body.keyResults : [],
    createdAt: new Date().toISOString()
  };

  const created = db.createGoal(newGoal, userId);
  res.status(201).json({ success: true, data: created });
});

// UPDATE goal
router.put('/:id', (req: Request, res: Response) => {
  const userId = req.user!.id;
  const updated = db.updateGoal(req.params.id, req.body, userId);
  if (!updated) {
    return res.status(404).json({ success: false, error: 'Goal not found' });
  }
  res.json({ success: true, data: updated });
});

// UPDATE Key Result progress
router.patch('/:id/kr/:krId', (req: Request, res: Response) => {
  const userId = req.user!.id;
  const goals = db.getGoals(userId);
  const goal = goals.find(g => g.id === req.params.id);
  if (!goal) {
    return res.status(404).json({ success: false, error: 'Goal not found' });
  }

  const { currentValue, completed } = req.body;
  const updatedKrs = goal.keyResults.map((kr: any) => {
    if (kr.id === req.params.krId) {
      const val = currentValue !== undefined ? Number(currentValue) : kr.currentValue;
      return {
        ...kr,
        currentValue: val,
        completed: completed !== undefined ? Boolean(completed) : val >= kr.targetValue
      };
    }
    return kr;
  });

  const updated = db.updateGoal(req.params.id, { keyResults: updatedKrs }, userId);
  res.json({ success: true, data: updated });
});

// DELETE goal
router.delete('/:id', (req: Request, res: Response) => {
  const userId = req.user!.id;
  const success = db.deleteGoal(req.params.id, userId);
  if (!success) {
    return res.status(404).json({ success: false, error: 'Goal not found' });
  }
  res.json({ success: true, message: 'Goal deleted' });
});

export default router;
