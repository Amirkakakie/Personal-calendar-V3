import { Request, Response, NextFunction } from 'express';
import { db, UserRecord } from '../db.ts';

declare global {
  namespace Express {
    interface Request {
      adminUser?: UserRecord;
    }
  }
}

/**
 * Strict Server-Side Super Admin Authorization Guard
 * Ensures only verified users with active status and 'superadmin' role can access admin endpoints.
 */
export function requireSuperAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.user || !req.user.id) {
    res.status(401).json({
      success: false,
      error: 'Unauthorized: Authentication required to access administrative resources.'
    });
    return;
  }

  // Always query authoritative database record (never trust stale or forged JWT payload claims)
  const freshUser = db.getUserById(req.user.id);

  if (!freshUser) {
    res.status(401).json({
      success: false,
      error: 'Unauthorized: User account no longer exists.'
    });
    return;
  }

  if (freshUser.status === 'suspended') {
    res.status(403).json({
      success: false,
      error: 'Forbidden: Your account has been suspended by an administrator.'
    });
    return;
  }

  if (freshUser.role !== 'superadmin') {
    // Log unauthorized escalation / probing attempt
    db.addAuditLog({
      adminId: freshUser.id,
      adminEmail: freshUser.email,
      action: 'admin.unauthorized_attempt',
      targetType: 'system',
      details: {
        path: req.originalUrl || req.url,
        method: req.method,
        assignedRole: freshUser.role
      },
      ip: req.ip || req.socket.remoteAddress || 'unknown',
      userAgent: req.headers['user-agent']
    });

    res.status(403).json({
      success: false,
      error: 'Forbidden: Super Admin privileges required. Regular users cannot access administrative resources.'
    });
    return;
  }

  req.adminUser = freshUser;
  next();
}
