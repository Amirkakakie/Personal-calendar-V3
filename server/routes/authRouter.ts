import { Router, Request, Response } from 'express';
import { SignJWT } from 'jose';
import bcrypt from 'bcryptjs';
import { createHash } from 'node:crypto';
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

async function issueSessionToken(user: { id: string; email: string; name?: string; role?: string }): Promise<string> {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
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
    .setExpirationTime(Math.floor(expiresAt.getTime() / 1000))
    .sign(getSigningKey());

  const tokenHash = createHash('sha256').update(token).digest('hex');
  await db.createAuthSession(user.id, tokenHash, expiresAt);
  return token;
}

// POST /api/auth/signup
router.post('/signup', async (req: Request, res: Response) => {
  try {
    const { name, email, password, title } = req.body;
    if (name !== undefined && (typeof name !== 'string' || name.trim().length > 80)) return res.status(400).json({ success: false, error: 'Name must be a string of at most 80 characters.' });

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || typeof email !== 'string' || email.trim().length > 254 || !emailRegex.test(email.trim())) {
      return res.status(400).json({ success: false, error: 'Valid email address is required' });
    }
    // Enforce a 12-character minimum and bcrypt's 72-byte input limit.
    if (!password || typeof password !== 'string' || password.length < 12 || Buffer.byteLength(password, 'utf8') > 72) {
      return res.status(400).json({ success: false, error: 'Password must be at least 12 characters and no more than 72 UTF-8 bytes.' });
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

    // Persist the new account before creating its FK-backed session row.
    await db.flush();

    // Cryptographically sign JWT with jose and standard claims
    const token = await issueSessionToken(created);

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

    if (!email || !password || typeof email !== 'string' || email.trim().length > 254 || typeof password !== 'string' || Buffer.byteLength(password, 'utf8') > 72) {
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
    const token = await issueSessionToken(user);

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

// GET /api/auth/google/config
router.get('/google/config', (_req: Request, res: Response) => {
  res.json({
    success: true,
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    configured: Boolean(process.env.GOOGLE_CLIENT_ID)
  });
});

// POST /api/auth/google - Authenticate, auto-create, or link Google user account
router.post('/google', async (req: Request, res: Response) => {
  try {
    const { credential, code } = req.body;

    if (credential !== undefined && (typeof credential !== 'string' || credential.length > 8192)) {
      return res.status(400).json({ success: false, error: 'Google credential is invalid or too large.' });
    }
    if (code !== undefined && (typeof code !== 'string' || code.length > 4096)) {
      return res.status(400).json({ success: false, error: 'Google authorization code is invalid or too large.' });
    }

    // Authorization-code exchange is disabled until the browser flow supplies
    // and the server verifies one-time OAuth state and PKCE. The active client
    // uses a Google ID token credential, which is verified against Google's
    // tokeninfo endpoint and the configured client audience.
    if (code) {
      return res.status(400).json({ success: false, error: 'Google authorization-code flow is disabled until state and PKCE validation are enabled. Use the verified ID-token credential flow.' });
    }

    if (!credential) {
      return res.status(400).json({ success: false, error: 'Google ID-token credential is required.' });
    }

    let googlePayload: {
      sub: string;
      email: string;
      name?: string;
      picture?: string;
      email_verified?: boolean | string;
      aud?: string; iss?: string; exp?: string;
    } | null = null;
    let isMockCredential = false;

    if (credential) {
      if (typeof credential !== 'string' || !credential.trim()) {
        return res.status(400).json({ success: false, error: 'Invalid Google credential token format' });
      }

      // Check for mock/test credentials in non-production test runs
      if (process.env.NODE_ENV === 'test' && process.env.CHRONOS_ENABLE_MOCK_GOOGLE_AUTH === 'true' && credential.startsWith('test-mock-google-token')) {
        isMockCredential = true;
        const parts = credential.split(':');
        const testEmail = parts[1] || 'google.test@chronos.ai';
        googlePayload = {
          sub: 'google-sub-' + Buffer.from(testEmail).toString('hex').slice(0, 12),
          email: testEmail,
          name: 'Google Test User',
          picture: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100',
          email_verified: true, aud: process.env.GOOGLE_CLIENT_ID || 'test-client', iss: 'https://accounts.google.com', exp: String(Math.floor(Date.now() / 1000) + 300)
        };
      } else {
        // Official Google Token Verification via tokeninfo endpoint
        try {
          const verifyUrl = `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential.trim())}`;
          const tokenRes = await fetch(verifyUrl, {
            headers: { 'User-Agent': 'chronos-os-auth' }
          });

          if (tokenRes.ok) {
            const data: any = await tokenRes.json();
            // Require the configured OAuth client audience.
            if (!process.env.GOOGLE_CLIENT_ID || data.aud !== process.env.GOOGLE_CLIENT_ID) {
              return res.status(401).json({ success: false, error: 'Google token audience mismatch' });
            }
            googlePayload = {
              sub: data.sub,
              email: data.email,
              name: data.name,
              picture: data.picture,
              email_verified: data.email_verified, aud: data.aud, iss: data.iss, exp: data.exp
            };
          } else {
            const errBody = await tokenRes.text().catch(() => '');
            console.warn('[Google Auth] Tokeninfo verification failed:', errBody);
          }
        } catch (fetchErr) {
          console.warn('[Google Auth] Error contacting Google tokeninfo:', fetchErr);
        }
      }
    } else if (code) {
      // Exchange authorization code for tokens
      if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !process.env.GOOGLE_REDIRECT_URI) {
        return res.status(500).json({ success: false, error: 'Google OAuth client secret not configured on server' });
      }

      try {
        const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            code,
            client_id: process.env.GOOGLE_CLIENT_ID,
            client_secret: process.env.GOOGLE_CLIENT_SECRET,
            redirect_uri: process.env.GOOGLE_REDIRECT_URI,
            grant_type: 'authorization_code'
          })
        });

        if (tokenRes.ok) {
          const tokenData: any = await tokenRes.json();
          if (tokenData.id_token) {
            const idRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(tokenData.id_token)}`);
            if (idRes.ok) {
              const data: any = await idRes.json();
              googlePayload = {
                sub: data.sub,
                email: data.email,
                name: data.name,
                picture: data.picture,
                email_verified: data.email_verified, aud: data.aud, iss: data.iss, exp: data.exp
              };
            }
          }
        }
      } catch (codeErr) {
        console.warn('[Google Auth] Code exchange failed:', codeErr);
      }
    }

    if (!googlePayload || typeof googlePayload.email !== 'string' || googlePayload.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(googlePayload.email) || typeof googlePayload.sub !== 'string' || !googlePayload.sub || googlePayload.sub.length > 255) {
      return res.status(401).json({ success: false, error: 'Failed to verify Google identity credential.' });
    }

    if (!isMockCredential && (!process.env.GOOGLE_CLIENT_ID || googlePayload.aud !== process.env.GOOGLE_CLIENT_ID || !['accounts.google.com', 'https://accounts.google.com'].includes(googlePayload.iss || '') || !googlePayload.exp || Number(googlePayload.exp) * 1000 <= Date.now() || !googlePayload.sub)) {
      return res.status(401).json({ success: false, error: 'Google identity token claims are invalid.' });
    }

    // Require verified email address from Google
    const isVerified = googlePayload.email_verified === true || googlePayload.email_verified === 'true';
    if (!isVerified) {
      return res.status(401).json({ success: false, error: 'Unverified Google email accounts are not permitted.' });
    }

    const cleanEmail = googlePayload.email.trim().toLowerCase();
    let user = db.getUserByEmail(cleanEmail);

    if (user) {
      // Account linking: link Google ID to existing account
      db.linkGoogleAccount(user.id, googlePayload.sub, googlePayload.picture);
      user = db.getUserById(user.id)!;
    } else {
      // Auto-provision new user account
      const displayName = (googlePayload.name && googlePayload.name.trim()) 
        ? googlePayload.name.trim() 
        : cleanEmail.split('@')[0];

      const avatarColors = [
        'from-violet-600 to-indigo-600',
        'from-emerald-600 to-teal-600',
        'from-sky-600 to-blue-700',
        'from-amber-600 to-orange-600'
      ];
      const randomColor = avatarColors[Math.floor(Math.random() * avatarColors.length)];

      const id = `usr-g-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const newUser = {
        id,
        name: displayName,
        email: cleanEmail,
        passwordHash: '',
        role: 'Member',
        title: 'Productivity Engineer',
        avatarColor: randomColor,
        avatarUrl: googlePayload.picture,
        googleId: googlePayload.sub,
        initials: getInitials(displayName),
        joinedAt: new Date().toISOString().split('T')[0]
      };

      user = db.createUser(newUser);
      // Persist the new account before creating its FK-backed session row.
      await db.flush();
    }

    // Sign cryptographic Chronos JWT session
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
    console.error('[Google Auth Error]:', err);
    res.status(500).json({ success: false, error: err.message || 'Google authentication failed' });
  }
});

// POST /api/auth/logout - Revoke the current server-side session.
router.post('/logout', async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  if (!req.user || !token) {
    return res.status(401).json({ success: false, error: 'Not authenticated.' });
  }
  try {
    const tokenHash = createHash('sha256').update(token).digest('hex');
    await db.revokeAuthSession(tokenHash);
    res.json({ success: true, message: 'Session revoked.' });
  } catch (error) {
    console.error('[Auth Logout Error]:', error);
    res.status(503).json({ success: false, error: 'Could not revoke the session. Please retry.' });
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
