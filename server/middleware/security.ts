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
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
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
 * Security Headers Middleware with CSP, HSTS, and frame protection
 */
export function securityHeaders(req: Request, res: Response, next: NextFunction): void {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  // Restrictive Content Security Policy; add only explicitly required external origins.
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' https://accounts.google.com; style-src 'self' 'unsafe-inline'; font-src 'self' data:; img-src 'self' data: https: blob:; connect-src 'self' https://accounts.google.com https://oauth2.googleapis.com https://generativelanguage.googleapis.com; frame-src https://accounts.google.com; frame-ancestors 'self'; base-uri 'self'; form-action 'self'; object-src 'none'; upgrade-insecure-requests;"
  );
  next();
}

/**
 * CORS Middleware with strict hostname validation
 */
export function corsMiddleware(req: Request, res: Response, next: NextFunction): void {
  const origin = req.headers.origin;
  const allowedOrigins = new Set<string>();
  const addOrigin = (value?: string) => {
    if (!value) return;
    try { const parsed = new URL(value); if (parsed.protocol === 'https:' || parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') allowedOrigins.add(parsed.origin); } catch {}
  };
  addOrigin(process.env.APP_URL);
  for (const value of (process.env.CORS_ORIGIN || '').split(',')) addOrigin(value.trim());
  if (process.env.VERCEL_URL) {
    const vercelUrl = process.env.VERCEL_URL.trim();
    addOrigin(vercelUrl.startsWith('http://') || vercelUrl.startsWith('https://') ? vercelUrl : `https://${vercelUrl}`);
  }
  if (process.env.NODE_ENV !== 'production') {
    addOrigin('http://localhost:3000'); addOrigin('http://localhost:5173');
    addOrigin('http://127.0.0.1:3000'); addOrigin('http://127.0.0.1:5173');
  }
  res.vary('Origin');
  if (origin) {
    let normalized = ''; try { normalized = new URL(origin).origin; } catch {}
    if (!normalized || !allowedOrigins.has(normalized)) { res.status(403).json({ success: false, error: 'Origin is not allowed.' }); return; }
    res.setHeader('Access-Control-Allow-Origin', normalized);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');
  res.setHeader('Access-Control-Max-Age', '600');
  if (req.method === 'OPTIONS') { res.sendStatus(204); return; }
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
 * Recursive body sanitizer middleware with prototype pollution prevention
 * and password preservation.
 */
export function sanitizeBody(req: Request, _res: Response, next: NextFunction): void {
  if (req.body && typeof req.body === 'object') {
    const sanitizeObj = (obj: any) => {
      for (const key of Object.keys(obj)) {
        // Guard against prototype pollution keys
        if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
          delete obj[key];
          continue;
        }
        // Preserve passwords and authentication tokens intact
        if (key === 'password' || key === 'confirmPassword' || key === 'token' || key === 'secret') {
          continue;
        }
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
