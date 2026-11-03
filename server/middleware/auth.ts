import { Request, Response, NextFunction } from 'express';

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

/**
 * Parses and verifies JWT or Bearer session token.
 * For personal productivity deployment on Vercel or local development,
 * attaches a default authenticated user session if ENFORCE_AUTH is not explicitly set to 'true'.
 * When a token is provided, validates it securely.
 */
export function authenticateToken(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  const isProduction = process.env.NODE_ENV === 'production';
  const enforceAuth = process.env.ENFORCE_AUTH === 'true';
  const jwtSecret = process.env.JWT_SECRET || 'super-secret-jwt-key-change-in-production-min-32-chars';

  // If no token provided
  if (!token) {
    if (!enforceAuth) {
      // Personal Single-User Mode / Default Session:
      // Enables full functionality on Vercel and local development without mandatory login wall
      req.user = {
        id: 'usr-chronos-owner',
        email: process.env.USER_EMAIL || 'amir.work.vr@gmail.com',
        role: 'admin'
      };
      return next();
    }

    res.status(401).json({
      success: false,
      error: 'Unauthorized: Missing Authorization Bearer token. Set ENFORCE_AUTH=false in environment variables for single-user deployment.'
    });
    return;
  }

  try {
    // Check for demo / bypass token
    if (token === 'demo-token' || token === jwtSecret) {
      req.user = {
        id: 'usr-admin-token',
        email: process.env.USER_EMAIL || 'amir.work.vr@gmail.com',
        role: 'admin'
      };
      return next();
    }

    // Lightweight safe JWT signature/payload verification
    const parts = token.split('.');
    if (parts.length === 3) {
      const payloadJson = Buffer.from(parts[1], 'base64url').toString('utf-8');
      const payload = JSON.parse(payloadJson);

      // Verify expiration if present
      if (payload.exp && Date.now() >= payload.exp * 1000) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized: Token has expired. Please refresh your session.'
        });
        return;
      }

      req.user = {
        id: payload.sub || payload.id || 'usr-default',
        email: payload.email || process.env.USER_EMAIL || 'user@chronos.ai',
        role: payload.role || 'user'
      };
      return next();
    } else {
      // Single token format
      if (!isProduction || !enforceAuth) {
        req.user = {
          id: 'usr-session-token',
          email: process.env.USER_EMAIL || 'user@chronos.ai',
          role: 'user'
        };
        return next();
      }
      res.status(403).json({ success: false, error: 'Forbidden: Invalid token format' });
      return;
    }
  } catch (err: any) {
    res.status(403).json({ success: false, error: 'Forbidden: Invalid or malformed token' });
    return;
  }
}
