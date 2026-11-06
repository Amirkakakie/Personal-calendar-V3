import { Request, Response, NextFunction } from 'express';
import { jwtVerify } from 'jose';
import { db } from '../db.ts';

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

function getSecretKey(): Uint8Array {
  const JWT_SECRET = process.env.JWT_SECRET || 'chronos-dev-secret-key-production-min-32-chars-entropy-2026';
  return new TextEncoder().encode(JWT_SECRET);
}

// Whitelisted public endpoints that do not require an active JWT session
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
 * Verifies HMAC-SHA256 signatures, expiration, issuer ('chronos-os'), and audience ('chronos-clients').
 */
export async function authenticateToken(req: Request, res: Response, next: NextFunction): Promise<void> {
  const urlPath = req.path || req.url;
  const isPublic = PUBLIC_PREFIXES.some(prefix => urlPath.startsWith(prefix));

  if (isPublic) {
    return next();
  }

  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      error: 'Unauthorized: Missing or malformed Authorization Bearer token.'
    });
    return;
  }

  const token = authHeader.substring(7).trim();
  try {
    const { payload } = await jwtVerify(token, getSecretKey(), {
      algorithms: ['HS256'],
      issuer: 'chronos-os',
      audience: 'chronos-clients'
    });

    if (!payload.sub || typeof payload.sub !== 'string') {
      res.status(401).json({ success: false, error: 'Unauthorized: Invalid token claims.' });
      return;
    }

    // Verify account existence in database
    const user = db.getUserById(payload.sub);
    if (!user) {
      res.status(401).json({ success: false, error: 'Unauthorized: User account not found.' });
      return;
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name
    };

    next();
  } catch (err: any) {
    res.status(401).json({
      success: false,
      error: 'Unauthorized: Invalid or expired cryptographic session token.'
    });
  }
}
