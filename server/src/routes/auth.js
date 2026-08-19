import { Router } from 'express';
import { getStore } from '../db/index.js';
import { requireAuth } from '../middleware/auth.js';
import { AppError } from '../middleware/errors.js';
import { signToken } from '../middleware/auth.js';
import { hashPassword, verifyPassword, sanitizeField } from '../utils/helpers.js';
import { validEmail } from '../utils/validators.js';
import { env } from '../config/env.js';

const router = Router();
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

function publicUser(user) {
  return {
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone || '',
    avatar: user.avatar || '',
    address: user.address || {},
    createdAt: user.createdAt,
  };
}

router.post('/register', wrap(async (req, res) => {
  const store = await getStore();
  const { name, email, password, phone } = req.body;

  if (!name || !String(name).trim()) throw new AppError('Name is required');
  if (!validEmail(email)) throw new AppError('Please provide a valid email');
  if (!password || String(password).length < 8) {
    throw new AppError('Password must be at least 8 characters');
  }

  const exists = await store.collection('users').findOne({ email: String(email).toLowerCase().trim() });
  if (exists) throw new AppError('An account with this email already exists', 409);

  const user = await store.collection('users').insert({
    name: sanitizeField(name, 120),
    email: String(email).toLowerCase().trim(),
    passwordHash: await hashPassword(password),
    phone: sanitizeField(phone, 30),
    role: 'customer',
    isActive: true,
    address: {},
  });

  const token = signToken(user);
  const { sendMail, orderHtml } = await import('../services/email.js');
  await sendMail({ to: user.email, subject: `Welcome to ${env.storeName}`, html: orderHtml('welcome', { user }) });

  res.status(201).json({ token, user: publicUser(user) });
}));

router.post('/login', wrap(async (req, res) => {
  const store = await getStore();
  const { email, password } = req.body;
  if (!validEmail(email) || !password) throw new AppError('Email and password are required');

  const user = await store.collection('users').findOne({ email: String(email).toLowerCase().trim() });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    throw new AppError('Invalid email or password', 401);
  }
  if (!user.isActive) throw new AppError('This account has been disabled', 403);

  await store.collection('users').updateById(user._id, { lastLoginAt: new Date().toISOString() });
  const token = signToken(user, user.role === 'admin' ? env.jwtAdminExpiresIn : env.jwtExpiresIn);
  res.json({ token, user: publicUser(user) });
}));

router.get('/me', requireAuth, wrap(async (req, res) => {
  res.json({ user: publicUser(req.user) });
}));

router.put('/me', requireAuth, wrap(async (req, res) => {
  const store = await getStore();
  const patch = {};
  if (req.body.name !== undefined) patch.name = sanitizeField(req.body.name, 120);
  if (req.body.email !== undefined) {
    const email = String(req.body.email).trim().toLowerCase();
    if (!email || !email.includes('@')) throw new AppError('Invalid email');
    const existing = await store.collection('users').findOne({ email });
    if (existing && String(existing._id) !== String(req.user._id)) throw new AppError('Email already in use');
    patch.email = email;
  }
  if (req.body.phone !== undefined) patch.phone = sanitizeField(req.body.phone, 30);
  if (req.body.avatar !== undefined) patch.avatar = sanitizeField(req.body.avatar, 500);
  if (req.body.address !== undefined && typeof req.body.address === 'object') {
    patch.address = {
      line1: sanitizeField(req.body.address.line1, 200),
      line2: sanitizeField(req.body.address.line2, 200),
      city: sanitizeField(req.body.address.city, 100),
      state: sanitizeField(req.body.address.state, 100),
      zip: sanitizeField(req.body.address.zip, 20),
      country: sanitizeField(req.body.address.country, 100),
    };
  }
  const updated = await store.collection('users').updateById(req.user._id, patch);
  res.json({ user: publicUser(updated) });
}));

router.post('/change-password', requireAuth, wrap(async (req, res) => {
  const store = await getStore();
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) throw new AppError('Current and new password are required');
  if (String(newPassword).length < 8) throw new AppError('New password must be at least 8 characters');

  const user = await store.collection('users').findById(req.user._id);
  if (!(await verifyPassword(currentPassword, user.passwordHash))) {
    throw new AppError('Current password is incorrect', 401);
  }
  await store.collection('users').updateById(user._id, { passwordHash: await hashPassword(newPassword) });
  res.json({ message: 'Password updated successfully' });
}));

export default router;
