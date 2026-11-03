import { Request, Response, NextFunction } from 'express';

// In-memory sliding window rate limiter
interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitRecord>();

/**
 * Clean up old rate limit records periodically
 */
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitStore.entries()) {
    if (now > record.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 60000).unref?.();

/**
 * Rate Limiter Middleware
 */
export function createRateLimiter(options: { windowMs: number; max: number; message?: string }) {
  return (req: Request, res: Response, next: NextFunction): void => {
    // If in serverless environment, avoid blocking if rate limiting store is fresh
    const ip = req.ip || (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const key = `${ip}:${req.baseUrl || req.path}`;

    const record = rateLimitStore.get(key);

    if (!record || now > record.resetTime) {
      rateLimitStore.set(key, {
        count: 1,
        resetTime: now + options.windowMs
      });
      return next();
    }

    if (record.count >= options.max) {
      const retryAfter = Math.ceil((record.resetTime - now) / 1000);
      res.setHeader('Retry-After', retryAfter);
      res.status(429).json({
        success: false,
        error: options.message || 'Too many requests, please slow down and try again later.',
        retryAfterSeconds: retryAfter
      });
      return;
    }

    record.count++;
    next();
  };
}

/**
 * Security Headers Middleware
 */
export function securityHeaders(req: Request, res: Response, next: NextFunction): void {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
}

/**
 * CORS Middleware with Vercel and production domain validation
 */
export function corsMiddleware(req: Request, res: Response, next: NextFunction): void {
  const origin = req.headers.origin;

  const isAllowedOrigin = (orig: string): boolean => {
    if (!orig) return true;

    // Allow localhost during dev or testing
    if (orig.includes('localhost') || orig.includes('127.0.0.1')) return true;

    // Allow any Vercel domain (*.vercel.app)
    if (orig.endsWith('.vercel.app')) return true;

    // Allow explicit APP_URL or CORS_ORIGIN
    if (process.env.APP_URL && orig === process.env.APP_URL.replace(/\/+$/, '')) return true;
    if (process.env.CORS_ORIGIN && (process.env.CORS_ORIGIN === '*' || orig === process.env.CORS_ORIGIN)) return true;

    // Allow VERCEL_URL if set by Vercel environment
    if (process.env.VERCEL_URL) {
      const vercelUrl = process.env.VERCEL_URL.replace(/^https?:\/\//, '');
      if (orig === `https://${vercelUrl}` || orig === `http://${vercelUrl}`) return true;
    }

    // In non-production or if CORS_ALLOW_ALL is enabled
    if (process.env.NODE_ENV !== 'production' || process.env.CORS_ALLOW_ALL === 'true') {
      return true;
    }

    return false;
  };

  if (origin && isAllowedOrigin(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else if (!origin) {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }

  next();
}

/**
 * Body string sanitizer
 */
export function sanitizeString(val: string): string {
  if (typeof val !== 'string') return val;
  return val.replace(/<[^>]*>?/gm, '');
}

/**
 * Recursive body sanitizer middleware
 */
export function sanitizeBody(req: Request, _res: Response, next: NextFunction): void {
  if (req.body && typeof req.body === 'object') {
    const sanitizeObj = (obj: any) => {
      for (const key of Object.keys(obj)) {
        if (typeof obj[key] === 'string') {
          obj[key] = sanitizeString(obj[key]);
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          sanitizeObj(obj[key]);
        }
      }
    };
    sanitizeObj(req.body);
  }
  next();
}
