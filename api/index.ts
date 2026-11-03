import type { Request, Response } from 'express';
import app from '../server/app.ts';

/**
 * Vercel Serverless Function Handler
 * Automatically handles API routes (/api/*) when deployed to Vercel
 */
export default function handler(req: Request, res: Response) {
  return app(req, res);
}

export { app };
