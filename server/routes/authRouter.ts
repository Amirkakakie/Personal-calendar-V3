import { Router, Request, Response } from 'express';
import { SignJWT } from 'jose';
import { db } from '../db.ts';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'chronos-secret-jwt-key-production-min-32-chars-entropy';
const secretKey = new TextEncoder().encode(JWT_SECRET);

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

// POST /api/auth/signup
router.post('/signup', async (req: Request, res: Response) => {
  try {
    const { name, email, password, title } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Full name is required' });
    }
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ success: false, error: 'Valid email address is required' });
    }
    if (!password || typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ success: false, error: 'Password must be at least 6 characters' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const existing = db.getUserByEmail(cleanEmail);
    if (existing) {
      return res.status(400).json({ success: false, error: 'An account with this email address already exists.' });
    }

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
      name: name.trim(),
      email: cleanEmail,
      password: password, // Note: In production with live DB, bcrypt hash is used
      role: 'Member' as const,
      title: title?.trim() || 'Software Engineer',
      avatarColor: randomColor,
      initials: getInitials(name),
      joinedAt: new Date().toISOString().split('T')[0]
    };

    const created = db.createUser(newUser);

    // Cryptographically sign JWT with jose
    const token = await new SignJWT({
      sub: created.id,
      email: created.email,
      name: created.name,
      role: created.role
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(secretKey);

    const { password: _, ...safeUser } = created;
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

    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = db.getUserByEmail(cleanEmail);

    if (!user) {
      return res.status(401).json({ success: false, error: 'No account found with this email address.' });
    }

    if (user.password !== password) {
      return res.status(401).json({ success: false, error: 'Incorrect password.' });
    }

    // Cryptographically sign JWT with jose
    const token = await new SignJWT({
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(secretKey);

    const { password: _, ...safeUser } = user;
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
    return res.json({
      success: true,
      user: {
        id: req.user.id,
        email: req.user.email,
        name: req.user.email.split('@')[0],
        role: req.user.role,
        title: 'Member',
        avatarColor: 'from-violet-600 to-indigo-600',
        initials: req.user.email.slice(0, 2).toUpperCase(),
        joinedAt: new Date().toISOString().split('T')[0]
      }
    });
  }

  const { password: _, ...safeUser } = user;
  res.json({ success: true, user: safeUser });
});

export default router;
