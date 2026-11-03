import { Router, Request, Response } from 'express';
import { db } from '../db.ts';
import type { Project } from '../../src/types/index.ts';

const router = Router();

// GET all projects
router.get('/', (_req: Request, res: Response) => {
  const projects = db.getProjects();
  res.json({ success: true, count: projects.length, data: projects });
});

// GET project by ID
router.get('/:id', (req: Request, res: Response) => {
  const projects = db.getProjects();
  const proj = projects.find(p => p.id === req.params.id);
  if (!proj) {
    return res.status(404).json({ success: false, error: 'Project not found' });
  }
  res.json({ success: true, data: proj });
});

// CREATE new project
router.post('/', (req: Request, res: Response) => {
  const body = req.body;
  if (!body.name) {
    return res.status(400).json({ success: false, error: 'Project name is required' });
  }

  const newProject: Project = {
    id: `proj-${Date.now()}`,
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

  const saved = db.createProject(newProject);
  res.status(201).json({ success: true, data: saved });
});

// UPDATE project
router.put('/:id', (req: Request, res: Response) => {
  const updated = db.updateProject(req.params.id, req.body);
  if (!updated) {
    return res.status(404).json({ success: false, error: 'Project not found' });
  }
  res.json({ success: true, data: updated });
});

// DELETE project
router.delete('/:id', (req: Request, res: Response) => {
  const ok = db.deleteProject(req.params.id);
  if (!ok) {
    return res.status(404).json({ success: false, error: 'Project not found' });
  }
  res.json({ success: true, message: 'Project deleted' });
});

// Generate Google Docs Study/Project Notes Template link
router.get('/:id/doc-template', (req: Request, res: Response) => {
  const projects = db.getProjects();
  const proj = projects.find(p => p.id === req.params.id);
  if (!proj) {
    return res.status(404).json({ success: false, error: 'Project not found' });
  }

  const title = encodeURIComponent(`[Chronos OS] ${proj.name} - Architecture & Study Notes`);
  // Google Docs template creation link with prefilled title
  const docUrl = `https://docs.google.com/document/create?title=${title}`;

  res.json({
    success: true,
    data: {
      projectId: proj.id,
      title: proj.name,
      docTemplateUrl: docUrl
    }
  });
});

export default router;
