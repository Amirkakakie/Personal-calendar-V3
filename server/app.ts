import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import authRouter from './routes/authRouter.ts';
import tasksRouter from './routes/tasksRouter.ts';
import goalsRouter from './routes/goalsRouter.ts';
import calendarRouter from './routes/calendarRouter.ts';
import aiRouter from './routes/aiRouter.ts';
import projectsRouter from './routes/projectsRouter.ts';
import skillsRouter from './routes/skillsRouter.ts';
import timelogsRouter from './routes/timelogsRouter.ts';
import workspacesRouter from './routes/workspacesRouter.ts';
import { db } from './db.ts';

import { authenticateToken } from './middleware/auth.ts';
import {
  securityHeaders,
  corsMiddleware,
  sanitizeBody,
  createRateLimiter
} from './middleware/security.ts';

export const app = express();

// Trust reverse proxy (Vercel, AWS, Cloudflare, etc.) for correct client IP detection
app.set('trust proxy', 1);

// Normalize URL path for serverless / proxy environments
// Ensures /api routes match whether called as /api/tasks or rewritten to /tasks
app.use((req: Request, _res: Response, next: NextFunction) => {
  if (req.url && !req.url.startsWith('/api') && !req.url.startsWith('/assets') && !req.url.startsWith('/@')) {
    const apiPrefixes = ['/auth', '/workspaces', '/team', '/tasks', '/goals', '/calendar', '/ai', '/projects', '/skills', '/timelogs', '/health', '/stats'];
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

// Authentication Rate Limiter: 15 attempts per minute (brute-force defense)
const authRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 15,
  message: 'Too many authentication attempts. Please wait one minute before trying again.'
});

app.use('/api', globalApiLimiter);
app.use('/api/auth/login', authRateLimiter);
app.use('/api/auth/signup', authRateLimiter);
app.use('/api/auth/google', authRateLimiter);
app.use('/api/ai', aiRateLimiter);

// Persistent database request boundary.
// Every authenticated API request reads the latest committed snapshot before
// authorization/business logic. Responses are held until all writes from that
// request have been durably acknowledged by PostgreSQL.
app.use('/api', async (req: Request, res: Response, next: NextFunction) => {
  const path = req.path;
  if (req.method === 'OPTIONS' || path === '/health' || path === '/health/db') return next();

  try {
    await db.ready();
    await db.refresh();

    const originalSend = res.send.bind(res);
    let sending = false;
    (res as any).send = (body: any) => {
      if (sending) return originalSend(body);
      sending = true;
      void db.flush()
        .then(() => originalSend(body))
        .catch((error: any) => {
          console.error('[Chronos DB] Request could not be committed:', error);
          if (!res.headersSent) {
            res.status(503);
            originalSend(JSON.stringify({
              success: false,
              error: 'Your changes could not be saved because persistent storage is unavailable. Please retry.'
            }));
          } else {
            res.destroy(error);
          }
        });
      return res;
    };

    next();
  } catch (error: any) {
    console.error('[Chronos DB] Request blocked because persistence is unavailable:', error);
    res.status(503).json({
      success: false,
      error: 'Chronos persistent storage is unavailable. No changes were accepted.'
    });
  }
});

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
app.use('/api', workspacesRouter);

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

// Database & Persistence Engine Diagnostic Health Endpoint
app.get('/api/health/db', (_req: Request, res: Response) => {
  const health = db.getHealthInfo();
  res.status(health.status === 'healthy' ? 200 : 503).json(health);
});

// Direct Productivity Stats endpoint (strictly user-scoped)
app.get('/api/stats', authenticateToken, (req: Request, res: Response) => {
  try {
    const stats = db.getProductivityStats(req.user!.id);
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
