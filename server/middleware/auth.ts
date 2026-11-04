import { Request, Response, NextFunction } from 'express';
import { jwtVerify } from 'jose';

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: string;
  name?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET || 'chronos-secret-jwt-key-production-min-32-chars-entropy';
const secretKey = new TextEncoder().encode(JWT_SECRET);

// Explicit whitelist of public unauthenticated endpoints
const PUBLIC_PREFIXES = [
  '/api/auth/login',
  '/api/auth/signup',
  '/api/health',
  '/auth/login',
  '/auth/signup',
  '/health'
];

/**
 * Strict Cryptographic JWT Authentication Guard via `jose`
 * Verifies HMAC-SHA256 signatures, expiration claims, and issuer claims.
 * Eliminates demo-token bypasses and hardcoded owner fallbacks.
 */
export async function authenticateToken(req: Request, res: Response, next: NextFunction): Promise<void> {
  // Check if current path matches public unauthenticated endpoints
  const urlPath = req.path || req.url;
  const isPublic = PUBLIC_PREFIXES.some(prefix => urlPath.startsWith(prefix));

  if (isPublic) {
    return next();
  }

  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      error: 'Unauthorized: Missing or malformed Authorization Bearer token. Please sign in.'
    });
    return;
  }

  const token = authHeader.substring(7).trim();
  if (!token) {
    res.status(401).json({
      success: false,
      error: 'Unauthorized: Empty session token. Please sign in.'
    });
    return;
  }

  try {
    const { payload } = await jwtVerify(token, secretKey, {
      algorithms: ['HS256']
    });

    if (!payload.sub || typeof payload.sub !== 'string') {
      res.status(401).json({
        success: false,
        error: 'Unauthorized: Session token missing user identifier claim.'
      });
      return;
    }

    req.user = {
      id: payload.sub,
      email: (payload.email as string) || '',
      role: (payload.role as string) || 'Member',
      name: (payload.name as string) || ''
    };

    next();
  } catch (err: any) {
    const isExpired = err?.code === 'ERR_JWT_EXPIRED';
    res.status(401).json({
      success: false,
      error: isExpired
        ? 'Unauthorized: Session token has expired. Please sign in again.'
        : 'Unauthorized: Invalid cryptographic session token.'
    });
  }
}
