import { Router, Request, Response } from 'express';
import { db } from '../db.ts';
import type { Project } from '../../src/types/index.ts';

const router = Router();

// GET all projects for the authenticated user
router.get('/', (req: Request, res: Response) => {
  const userId = req.user?.id;
  const projects = db.getProjects(userId);
  res.json({ success: true, count: projects.length, data: projects });
});

// GET project by ID
router.get('/:id', (req: Request, res: Response) => {
  const userId = req.user?.id;
  const projects = db.getProjects(userId);
  const proj = projects.find(p => p.id === req.params.id);
  if (!proj) {
    return res.status(404).json({ success: false, error: 'Project not found' });
  }
  res.json({ success: true, data: proj });
});

// CREATE new project
router.post('/', (req: Request, res: Response) => {
  const userId = req.user?.id;
  const body = req.body;
  if (!body.name) {
    return res.status(400).json({ success: false, error: 'Project name is required' });
  }

  const newProject: Project = {
    id: `proj-${Date.now()}`,
    userId,
    name: body.name,
    description: body.description || '',
    category: body.category || 'Work/Career',
    status: body.status || 'in_progress',
    targetHours: Number(body.targetHours) || 20,
    loggedHours: Number(body.loggedHours) || 0,
    hourlyValuation: Number(body.hourlyValuation) || 100,
    color: body.color || 'blue',
    driveFolderUrl: body.driveFolderUrl || 'https://drive.google.com/drive/u/0/my-drive',
    tasksCount: 0,
    completedTasksCount: 0,
    createdAt: new Date().toISOString()
  };

  const saved = db.createProject(newProject, userId);
  res.status(201).json({ success: true, data: saved });
});

// UPDATE project
router.put('/:id', (req: Request, res: Response) => {
  const userId = req.user?.id;
  const updated = db.updateProject(req.params.id, req.body, userId);
  if (!updated) {
    return res.status(404).json({ success: false, error: 'Project not found' });
  }
  res.json({ success: true, data: updated });
});

// DELETE project
router.delete('/:id', (req: Request, res: Response) => {
  const userId = req.user?.id;
  const success = db.deleteProject(req.params.id, userId);
  if (!success) {
    return res.status(404).json({ success: false, error: 'Project not found' });
  }
  res.json({ success: true, message: 'Project deleted successfully' });
});

// GET project Google Doc template
router.get('/:id/doc-template', (req: Request, res: Response) => {
  const userId = req.user?.id;
  const projects = db.getProjects(userId);
  const proj = projects.find(p => p.id === req.params.id);
  if (!proj) {
    return res.status(404).json({ success: false, error: 'Project not found' });
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
