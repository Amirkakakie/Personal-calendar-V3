import { Router, Request, Response } from 'express';
import { SignJWT } from 'jose';
import bcrypt from 'bcryptjs';
import { db } from '../db.ts';
import { getJwtSecret } from '../middleware/auth.ts';

const router = Router();

// Constant-time dummy hash for timing attack mitigation
const DUMMY_HASH = '$2a$10$wK1m3rV35fR.Zl2mR1z99eYwJzXN4oT7p6Q0sK9t2u4v6w8x0y2z4';

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function getSigningKey(): Uint8Array {
  return new TextEncoder().encode(getJwtSecret());
}

// POST /api/auth/signup
router.post('/signup', async (req: Request, res: Response) => {
  try {
    const { name, email, password, title } = req.body;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || typeof email !== 'string' || !emailRegex.test(email.trim())) {
      return res.status(400).json({ success: false, error: 'Valid email address is required' });
    }
    // Enforce robust password length (minimum 8 characters)
    if (!password || typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({ success: false, error: 'Password must be at least 8 characters' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const existing = db.getUserByEmail(cleanEmail);
    if (existing) {
      return res.status(400).json({ success: false, error: 'An account with this email address already exists.' });
    }

    // Secure password hashing with bcryptjs (cost factor 10)
    const passwordHash = await bcrypt.hash(password, 10);

    const displayName = (name && typeof name === 'string' && name.trim()) 
      ? name.trim() 
      : cleanEmail.split('@')[0];

    const avatarColors = [
      'from-violet-600 to-indigo-600',
      'from-emerald-600 to-teal-600',
      'from-sky-600 to-blue-700',
      'from-amber-600 to-orange-600',
      'from-rose-600 to-pink-600',
      'from-fuchsia-600 to-purple-600'
    ];
    const randomColor = avatarColors[Math.floor(Math.random() * avatarColors.length)];

    const id = `usr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newUser = {
      id,
      name: displayName,
      email: cleanEmail,
      passwordHash,
      role: 'Member',
      title: (title && typeof title === 'string') ? title.trim() : 'Software Engineer',
      avatarColor: randomColor,
      initials: getInitials(displayName),
      joinedAt: new Date().toISOString().split('T')[0]
    };

    const created = db.createUser(newUser);

    // Cryptographically sign JWT with jose and standard claims
    const token = await new SignJWT({
      sub: created.id,
      email: created.email,
      name: created.name,
      role: created.role
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuer('chronos-os')
      .setAudience('chronos-clients')
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(getSigningKey());

    const { passwordHash: _hash, password: _legacy, ...safeUser } = created as any;
    res.status(201).json({
      success: true,
      token,
      user: safeUser
    });
  } catch (err: any) {
    console.error('[Auth Signup Error]:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to complete registration' });
  }
});

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ success: false, error: 'Email and password are required' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = db.getUserByEmail(cleanEmail);

    if (!user) {
      // Execute dummy comparison to mitigate timing attacks on account enumeration
      await bcrypt.compare(password, DUMMY_HASH);
      return res.status(401).json({ success: false, error: 'Invalid email or password.' });
    }

    // Secure verification with bcrypt
    let isMatch = false;
    if (user.passwordHash) {
      isMatch = await bcrypt.compare(password, user.passwordHash);
    } else if (user.password) {
      // Legacy fallback and upgrade
      isMatch = user.password === password;
      if (isMatch) {
        user.passwordHash = await bcrypt.hash(password, 10);
        delete user.password;
      }
    }

    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'Invalid email or password.' });
    }

    // Cryptographically sign JWT with jose
    const token = await new SignJWT({
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuer('chronos-os')
      .setAudience('chronos-clients')
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(getSigningKey());

    const { passwordHash: _hash, password: _legacy, ...safeUser } = user as any;
    res.json({
      success: true,
      token,
      user: safeUser
    });
  } catch (err: any) {
    console.error('[Auth Login Error]:', err);
    res.status(500).json({ success: false, error: err.message || 'Login failed' });
  }
});

// GET /api/auth/me
router.get('/me', (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Not authenticated' });
  }

  const user = db.getUserById(req.user.id);
  if (!user) {
    return res.status(401).json({ success: false, error: 'User account not found' });
  }

  const { passwordHash: _hash, password: _legacy, ...safeUser } = user as any;
  const workspaces = db.getWorkspacesForUser(user.id);

  res.json({
    success: true,
    user: safeUser,
    workspaces
  });
});

export default router;
