import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { getStore } from '../db/index.js';

export function signToken(user, expiresIn = env.jwtExpiresIn) {
  return jwt.sign(
    { id: user._id, role: user.role, email: user.email },
    env.jwtSecret,
    { expiresIn },
  );
}

export async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ message: 'Authentication required' });

    const payload = jwt.verify(token, env.jwtSecret);
    const store = await getStore();
    const user = await store.collection('users').findById(payload.id);
    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'Account not found or disabled' });
    }
    req.user = user;
    req.userId = user._id;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

export async function requireAdmin(req, res, next) {
  await requireAuth(req, res, async () => {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }
    next();
  });
}

export async function optionalAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return next();
  try {
    const payload = jwt.verify(token, env.jwtSecret);
    const store = await getStore();
    const user = await store.collection('users').findById(payload.id);
    if (user && user.isActive) req.user = user;
  } catch {
    /* ignore invalid optional token */
  }
  next();
}
