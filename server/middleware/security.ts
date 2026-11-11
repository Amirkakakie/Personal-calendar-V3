import { Request, Response, NextFunction } from 'express';
import { createHash } from 'node:crypto';

// Local fallback is intentionally limited to development and isolated tests.
// Production/serverless traffic is coordinated through Upstash Redis.
interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitRecord>();
const REDIS_RATE_LIMIT_SCRIPT = `
local count = redis.call('INCR', KEYS[1])
if count == 1 then redis.call('PEXPIRE', KEYS[1], ARGV[1]) end
local ttl = redis.call('PTTL', KEYS[1])
return { count, ttl }
`;

setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitStore.entries()) {
    if (now > record.resetTime) rateLimitStore.delete(key);
  }
}, 60000).unref?.();

function applyRateLimitResult(
  count: number,
  retryAfterMs: number,
  options: { max: number; message?: string },
  res: Response,
  next: NextFunction
): void {
  if (count > options.max) {
    const retryAfter = Math.max(1, Math.ceil(retryAfterMs / 1000));
    res.setHeader('Retry-After', retryAfter);
    res.status(429).json({
      success: false,
      error: options.message || 'Too many requests, please slow down and try again later.',
      retryAfterSeconds: retryAfter
    });
    return;
  }
  next();
}

async function consumeDistributedLimit(
  key: string,
  windowMs: number,
  max: number
): Promise<{ count: number; ttl: number }> {
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL?.replace(/\/+$/, '');
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!redisUrl || !redisToken) {
    throw new Error('UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are required for production rate limiting.');
  }

  const response = await fetch(`${redisUrl}/pipeline`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${redisToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify([[
      'EVAL',
      REDIS_RATE_LIMIT_SCRIPT,
      '1',
      key,
      String(windowMs),
      String(max)
    ]])
  });

  if (!response.ok) throw new Error(`Rate-limit store returned HTTP ${response.status}.`);
  const payload: any = await response.json();
  const result = Array.isArray(payload) ? payload[0]?.result : payload?.result;
  if (!Array.isArray(result) || !Number.isFinite(Number(result[0])) || !Number.isFinite(Number(result[1]))) {
    throw new Error('Rate-limit store returned an invalid response.');
  }
  return { count: Number(result[0]), ttl: Math.max(0, Number(result[1])) };
}

/**
 * Atomic shared rate limiter for production/serverless; process-local fallback
 * is allowed only for development and tests.
 */
export function createRateLimiter(options: { windowMs: number; max: number; message?: string }) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const route = req.baseUrl || req.path;
    const key = `chronos:rate-limit:${createHash('sha256').update(`${ip}:${route}`).digest('hex')}`;

    if (process.env.NODE_ENV === 'production') {
      void consumeDistributedLimit(key, options.windowMs, options.max)
        .then(({ count, ttl }) => applyRateLimitResult(count, ttl, options, res, next))
        .catch((error) => {
          console.error('[Security] Distributed rate limiter unavailable:', error);
          if (!res.headersSent) {
            res.status(503).json({
              success: false,
              error: 'Security rate limiting is temporarily unavailable. Please retry shortly.'
            });
          }
        });
      return;
    }

    const now = Date.now();
    const record = rateLimitStore.get(key);
    if (!record || now > record.resetTime) {
      rateLimitStore.set(key, { count: 1, resetTime: now + options.windowMs });
      next();
      return;
    }
    if (record.count >= options.max) {
      applyRateLimitResult(record.count, record.resetTime - now, options, res, next);
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
        if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
          delete obj[key];
          continue;
        }
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
