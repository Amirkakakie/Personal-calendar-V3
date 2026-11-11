import { Request, Response, NextFunction } from 'express';
import { jwtVerify } from 'jose';
import { db } from '../db.ts';
import crypto from 'crypto';
import path from 'path';

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

export function getJwtSecret(): string {
  const configuredSecret = process.env.JWT_SECRET;

  if (process.env.NODE_ENV === 'production') {
    if (
      typeof configuredSecret !== 'string' ||
      Buffer.byteLength(configuredSecret, 'utf8') < 32 ||
      /replace_with|change[-_ ]in[-_ ]production|your[-_ ]secret|example/i.test(configuredSecret)
    ) {
      throw new Error(
        'JWT_SECRET must be configured as a stable, randomly generated secret of at least 32 bytes in production.'
      );
    }
    return configuredSecret;
  }

  if (process.env.NODE_ENV === 'test') {
    return configuredSecret || 'chronos-test-only-secret-key-not-for-any-deployment';
  }

  if (typeof configuredSecret !== 'string' || Buffer.byteLength(configuredSecret, 'utf8') < 32 ||
      /replace_with|change[-_ ]in[-_ ]production|your[-_ ]secret|example/i.test(configuredSecret)) {
    throw new Error('JWT_SECRET must be configured as a stable, randomly generated secret of at least 32 bytes in every non-test environment.');
  }
  return configuredSecret;
}

function getSecretKey(): Uint8Array {
  return new TextEncoder().encode(getJwtSecret());
}

// Whitelisted public endpoints with strict, exact-path resolution (prevents path traversal / substring bypass)
const EXACT_PUBLIC_PATHS = new Set([
  '/api/auth/login',
  '/api/auth/signup',
  '/api/auth/google',
  '/api/auth/google/config',
  '/api/health',
  '/api/health/db',
  '/auth/login',
  '/auth/signup',
  '/auth/google',
  '/auth/google/config',
  '/health',
  '/health/db'
]);

/**
 * Strict Cryptographic JWT Authentication Guard via `jose`
 * Verifies HMAC-SHA256 signatures, expiration, issuer ('chronos-os'), and audience ('chronos-clients').
 */
export async function authenticateToken(req: Request, res: Response, next: NextFunction): Promise<void> {
  // Normalize path and eliminate path traversal / query string bypasses
  const fullPath = req.baseUrl ? `${req.baseUrl}${req.path}` : (req.path || req.url);
  const normalizedPath = path.posix.normalize(fullPath.split('?')[0]);

  if (EXACT_PUBLIC_PATHS.has(normalizedPath) || EXACT_PUBLIC_PATHS.has(path.posix.normalize(req.path))) {
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
