import { Router } from 'express';
import crypto from 'node:crypto';
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

router.post('/forgot-password', wrap(async (req, res) => {
  const store = await getStore();
  const { email } = req.body;
  if (!validEmail(email)) throw new AppError('Please provide a valid email');

  const user = await store.collection('users').findOne({ email: String(email).toLowerCase().trim() });

  if (!user) {
    return res.json({ message: 'If an account exists with this email, you will receive a password reset link.' });
  }

  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

  const existingTokens = await store.collection('passwordResetTokens').find({ userId: user._id });
  for (const t of existingTokens) {
    await store.collection('passwordResetTokens').deleteById(t._id);
  }

  await store.collection('passwordResetTokens').insert({ userId: user._id, token, expiresAt, used: false });

  const resetUrl = `${env.publicBaseUrl}/reset-password?token=${token}`;

  const { sendMail } = await import('../services/email.js');
  await sendMail({
    to: user.email,
    subject: `Reset your ${env.storeName} password`,
    html: `<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1d1d1f;">
      <h2 style="font-size:18px;margin:0 0 8px;">Password Reset</h2>
      <p style="font-size:14px;color:#86868b;margin:0 0 16px;">Hi ${user.name}, we received a request to reset your password.</p>
      <p style="font-size:14px;color:#86868b;margin:0 0 24px;">Click the button below to set a new password. This link expires in 1 hour.</p>
      <a href="${resetUrl}" style="display:inline-block;background:#0071e3;color:#fff;text-decoration:none;padding:12px 24px;border-radius:980px;font-size:14px;font-weight:500;">Reset password</a>
      <p style="font-size:12px;color:#86868b;margin-top:24px;">If you didn't request this, you can safely ignore this email.</p>
    </div>`,
  });

  res.json({ message: 'If an account exists with this email, you will receive a password reset link.' });
}));

router.post('/reset-password', wrap(async (req, res) => {
  const store = await getStore();
  const { token, newPassword } = req.body;
  if (!token || !newPassword) throw new AppError('Token and new password are required');
  if (String(newPassword).length < 8) throw new AppError('Password must be at least 8 characters');

  const resetToken = await store.collection('passwordResetTokens').findOne({ token, used: false });
  if (!resetToken) throw new AppError('Invalid or expired reset token', 400);
  if (new Date(resetToken.expiresAt) < new Date()) throw new AppError('Reset token has expired', 400);

  await store.collection('users').updateById(resetToken.userId, {
    passwordHash: await hashPassword(newPassword),
  });
  await store.collection('passwordResetTokens').updateById(resetToken._id, { used: true });

  res.json({ message: 'Password has been reset successfully. You can now sign in.' });
}));

router.post('/verify-email', wrap(async (req, res) => {
  const store = await getStore();
  const { token } = req.body;
  if (!token) throw new AppError('Token is required');

  const verification = await store.collection('emailVerifications').findOne({ token, verified: false });
  if (!verification) throw new AppError('Invalid or already verified token', 400);
  if (new Date(verification.expiresAt) < new Date()) throw new AppError('Verification link has expired', 400);

  await store.collection('users').updateById(verification.userId, { emailVerified: true });
  await store.collection('emailVerifications').updateById(verification._id, { verified: true });

  res.json({ message: 'Email verified successfully' });
}));

router.post('/resend-verification', requireAuth, wrap(async (req, res) => {
  const store = await getStore();
  const user = req.user;
  if (user.emailVerified) throw new AppError('Email already verified');

  const existingTokens = await store.collection('emailVerifications').find({ userId: user._id });
  for (const t of existingTokens) {
    await store.collection('emailVerifications').deleteById(t._id);
  }

  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  await store.collection('emailVerifications').insert({ userId: user._id, token, expiresAt, verified: false });

  const verifyUrl = `${env.publicBaseUrl}/verify-email?token=${token}`;
  const { sendMail } = await import('../services/email.js');
  await sendMail({
    to: user.email,
    subject: `Verify your ${env.storeName} email`,
    html: `<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1d1d1f;">
      <h2 style="font-size:18px;margin:0 0 8px;">Verify your email</h2>
      <p style="font-size:14px;color:#86868b;margin:0 0 16px;">Hi ${user.name}, click below to verify your email address.</p>
      <a href="${verifyUrl}" style="display:inline-block;background:#0071e3;color:#fff;text-decoration:none;padding:12px 24px;border-radius:980px;font-size:14px;font-weight:500;">Verify email</a>
      <p style="font-size:12px;color:#86868b;margin-top:24px;">This link expires in 24 hours.</p>
    </div>`,
  });

  res.json({ message: 'Verification email sent' });
}));

export default router;
