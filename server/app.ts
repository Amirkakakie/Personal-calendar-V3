import express, { Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import authRouter from './routes/authRouter.ts';
import tasksRouter from './routes/tasksRouter.ts';
import goalsRouter from './routes/goalsRouter.ts';
import calendarRouter from './routes/calendarRouter.ts';
import aiRouter from './routes/aiRouter.ts';
import projectsRouter from './routes/projectsRouter.ts';
import skillsRouter from './routes/skillsRouter.ts';
import timelogsRouter from './routes/timelogsRouter.ts';
import { db } from './db.ts';

import { authenticateToken } from './middleware/auth.ts';
import {
  securityHeaders,
  corsMiddleware,
  sanitizeBody,
  createRateLimiter
} from './middleware/security.ts';

dotenv.config();

export const app = express();

// Trust reverse proxy (Vercel, AWS, Cloudflare, etc.) for correct client IP detection
app.set('trust proxy', 1);

// Normalize URL path for serverless / proxy environments
// Ensures /api routes match whether called as /api/tasks or rewritten to /tasks
app.use((req: Request, _res: Response, next: NextFunction) => {
  if (req.url && !req.url.startsWith('/api') && !req.url.startsWith('/assets') && !req.url.startsWith('/@')) {
    const apiPrefixes = ['/auth', '/tasks', '/goals', '/calendar', '/ai', '/projects', '/skills', '/timelogs', '/health', '/stats'];
    if (apiPrefixes.some(prefix => req.url.startsWith(prefix))) {
      req.url = '/api' + req.url;
    }
  }
  next();
});

// Security Middleware Stack
app.use(securityHeaders);
app.use(corsMiddleware);

// Body Parser with safe size limit
app.use(express.json({ limit: '2mb' }));
app.use(sanitizeBody);

// General API Rate Limiting: 300 requests per minute
const globalApiLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 300,
  message: 'API rate limit exceeded. Please throttle your requests.'
});

// AI Endpoints Rate Limiter: 40 requests per minute
const aiRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 40,
  message: 'AI synthesis rate limit reached. Please wait a moment before trying again.'
});

app.use('/api', globalApiLimiter);
app.use('/api/ai', aiRateLimiter);

// Authentication Guard on API Endpoints (handles public exclusions internally)
app.use('/api', authenticateToken);

// API Route Handlers
app.use('/api/auth', authRouter);
app.use('/api/tasks', tasksRouter);
app.use('/api/goals', goalsRouter);
app.use('/api/calendar', calendarRouter);
app.use('/api/ai', aiRouter);
app.use('/api/projects', projectsRouter);
app.use('/api/skills', skillsRouter);
app.use('/api/timelogs', timelogsRouter);

// Health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    environment: process.env.NODE_ENV || 'development',
    serverless: Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME),
    service: 'Chronos Personal & Team Operating System',
    timestamp: new Date().toISOString(),
    geminiEnabled: Boolean(process.env.GEMINI_API_KEY)
  });
});

// Direct Productivity Stats endpoint (strictly user-scoped)
app.get('/api/stats', (req: Request, res: Response) => {
  try {
    const stats = db.getProductivityStats(req.user?.id);
    res.json({ success: true, data: stats });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to calculate stats' });
  }
});

// Centralized Global Error Handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[Chronos Server Error]:', err);
  const statusCode = err.status || err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    error: err.message || 'An unexpected internal server error occurred.'
  });
});

export default app;
