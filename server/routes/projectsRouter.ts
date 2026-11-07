import { Router, Request, Response } from 'express';
import { db } from '../db.ts';
import type { Project } from '../../src/types/index.ts';

const router = Router();

// GET all personal projects for the authenticated user
router.get('/', (req: Request, res: Response) => {
  const userId = req.user!.id;
  const projects = db.getProjects(userId);
  res.json({ success: true, count: projects.length, data: projects });
});

// GET personal project by ID (verifies ownership, returns 404 if owned by someone else)
router.get('/:id', (req: Request, res: Response) => {
  const userId = req.user!.id;
  const proj = db.getProjectById(req.params.id, userId);
  if (!proj) {
    return res.status(404).json({ success: false, error: 'Project not found or access denied' });
  }
  res.json({ success: true, data: proj });
});

function sanitizeDriveUrl(url?: string): string {
  if (!url || typeof url !== 'string') return 'https://drive.google.com/drive/u/0/my-drive';
  const trimmed = url.trim();
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return 'https://drive.google.com/drive/u/0/my-drive';
}

// CREATE new personal project (assigns server-verified userId)
router.post('/', (req: Request, res: Response) => {
  const userId = req.user!.id;
  const body = req.body;
  if (!body.name || typeof body.name !== 'string' || !body.name.trim()) {
    return res.status(400).json({ success: false, error: 'Project name is required' });
  }

  const newProject: Project = {
    id: `proj-${Date.now()}`,
    userId,
    name: body.name.trim(),
    description: body.description?.trim() || '',
    category: body.category || 'Work/Career',
    status: body.status || 'in_progress',
    targetHours: Number(body.targetHours) || 20,
    loggedHours: Number(body.loggedHours) || 0,
    hourlyValuation: Number(body.hourlyValuation) || 100,
    color: body.color || 'blue',
    driveFolderUrl: sanitizeDriveUrl(body.driveFolderUrl),
    tasksCount: 0,
    completedTasksCount: 0,
    createdAt: new Date().toISOString()
  };

  const saved = db.createProject(newProject, userId);
  res.status(201).json({ success: true, data: saved });
});

// UPDATE project (ownership verified)
router.put('/:id', (req: Request, res: Response) => {
  const userId = req.user!.id;
  const existing = db.getProjectById(req.params.id, userId);
  if (!existing) {
    return res.status(404).json({ success: false, error: 'Project not found or access denied' });
  }

  const safeUpdates = { ...req.body };
  if (safeUpdates.driveFolderUrl) {
    safeUpdates.driveFolderUrl = sanitizeDriveUrl(safeUpdates.driveFolderUrl);
  }

  const updated = db.updateProject(req.params.id, safeUpdates, userId);
  if (!updated) {
    return res.status(404).json({ success: false, error: 'Project not found or access denied' });
  }
  res.json({ success: true, data: updated });
});

// DELETE project (ownership verified)
router.delete('/:id', (req: Request, res: Response) => {
  const userId = req.user!.id;
  const existing = db.getProjectById(req.params.id, userId);
  if (!existing) {
    return res.status(404).json({ success: false, error: 'Project not found or access denied' });
  }

  db.deleteProject(req.params.id, userId);
  res.json({ success: true, message: 'Project deleted successfully' });
});

// GET project Google Doc template
router.get('/:id/doc-template', (req: Request, res: Response) => {
  const userId = req.user!.id;
  const proj = db.getProjectById(req.params.id, userId);
  if (!proj) {
    return res.status(404).json({ success: false, error: 'Project not found or access denied' });
  }

  const docTitle = encodeURIComponent(`[Chronos] ${proj.name} - Technical RFC & Architecture`);
  const templateDocUrl = `https://docs.google.com/document/create?title=${docTitle}`;

  res.json({
    success: true,
    data: {
      projectId: proj.id,
      title: proj.name,
      docTemplateUrl: templateDocUrl
    }
  });
});

export default router;
